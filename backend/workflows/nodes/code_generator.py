"""Code generation node for creating pandas code"""

from typing import Dict, Any
from langchain_groq import ChatGroq
from langchain_core.messages import SystemMessage, HumanMessage
from workflows.state import WorkflowState, WorkflowIntent
from core.config import settings
from aiAgent import ai_agent


class CodeGenerator:
    """Generates pandas code based on user intent and request"""
    
    def __init__(self):
        self.ai_agent = ai_agent
    
    def generate(self, state: WorkflowState) -> WorkflowState:
        """Generate pandas code for the user's request"""
        try:
            # Get streaming callback from state if available
            stream_callback = state.get("stream_callback")
            
            # Get AI response with code
            ai_response = self.ai_agent.generate_response(
                user_message=state["user_message"],
                df_info=state["df_info"],
                chat_history=state["chat_history"],
                stream_callback=stream_callback
            )
            
            # Update state
            state["pandas_code"] = ai_response.get("pandas_code")
            state["ai_response"] = ai_response.get("response", "")
            
            # Check if code was generated
            if ai_response.get("has_code") and state["pandas_code"]:
                print(f"✅ Code generated for {state['intent']} workflow")
                state["code_explanation"] = ai_response.get("response", "")
            else:
                print(f"ℹ️ No code needed for this request")
                state["pandas_code"] = None
            
        except Exception as e:
            print(f"❌ Code generation error: {e}")
            state["execution_error"] = f"Code generation failed: {str(e)}"
            state["execution_success"] = False
        
        return state


# Singleton instance
code_generator = CodeGenerator()


def generate_code_node(state: WorkflowState) -> WorkflowState:
    """Node function for code generation"""
    return code_generator.generate(state)
