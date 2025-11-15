"""Chat routes for AI interaction"""

from fastapi import APIRouter
from api.models import ChatRequest, ChatResponse
from services.chart_service import chart_service
from core.state import df_state
from workflows.orchestrator import workflow_graph
from workflows.state import WorkflowState

router = APIRouter(tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Main chat endpoint using LangGraph workflow orchestration"""
    
    try:
        # Prepare initial state for workflow
        initial_state: WorkflowState = {
            "user_message": request.message,
            "chat_history": [
                {"role": msg.role, "content": msg.content}
                for msg in request.chat_history
            ],
            "df_info": df_state.get_info(),
            "intent": None,
            "confidence": None,
            "pandas_code": None,
            "code_explanation": None,
            "execution_success": True,
            "execution_error": None,
            "print_output": None,
            "chart_data": None,
            "ai_response": "",
            "narrative_output": None,
            "needs_approval": False,
            "approved": True,
            "retry_count": 0,
            "max_retries": 2
        }
        
        # Run the workflow
        print(f"\n🚀 Starting LangGraph workflow for: '{request.message[:50]}...'")
        final_state = workflow_graph.invoke(initial_state)
        print(f"✅ Workflow completed\n")
        
        # Build response data
        response_data = {
            "response": final_state.get("ai_response", ""),
            "pandas_code": final_state.get("pandas_code"),
            "has_code": bool(final_state.get("pandas_code")),
            "data_updated": False,
            "updated_data": None,
            "error": final_state.get("execution_error"),
            "print_output": final_state.get("print_output"),
            "narrative_output": final_state.get("narrative_output"),
            "chart_data": None
        }
        
        # If code was executed successfully, return updated data
        if final_state.get("execution_success") and final_state.get("pandas_code"):
            if df_state.has_data() and df_state.current_dataframe is not None:
                response_data["data_updated"] = True
                response_data["updated_data"] = {
                    "data": df_state.current_dataframe.to_dict(orient="records"),
                    "columns": df_state.current_dataframe.columns.tolist(),
                    "rows": int(len(df_state.current_dataframe)),
                    "dtypes": {str(k): str(v) for k, v in df_state.current_dataframe.dtypes.to_dict().items()}
                }
        
        # Handle chart data if generated
        if final_state.get("chart_data"):
            try:
                response_data["chart_data"] = chart_service.format_chart_data(final_state["chart_data"])
            except Exception as chart_error:
                print(f"Chart formatting error: {chart_error}")
                response_data["error"] = f"Chart generation failed: {str(chart_error)}"
        
        return ChatResponse(**response_data)
        
    except Exception as e:
        print(f"❌ Workflow error: {e}")
        import traceback
        traceback.print_exc()
        
        return ChatResponse(
            response=f"Error processing chat request: {str(e)}",
            pandas_code=None,
            has_code=False,
            data_updated=False,
            error=str(e)
        )
