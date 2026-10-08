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
            # The error is sent to the client in the completion event and shown there
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

Summarize the result for the user.

Rules:
- At most two short sentences or three bullet points.
- Cite the actual numbers from the output (row counts, values changed, totals).
- Do not include code, headings, or emoji, and do not restate what the code does line by line.
- If the output reveals a remaining problem, mention it in one short sentence.
"""
                
                # Get streaming callback from state if available
                stream_callback = state.get("stream_callback")
                if stream_callback:
                    # Separate the summary from the code block streamed before it
                    stream_callback("\n\n")
                
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
