"""Chat routes for AI interaction"""

from fastapi import APIRouter
from api.models import ChatRequest, ChatResponse
from services.execution_service import execution_service
from services.chart_service import chart_service
from core.state import df_state
from aiAgent import ai_agent

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main chat endpoint for AI interaction"""
    
    try:
        # Get dataframe info for AI context
        df_info = df_state.get_info()
        
        # Convert chat history to dict format
        chat_history = [
            {"role": msg.role, "content": msg.content}
            for msg in request.chat_history
        ]
        
        # Generate AI response
        ai_response = ai_agent.generate_response(
            user_message=request.message,
            df_info=df_info,
            chat_history=chat_history
        )
        
        # Initialize response data
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
        
        # Execute code if provided
        if ai_response["has_code"] and ai_response["pandas_code"]:
            # Check if dataframe exists
            if not df_state.has_data():
                response_data["error"] = "No dataset loaded. Please upload a file first."
                response_data["response"] += "\n\n❌ **Error:** No dataset loaded. Please upload a file first."
                return ChatResponse(**response_data)
            
            # Execute pandas code
            success, print_output, error, chart_data = execution_service.execute_code(
                ai_response["pandas_code"],
                df_state.current_dataframe
            )
            
            if success:
                # Verify dataframe still exists after execution
                if df_state.current_dataframe is None:
                    response_data["error"] = "Dataframe was corrupted during execution"
                    response_data["response"] += "\n\n❌ **Error:** Operation resulted in invalid dataframe state"
                    return ChatResponse(**response_data)
                
                # Update response with execution results
                response_data["data_updated"] = True
                response_data["updated_data"] = {
                    "data": df_state.current_dataframe.to_dict(orient="records"),
                    "columns": df_state.current_dataframe.columns.tolist(),
                    "rows": int(len(df_state.current_dataframe)),
                    "dtypes": {str(k): str(v) for k, v in df_state.current_dataframe.dtypes.to_dict().items()}
                }
                
                # Handle chart data if generated
                if chart_data:
                    try:
                        response_data["chart_data"] = chart_service.format_chart_data(chart_data)
                    except Exception as chart_error:
                        # Chart formatting failed, log but don't fail the request
                        print(f"Chart formatting error: {chart_error}")
                        response_data["error"] = f"Chart generation failed: {str(chart_error)}"
                
                # Handle print output with narrative generation
                if print_output:
                    response_data["print_output"] = print_output
                    
                    # Generate narrative interpretation
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
                    
                    narrative_response = ai_agent.generate_response(
                        user_message=narrative_prompt,
                        df_info=df_state.get_info(),
                        chat_history=chat_history
                    )
                    
                    response_data["narrative_output"] = narrative_response["response"]
            else:
                # Execution failed
                response_data["error"] = f"Code execution failed: {error}"
                response_data["response"] += f"\n\n❌ **Error executing code:** {error}"
        
        return ChatResponse(**response_data)
        
    except Exception as e:
        return ChatResponse(
            response=f"Error processing chat request: {str(e)}",
            pandas_code=None,
            has_code=False,
            data_updated=False,
            error=str(e)
        )
