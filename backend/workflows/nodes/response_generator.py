"""Response generation node for creating final user responses"""

from workflows.state import WorkflowState
from aiAgent import ai_agent


class ResponseGenerator:
    """Generates final response with narrative explanations"""
    
    def __init__(self):
        self.ai_agent = ai_agent
    
    def generate(self, state: WorkflowState) -> WorkflowState:
        """Generate final response for user"""
        
        # If execution failed, add error to response
        if not state.get("execution_success", True):
            error_msg = state.get("execution_error", "Unknown error")
            state["ai_response"] = state.get("ai_response", "") + f"\n\n❌ **Error:** {error_msg}"
            return state
        
        # If there's print output, generate narrative
        if state.get("print_output"):
            try:
                narrative_prompt = f"""
The following pandas code was executed and produced this output:

Code executed:
```python
{state.get('pandas_code', '')}
```

Print output:
{state['print_output']}

Please provide a clear, narrative explanation of what this output means in the context of the data analysis.

**Format your response in proper Markdown:**
- Use **bold text** for important points
- Use *italic text* for emphasis
- Use `inline code` for specific values or technical terms
- Use proper line breaks between paragraphs
- Keep it concise and informative
- Explain the results in a conversational, human tone that helps the user understand what happened to their data
"""
                
                # Get streaming callback from state if available
                stream_callback = state.get("stream_callback")
                
                # Get narrative from AI
                narrative_response = self.ai_agent.generate_response(
                    user_message=narrative_prompt,
                    df_info=state.get("df_info", {}),
                    chat_history=state.get("chat_history", []),
                    stream_callback=stream_callback
                )
                
                state["narrative_output"] = narrative_response.get("response", "")
                print(f"✅ Narrative generated")
                
            except Exception as e:
                print(f"⚠️ Narrative generation failed: {e}")
                # Continue without narrative
        
        return state


# Singleton instance
response_generator = ResponseGenerator()


def generate_response_node(state: WorkflowState) -> WorkflowState:
    """Node function for response generation"""
    return response_generator.generate(state)
