"""Chat routes for AI interaction"""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from api.models import ChatRequest, ChatResponse
from services.chart_service import chart_service
from core.state import df_state
from workflows.orchestrator import workflow_graph
from workflows.state import WorkflowState
import json
import asyncio

router = APIRouter(tags=["chat"])


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    """Real streaming chat endpoint that sends tokens as they're generated"""
    
    async def event_generator():
        try:
            # Create a queue for streaming chunks
            chunk_queue = asyncio.Queue()
            final_state_holder = {}
            loop = asyncio.get_event_loop()
            
            # Streaming callback that gets called for each token
            def stream_callback(chunk: str):
                # Put chunk in queue (this is called from sync context in thread)
                asyncio.run_coroutine_threadsafe(chunk_queue.put(chunk), loop)
            
            # Prepare initial state with streaming callback
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
                "quality_assessment": None,
                "cleaning_iteration": 0,
                "max_cleaning_iterations": 5,
                "cleaning_history": [],
                "needs_approval": False,
                "approved": True,
                "retry_count": 0,
                "max_retries": 2,
                "stream_callback": stream_callback
            }
            
            # Run workflow in background
            async def run_workflow():
                try:
                    # Run workflow synchronously in thread pool
                    import concurrent.futures
                    loop = asyncio.get_event_loop()
                    with concurrent.futures.ThreadPoolExecutor() as executor:
                        result = await loop.run_in_executor(
                            executor,
                            workflow_graph.invoke,
                            initial_state
                        )
                    final_state_holder['state'] = result
                    await chunk_queue.put(None)  # Signal completion
                except Exception as e:
                    final_state_holder['error'] = str(e)
                    await chunk_queue.put(None)
            
            # Start workflow task
            workflow_task = asyncio.create_task(run_workflow())
            
            # Stream chunks as they arrive
            while True:
                chunk = await chunk_queue.get()
                if chunk is None:  # Workflow completed
                    break
                yield f"data: {json.dumps({'type': 'response', 'content': chunk})}\n\n"
            
            # Wait for workflow to complete
            await workflow_task
            
            # Check for errors
            if 'error' in final_state_holder:
                yield f"data: {json.dumps({'type': 'error', 'content': final_state_holder['error']})}\n\n"
                return
            
            final_state = final_state_holder.get('state', {})
            
            # Send completion event with data
            completion_data = {
                "type": "complete",
                "data_updated": False,
                "updated_data": None,
                "chart_data": None,
                "error": final_state.get("execution_error")
            }
            
            # If code was executed successfully, include updated data
            if final_state.get("execution_success") and final_state.get("pandas_code"):
                if df_state.has_data() and df_state.current_dataframe is not None:
                    completion_data["data_updated"] = True
                    completion_data["updated_data"] = {
                        "data": df_state.current_dataframe.to_dict(orient="records"),
                        "columns": df_state.current_dataframe.columns.tolist(),
                        "rows": int(len(df_state.current_dataframe)),
                        "dtypes": {str(k): str(v) for k, v in df_state.current_dataframe.dtypes.to_dict().items()}
                    }
            
            # Handle chart data
            if final_state.get("chart_data"):
                try:
                    completion_data["chart_data"] = chart_service.format_chart_data(final_state["chart_data"])
                except Exception as chart_error:
                    print(f"Chart formatting error: {chart_error}")
            
            yield f"data: {json.dumps(completion_data)}\n\n"
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            print(f"❌ Streaming error: {e}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


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
            "quality_assessment": None,
            "cleaning_iteration": 0,
            "max_cleaning_iterations": 5,
            "cleaning_history": [],
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
