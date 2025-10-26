from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import io
import traceback
import sys
from contextlib import redirect_stdout
from typing import Dict, Any, List, Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from aiAgent import ai_agent

# Request models
class PandasCodeRequest(BaseModel):
    code: str

class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    message: str
    chat_history: Optional[List[ChatMessage]] = []

class SwitchSheetRequest(BaseModel):
    sheet_name: str

class ChartData(BaseModel):
    type: str  # 'line', 'bar', 'pie', 'scatter'
    labels: List[Any]
    datasets: List[Dict[str, Any]]
    title: str

class ChatResponse(BaseModel):
    response: str
    pandas_code: Optional[str]
    has_code: bool
    data_updated: bool
    updated_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    print_output: Optional[str] = None
    narrative_output: Optional[str] = None
    chart_data: Optional[ChartData] = None

app = FastAPI(title="Jade AI - Data Cleaning API")

# Global variable to store the current dataset
current_dataframe: pd.DataFrame = None

# Store all sheets from Excel files
all_sheets: Dict[str, pd.DataFrame] = {}
current_sheet_name: str = None

# Dataframe snapshot for rollback functionality
dataframe_snapshots: List[pd.DataFrame] = []
MAX_SNAPSHOTS = 5

def create_dataframe_snapshot():
    """Create a snapshot of the current dataframe for rollback functionality"""
    global current_dataframe, dataframe_snapshots
    
    if current_dataframe is not None:
        # Keep only the last MAX_SNAPSHOTS snapshots
        if len(dataframe_snapshots) >= MAX_SNAPSHOTS:
            dataframe_snapshots.pop(0)
        
        # Create a deep copy of the current dataframe
        dataframe_snapshots.append(current_dataframe.copy())
        return True
    return False

def restore_dataframe_snapshot():
    """Restore the last dataframe snapshot"""
    global current_dataframe, dataframe_snapshots
    
    if dataframe_snapshots:
        current_dataframe = dataframe_snapshots.pop()
        return True
    return False

def generate_color_palette(count: int) -> List[str]:
    """Generate a vibrant color palette for charts"""
    # Beautiful, distinct colors for data visualization
    base_colors = [
        "rgba(255, 99, 132, 0.8)",   # Red-Pink
        "rgba(54, 162, 235, 0.8)",   # Blue
        "rgba(255, 206, 86, 0.8)",   # Yellow
        "rgba(75, 192, 192, 0.8)",   # Teal
        "rgba(153, 102, 255, 0.8)",  # Purple
        "rgba(255, 159, 64, 0.8)",   # Orange
        "rgba(46, 204, 113, 0.8)",   # Green
        "rgba(231, 76, 60, 0.8)",    # Red
        "rgba(52, 152, 219, 0.8)",   # Light Blue
        "rgba(155, 89, 182, 0.8)",   # Violet
        "rgba(26, 188, 156, 0.8)",   # Turquoise
        "rgba(241, 196, 15, 0.8)",   # Gold
        "rgba(230, 126, 34, 0.8)",   # Carrot
        "rgba(236, 240, 241, 0.8)",  # Silver
        "rgba(149, 165, 166, 0.8)",  # Gray
    ]
    
    # If we need more colors than base, cycle through them
    colors = []
    for i in range(count):
        colors.append(base_colors[i % len(base_colors)])
    
    return colors

def get_dataframe_info() -> Dict[str, Any]:
    """Get current dataframe information for AI context"""
    global current_dataframe
    
    if current_dataframe is None:
        return {}
    
    return {
        "filename": "current_dataset",
        "rows": len(current_dataframe),
        "columns": len(current_dataframe.columns),
        "column_names": current_dataframe.columns.tolist(),
        "dtypes": current_dataframe.dtypes.astype(str).to_dict(),
        "preview": current_dataframe.head(5).to_dict(orient="records")
    }

# Allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Welcome to Jade AI"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    # Check file extension
    if not file.filename.endswith(('.csv', '.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported")
    
    try:
        # Read the file content
        content = await file.read()
        
        global current_dataframe, all_sheets, current_sheet_name
        
        # Load into pandas based on file type
        if file.filename.endswith('.csv'):
            # Read with dtype=str to preserve original text values
            # keep_default_na=False prevents automatic conversion of text to NaN
            df = pd.read_csv(
                io.BytesIO(content),
                dtype=str,
                keep_default_na=False
            )
            # Replace empty strings with None for consistency
            df = df.replace('', None)
            
            # For CSV, store as single sheet
            all_sheets = {"Sheet1": df}
            current_sheet_name = "Sheet1"
            current_dataframe = df
            
            # Perform automatic data quality assessment
            quality_report = ai_agent.assess_data_quality(df, file.filename)
            
            # Generate formatted initial AI message
            initial_ai_message = ai_agent.generate_initial_assessment_message(df, quality_report, file.filename)
            
            # Return basic info about the dataset with quality report
            return {
                "filename": file.filename,
                "rows": len(df),
                "columns": len(df.columns),
                "column_names": df.columns.tolist(),
                "dtypes": df.dtypes.astype(str).to_dict(),
                "preview": df.head(5).to_dict(orient="records"),
                "data": df.to_dict(orient="records"),
                "sheets": list(all_sheets.keys()),
                "current_sheet": current_sheet_name,
                "has_multiple_sheets": False,
                "quality_report": quality_report,
                "initial_message": initial_ai_message
            }
        else:
            # For Excel files, read all sheets
            excel_file = pd.ExcelFile(io.BytesIO(content))
            sheet_names = excel_file.sheet_names
            
            # Read all sheets into dictionary
            all_sheets = {}
            for sheet_name in sheet_names:
                # Read with dtype=str to preserve original text values like "7[2]" and "ERROR"
                # keep_default_na=False prevents automatic conversion of text to NaN
                sheet_df = pd.read_excel(
                    excel_file, 
                    sheet_name=sheet_name,
                    dtype=str,
                    keep_default_na=False
                )
                # Replace empty strings with None for consistency
                sheet_df = sheet_df.replace('', None)
                all_sheets[sheet_name] = sheet_df
            
            # Set the first sheet as current
            current_sheet_name = sheet_names[0]
            current_dataframe = all_sheets[current_sheet_name]
            
            # Prepare sheet information
            sheets_info = []
            for sheet_name, sheet_df in all_sheets.items():
                sheets_info.append({
                    "name": sheet_name,
                    "rows": len(sheet_df),
                    "columns": len(sheet_df.columns),
                    "column_names": sheet_df.columns.tolist()
                })
            
            # Perform automatic data quality assessment on current sheet
            quality_report = ai_agent.assess_data_quality(current_dataframe, f"{file.filename} - {current_sheet_name}")
            
            # Generate formatted initial AI message
            initial_ai_message = ai_agent.generate_initial_assessment_message(current_dataframe, quality_report, f"{file.filename} - {current_sheet_name}")
            
            # Return info about all sheets with quality report
            return {
                "filename": file.filename,
                "rows": len(current_dataframe),
                "columns": len(current_dataframe.columns),
                "column_names": current_dataframe.columns.tolist(),
                "dtypes": current_dataframe.dtypes.astype(str).to_dict(),
                "preview": current_dataframe.head(5).to_dict(orient="records"),
                "data": current_dataframe.to_dict(orient="records"),
                "sheets": sheet_names,
                "sheets_info": sheets_info,
                "current_sheet": current_sheet_name,
                "has_multiple_sheets": len(sheet_names) > 1,
                "quality_report": quality_report,
                "initial_message": initial_ai_message
            }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")

@app.post("/chat", response_model=ChatResponse)
async def chat_with_ai(request: ChatRequest):
    """
    Main chat endpoint that handles AI conversation and pandas code execution
    """
    global current_dataframe
    
    try:
        # Get current dataframe information for AI context
        df_info = get_dataframe_info()
        
        # Convert chat history to the format expected by AI agent
        chat_history = [{"role": msg.role, "content": msg.content} for msg in request.chat_history]
        
        # Generate AI response with dataframe context
        ai_response = ai_agent.generate_response(
            user_message=request.message,
            df_info=df_info,
            chat_history=chat_history
        )
        
        # Initialize response
        response_data = {
            "response": ai_response["response"],
            "pandas_code": ai_response["pandas_code"],
            "has_code": ai_response["has_code"],
            "data_updated": False,
            "updated_data": None,
            "error": None,
            "print_output": None,
            "narrative_output": None,
            "chart_data": None
        }
        
        # If AI provided pandas code, execute it
        if ai_response["has_code"] and ai_response["pandas_code"]:
            # Create snapshot before executing code
            snapshot_created = create_dataframe_snapshot()
            
            try:
                # Capture print output during code execution
                captured_output = io.StringIO()
                
                # Create execution context with chart data tracking
                exec_context = {
                    'pd': pd, 
                    'df': current_dataframe,
                    'chart_data_result': None
                }
                
                with redirect_stdout(captured_output):
                    # Execute the pandas code
                    exec(ai_response["pandas_code"], exec_context)
                
                # Get the captured print output
                print_output = captured_output.getvalue().strip()
                
                # Check if chart data was created
                if exec_context.get('chart_data_result'):
                    chart_result = exec_context['chart_data_result']
                    chart_type = chart_result.get('type', 'bar')
                    data_points = chart_result.get('data', [])
                    
                    # Generate colors based on chart type
                    if chart_type in ['bar', 'pie', 'doughnut', 'polarArea', 'radar']:
                        # For categorical charts, use different colors for each segment
                        colors = generate_color_palette(len(data_points))
                        background_colors = colors
                        border_colors = [color.replace('0.8', '1') for color in colors]  # Solid borders
                    elif chart_type in ['area']:
                        # For area charts, use a single color with fill
                        background_colors = "rgba(54, 162, 235, 0.3)"
                        border_colors = "rgba(54, 162, 235, 1)"
                    elif chart_type in ['scatter', 'bubble']:
                        # For scatter/bubble charts, use a single color for all points
                        background_colors = "rgba(54, 162, 235, 0.6)"
                        border_colors = "rgba(54, 162, 235, 1)"
                    else:  # line charts
                        # For line charts, use a single vibrant color
                        background_colors = "rgba(54, 162, 235, 0.2)"
                        border_colors = "rgba(54, 162, 235, 1)"
                    
                    # Format chart data for Chart.js
                    dataset_config = {
                        "label": chart_result.get('label', 'Data'),
                        "data": data_points,
                        "borderColor": border_colors,
                        "backgroundColor": background_colors,
                        "borderWidth": 2
                    }
                    
                    # Add chart-specific properties
                    if chart_type == 'area':
                        dataset_config.update({
                            "fill": True,
                            "tension": 0.4
                        })
                    elif chart_type == 'line':
                        dataset_config.update({
                            "fill": False,
                            "tension": 0.4
                        })
                    elif chart_type in ['scatter', 'bubble']:
                        dataset_config.update({
                            "pointRadius": 6,
                            "pointHoverRadius": 8
                        })
                    elif chart_type == 'radar':
                        dataset_config.update({
                            "pointRadius": 4,
                            "pointHoverRadius": 6,
                            "tension": 0.2
                        })
                    
                    chart_data = {
                        "type": chart_type,
                        "labels": chart_result.get('labels', []),
                        "datasets": [dataset_config],
                        "title": chart_result.get('title', 'Chart')
                    }
                    response_data["chart_data"] = chart_data
                
                # Mark data as updated and return new data
                response_data["data_updated"] = True
                response_data["updated_data"] = {
                    "data": current_dataframe.to_dict(orient="records"),
                    "columns": current_dataframe.columns.tolist(),
                    "rows": len(current_dataframe),
                    "dtypes": current_dataframe.dtypes.astype(str).to_dict()
                }
                
                # If there's print output, pass it to AI for narrative interpretation
                if print_output:
                    response_data["print_output"] = print_output
                    
                    # Generate narrative interpretation of the print output
                    narrative_prompt = f"""
The following pandas code was executed and produced this output:

Code executed:
```python
{ai_response["pandas_code"]}
```

Print output:
{print_output}

Please provide a clear, narrative explanation of what this output means in the context of the data analysis. 

**Format your response in proper Markdown:**
- Use **bold text** for important points
- Use *italic text* for emphasis
- Use `inline code` for specific values or technical terms
- Use proper line breaks between paragraphs
- Keep it concise and informative
- Explain the results in a conversational, human tone that helps the user understand what happened to their data
"""
                    
                    # Get narrative from AI
                    narrative_response = ai_agent.generate_response(
                        user_message=narrative_prompt,
                        df_info=get_dataframe_info(),
                        chat_history=chat_history
                    )
                    
                    response_data["narrative_output"] = narrative_response["response"]
                
            except Exception as e:
                # If code execution fails, restore snapshot
                if snapshot_created:
                    restore_dataframe_snapshot()
                
                response_data["error"] = f"Code execution failed: {str(e)}"
                response_data["response"] += f"\n\n❌ **Error executing code:** {str(e)}"
        
        return ChatResponse(**response_data)
        
    except Exception as e:
        return ChatResponse(
            response=f"Error processing chat request: {str(e)}",
            pandas_code=None,
            has_code=False,
            data_updated=False,
            error=str(e)
        )

@app.post("/execute-pandas")
async def execute_pandas_code(request: PandasCodeRequest):
    global current_dataframe
    
    if current_dataframe is None:
        return {"error": "No dataset loaded"}
    
    try:
        # Execute code that can modify the dataframe
        exec(request.code, {'pd': pd, 'df': current_dataframe})
        
        # Return the updated dataframe data for display
        return {
            "success": True,
            "data": current_dataframe.to_dict(orient="records"),
            "columns": current_dataframe.columns.tolist(),
            "rows": len(current_dataframe)
        }
            
    except Exception as e:
        return {"error": str(e)}

@app.post("/undo")
async def undo_last_operation():
    """Undo the last dataframe operation"""
    global current_dataframe
    
    if restore_dataframe_snapshot():
        df_info = get_dataframe_info()
        return {
            "success": True,
            "message": "Last operation undone successfully",
            "data": current_dataframe.to_dict(orient="records"),
            "columns": current_dataframe.columns.tolist(),
            "rows": len(current_dataframe),
            "dtypes": current_dataframe.dtypes.astype(str).to_dict()
        }
    else:
        return {
            "success": False,
            "message": "No operations to undo"
        }

@app.get("/sheets")
async def get_sheets():
    """Get list of all available sheets"""
    global all_sheets, current_sheet_name
    
    if not all_sheets:
        return {
            "sheets": [],
            "current_sheet": None,
            "message": "No file loaded"
        }
    
    sheets_info = []
    for sheet_name, sheet_df in all_sheets.items():
        sheets_info.append({
            "name": sheet_name,
            "rows": len(sheet_df),
            "columns": len(sheet_df.columns),
            "column_names": sheet_df.columns.tolist(),
            "is_current": sheet_name == current_sheet_name
        })
    
    return {
        "sheets": list(all_sheets.keys()),
        "sheets_info": sheets_info,
        "current_sheet": current_sheet_name
    }

@app.post("/switch-sheet")
async def switch_sheet(request: SwitchSheetRequest):
    """Switch to a different sheet"""
    global current_dataframe, all_sheets, current_sheet_name, dataframe_snapshots
    
    if request.sheet_name not in all_sheets:
        raise HTTPException(status_code=404, detail=f"Sheet '{request.sheet_name}' not found")
    
    # Clear snapshots when switching sheets
    dataframe_snapshots = []
    
    # Switch to the new sheet
    current_sheet_name = request.sheet_name
    current_dataframe = all_sheets[request.sheet_name]
    
    # Perform data quality assessment on the new sheet
    quality_report = ai_agent.assess_data_quality(current_dataframe, request.sheet_name)
    
    # Generate formatted initial AI message for the new sheet
    initial_ai_message = ai_agent.generate_initial_assessment_message(current_dataframe, quality_report, request.sheet_name)
    
    return {
        "success": True,
        "message": f"Switched to sheet '{request.sheet_name}'",
        "current_sheet": current_sheet_name,
        "data": current_dataframe.to_dict(orient="records"),
        "columns": current_dataframe.columns.tolist(),
        "rows": len(current_dataframe),
        "dtypes": current_dataframe.dtypes.astype(str).to_dict(),
        "quality_report": quality_report,
        "initial_message": initial_ai_message
    }

