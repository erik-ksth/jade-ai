"""Main workflow orchestrator for LangGraph"""

from typing import Literal
from langgraph.graph import StateGraph, END
from workflows.state import WorkflowState, WorkflowIntent
from workflows.nodes import (
    classify_intent_node,
    generate_code_node,
    execute_code_node,
    generate_response_node
)


def should_execute_code(state: WorkflowState) -> Literal["execute", "respond"]:
    """Decide if code should be executed"""
    if state.get("pandas_code"):
        return "execute"
    return "respond"


def should_retry(state: WorkflowState) -> Literal["respond"]:
    """Decide if code generation should be retried after failure"""
    # Disabled retry logic to prevent infinite loops
    # TODO: Implement proper retry with error feedback
    return "respond"


def create_workflow_orchestrator() -> StateGraph:
    """
    Create the main LangGraph workflow orchestrator.
    
    Flow:
    1. Classify Intent -> Determine user's goal
    2. Generate Code -> Create pandas code based on intent
    3. Execute Code -> Run the code (if present)
    4. Generate Response -> Create final response with narrative
    
    The workflow includes retry logic for failed executions.
    """
    
    # Create the graph
    workflow = StateGraph(WorkflowState)
    
    # Add nodes
    workflow.add_node("classify_intent", classify_intent_node)
    workflow.add_node("generate_code", generate_code_node)
    workflow.add_node("execute_code", execute_code_node)
    workflow.add_node("generate_response", generate_response_node)
    
    # Set entry point
    workflow.set_entry_point("classify_intent")
    
    # Add edges
    # After intent classification, always generate code
    workflow.add_edge("classify_intent", "generate_code")
    
    # After code generation, decide whether to execute
    workflow.add_conditional_edges(
        "generate_code",
        should_execute_code,
        {
            "execute": "execute_code",
            "respond": "generate_response"
        }
    )
    
    # After execution, always go to response (retry disabled)
    workflow.add_edge("execute_code", "generate_response")
    
    # After response generation, end
    workflow.add_edge("generate_response", END)
    
    # Compile the graph
    return workflow.compile()


# Create singleton instance
workflow_graph = create_workflow_orchestrator()
