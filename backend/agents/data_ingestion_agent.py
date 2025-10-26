from uagents import Agent, Context, Model, Protocol
from uagents_core.contrib.protocols.chat import (
    ChatMessage,
    ChatAcknowledgement,
    TextContent,
    chat_protocol_spec,
)
from groq import Groq
from datetime import datetime
from uuid import uuid4
import pandas as pd
import io
import os
from dotenv import load_dotenv
from typing import Dict, Any, Optional, List
import base64

# Load environment variables from parent directory
load_dotenv()

# Initialize Groq client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Define message models for data ingestion
class FileUploadRequest(Model):
    """Request to upload and parse a file"""
    file_content: str  # Base64 encoded file content
    filename: str
    file_type: str  # 'csv' or 'excel'

class FileUploadResponse(Model):
    """Response after file parsing"""
    success: bool
    filename: str
    rows: int
    columns: int
    column_names: List[str]
    dtypes: Dict[str, str]
    preview: List[Dict[str, Any]]
    data: List[Dict[str, Any]]
    sheets: Optional[List[str]] = None
    current_sheet: Optional[str] = None
    has_multiple_sheets: bool = False
    error: Optional[str] = None

# Instantiate agent
data_ingestion_agent = Agent(
    name="data_ingestion_agent",
    seed="data_ingestion_seed_phrase",
    port=8001,
    mailbox=True
)

# Initialize the chat protocol
chat_proto = Protocol(spec=chat_protocol_spec)

# Store parsed data temporarily
ingested_data: Dict[str, Any] = {}

def parse_csv_file(file_content: bytes, filename: str) -> Dict[str, Any]:
    """Parse CSV file and return structured data"""
    try:
        # Read CSV with dtype=str to preserve original text values
        df = pd.read_csv(
            io.BytesIO(file_content),
            dtype=str,
            keep_default_na=False
        )
        # Replace empty strings with None for consistency
        df = df.replace('', None)
        
        return {
            "success": True,
            "filename": filename,
            "rows": len(df),
            "columns": len(df.columns),
            "column_names": df.columns.tolist(),
            "dtypes": df.dtypes.astype(str).to_dict(),
            "preview": df.head(5).to_dict(orient="records"),
            "data": df.to_dict(orient="records"),
            "sheets": ["Sheet1"],
            "current_sheet": "Sheet1",
            "has_multiple_sheets": False,
            "dataframe": df
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"CSV parsing error: {str(e)}"
        }

def parse_excel_file(file_content: bytes, filename: str) -> Dict[str, Any]:
    """Parse Excel file and return structured data"""
    try:
        # Read Excel file
        excel_file = pd.ExcelFile(io.BytesIO(file_content))
        sheet_names = excel_file.sheet_names
        
        # Read all sheets
        all_sheets = {}
        for sheet_name in sheet_names:
            sheet_df = pd.read_excel(
                excel_file,
                sheet_name=sheet_name,
                dtype=str,
                keep_default_na=False
            )
            sheet_df = sheet_df.replace('', None)
            all_sheets[sheet_name] = sheet_df
        
        # Use first sheet as default
        current_sheet = sheet_names[0]
        current_df = all_sheets[current_sheet]
        
        # Prepare sheets info
        sheets_info = []
        for sheet_name, sheet_df in all_sheets.items():
            sheets_info.append({
                "name": sheet_name,
                "rows": len(sheet_df),
                "columns": len(sheet_df.columns),
                "column_names": sheet_df.columns.tolist()
            })
        
        return {
            "success": True,
            "filename": filename,
            "rows": len(current_df),
            "columns": len(current_df.columns),
            "column_names": current_df.columns.tolist(),
            "dtypes": current_df.dtypes.astype(str).to_dict(),
            "preview": current_df.head(5).to_dict(orient="records"),
            "data": current_df.to_dict(orient="records"),
            "sheets": sheet_names,
            "sheets_info": sheets_info,
            "current_sheet": current_sheet,
            "has_multiple_sheets": len(sheet_names) > 1,
            "all_sheets": all_sheets,
            "dataframe": current_df
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Excel parsing error: {str(e)}"
        }

def analyze_data_with_groq(data_info: Dict[str, Any]) -> str:
    """Use Groq to analyze and provide insights about the ingested data"""
    try:
        prompt = f"""
You are a data analysis expert. Analyze this dataset and provide key insights:

Filename: {data_info.get('filename')}
Rows: {data_info.get('rows')}
Columns: {data_info.get('columns')}
Column Names: {', '.join(data_info.get('column_names', []))}
Data Types: {data_info.get('dtypes')}

Sample Data (first 5 rows):
{data_info.get('preview')}

Provide a brief summary of:
1. What type of data this appears to be
2. Key columns and their purposes
3. Any immediate observations or potential data quality issues
4. Suggested next steps for analysis

Keep it concise and actionable.
"""
        
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=500
        )
        
        return chat_completion.choices[0].message.content
    except Exception as e:
        return f"Analysis unavailable: {str(e)}"

# Startup Handler
@data_ingestion_agent.on_event("startup")
async def startup_handler(ctx: Context):
    ctx.logger.info(f"Data Ingestion Agent started successfully!")
    ctx.logger.info(f"Agent name: {data_ingestion_agent.name}")
    ctx.logger.info(f"Agent address: {data_ingestion_agent.address}")
    ctx.logger.info("Ready to ingest CSV and Excel files")

# Message Handler - Handle file upload requests via chat protocol
@chat_proto.on_message(ChatMessage)
async def handle_message(ctx: Context, sender: str, msg: ChatMessage):
    """Handle incoming messages for file ingestion"""
    global ingested_data
    
    for item in msg.content:
        if isinstance(item, TextContent):
            ctx.logger.info(f"Received message from {sender}: {item.text[:100]}...")
            
            # Check if this is a file upload request
            try:
                # Parse the message content as file upload request
                import json
                request_data = json.loads(item.text)
                
                if request_data.get("type") == "file_upload":
                    ctx.logger.info(f"Processing file upload: {request_data.get('filename')}")
                    
                    # Decode base64 file content
                    file_content = base64.b64decode(request_data.get("file_content"))
                    filename = request_data.get("filename")
                    file_type = request_data.get("file_type", "csv")
                    
                    # Parse file based on type
                    if file_type == "csv" or filename.endswith('.csv'):
                        result = parse_csv_file(file_content, filename)
                    else:
                        result = parse_excel_file(file_content, filename)
                    
                    # Store ingested data
                    if result.get("success"):
                        ingested_data[filename] = result
                        
                        # Get AI insights using Groq
                        ctx.logger.info("Analyzing data with Groq...")
                        ai_insights = analyze_data_with_groq(result)
                        result["ai_insights"] = ai_insights
                        
                        ctx.logger.info(f"Successfully parsed {filename}: {result.get('rows')} rows, {result.get('columns')} columns")
                    
                    # Send acknowledgment
                    ack = ChatAcknowledgement(
                        timestamp=datetime.utcnow(),
                        acknowledged_msg_id=msg.msg_id
                    )
                    await ctx.send(sender, ack)
                    
                    # Send response with parsing results
                    response_content = json.dumps(result)
                    response = ChatMessage(
                        timestamp=datetime.utcnow(),
                        msg_id=uuid4(),
                        content=[TextContent(type="text", text=response_content)]
                    )
                    await ctx.send(sender, response)
                    
                else:
                    # Handle general queries about ingested data
                    ctx.logger.info("Handling general data ingestion query")
                    
                    # Send acknowledgment
                    ack = ChatAcknowledgement(
                        timestamp=datetime.utcnow(),
                        acknowledged_msg_id=msg.msg_id
                    )
                    await ctx.send(sender, ack)
                    
                    # Provide information about ingested data
                    if ingested_data:
                        info = f"Currently managing {len(ingested_data)} datasets: {', '.join(ingested_data.keys())}"
                    else:
                        info = "No datasets currently ingested. Send a file_upload request to begin."
                    
                    response = ChatMessage(
                        timestamp=datetime.utcnow(),
                        msg_id=uuid4(),
                        content=[TextContent(type="text", text=info)]
                    )
                    await ctx.send(sender, response)
                    
            except json.JSONDecodeError:
                # Not a JSON message, treat as general query
                ctx.logger.info("Received non-JSON text message")
                
                # Send acknowledgment
                ack = ChatAcknowledgement(
                    timestamp=datetime.utcnow(),
                    acknowledged_msg_id=msg.msg_id
                )
                await ctx.send(sender, ack)
                
                # Send info response
                response = ChatMessage(
                    timestamp=datetime.utcnow(),
                    msg_id=uuid4(),
                    content=[TextContent(
                        type="text",
                        text="I'm the Data Ingestion Agent. Send me file upload requests in JSON format with type='file_upload'."
                    )]
                )
                await ctx.send(sender, response)

# Acknowledgement Handler
@chat_proto.on_message(ChatAcknowledgement)
async def handle_acknowledgement(ctx: Context, sender: str, msg: ChatAcknowledgement):
    ctx.logger.info(f"Received acknowledgement from {sender} for message: {msg.acknowledged_msg_id}")

# Direct message handler for FileUploadRequest (non-chat protocol)
@data_ingestion_agent.on_message(FileUploadRequest)
async def handle_file_upload(ctx: Context, sender: str, msg: FileUploadRequest):
    """Direct handler for file upload requests"""
    global ingested_data
    
    ctx.logger.info(f"Direct file upload request from {sender}: {msg.filename}")
    
    try:
        # Decode base64 file content
        file_content = base64.b64decode(msg.file_content)
        
        # Parse file based on type
        if msg.file_type == "csv" or msg.filename.endswith('.csv'):
            result = parse_csv_file(file_content, msg.filename)
        else:
            result = parse_excel_file(file_content, msg.filename)
        
        # Store ingested data
        if result.get("success"):
            ingested_data[msg.filename] = result
            
            # Get AI insights using Groq
            ctx.logger.info("Analyzing data with Groq...")
            ai_insights = analyze_data_with_groq(result)
            result["ai_insights"] = ai_insights
            
            ctx.logger.info(f"Successfully parsed {msg.filename}: {result.get('rows')} rows, {result.get('columns')} columns")
        
        # Send response
        response = FileUploadResponse(
            success=result.get("success", False),
            filename=result.get("filename", msg.filename),
            rows=result.get("rows", 0),
            columns=result.get("columns", 0),
            column_names=result.get("column_names", []),
            dtypes=result.get("dtypes", {}),
            preview=result.get("preview", []),
            data=result.get("data", []),
            sheets=result.get("sheets"),
            current_sheet=result.get("current_sheet"),
            has_multiple_sheets=result.get("has_multiple_sheets", False),
            error=result.get("error")
        )
        
        await ctx.send(sender, response)
        
    except Exception as e:
        ctx.logger.error(f"Error processing file upload: {str(e)}")
        error_response = FileUploadResponse(
            success=False,
            filename=msg.filename,
            rows=0,
            columns=0,
            column_names=[],
            dtypes={},
            preview=[],
            data=[],
            error=str(e)
        )
        await ctx.send(sender, error_response)

# Include the protocol in the agent
data_ingestion_agent.include(chat_proto, publish_manifest=True)

if __name__ == "__main__":
    data_ingestion_agent.run()
