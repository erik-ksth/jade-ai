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
from workflows.cleaning_orchestrator import cleaning_workflow


def route_by_intent(state: WorkflowState) -> Literal["cleaning_workflow", "generate_code"]:
    """Route to appropriate workflow based on intent"""
    intent = state.get("intent")
    
    # Check if this is a cleaning request
    if intent == WorkflowIntent.CLEAN:
        return "cleaning_workflow"
    
    # All other intents use the standard workflow
    return "generate_code"


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


def cleaning_workflow_node(state: WorkflowState) -> WorkflowState:
    """Execute the iterative cleaning workflow"""
    # Initialize cleaning-specific state
    state["cleaning_iteration"] = 0
    state["max_cleaning_iterations"] = 5
    state["cleaning_history"] = []
    
    # Run the cleaning workflow
    result = cleaning_workflow.invoke(state)
    return result


def create_workflow_orchestrator() -> StateGraph:
    """
    Create the main LangGraph workflow orchestrator.
    
    Flow:
    1. Classify Intent -> Determine user's goal
    2. Route by Intent:
       - CLEAN -> Iterative cleaning workflow (assess -> fix -> repeat)
       - Other -> Standard workflow (generate -> execute -> respond)
    
    The cleaning workflow includes quality assessment and batch fixes.
    """
    
    # Create the graph
    workflow = StateGraph(WorkflowState)
    
    # Add nodes
    workflow.add_node("classify_intent", classify_intent_node)
    workflow.add_node("cleaning_workflow", cleaning_workflow_node)
    workflow.add_node("generate_code", generate_code_node)
    workflow.add_node("execute_code", execute_code_node)
    workflow.add_node("generate_response", generate_response_node)
    
    # Set entry point
    workflow.set_entry_point("classify_intent")
    
    # Add edges
    # After intent classification, route based on intent
    workflow.add_conditional_edges(
        "classify_intent",
        route_by_intent,
        {
            "cleaning_workflow": "cleaning_workflow",
            "generate_code": "generate_code"
        }
    )
    
    # Cleaning workflow goes directly to END (it handles everything internally)
    workflow.add_edge("cleaning_workflow", END)
    
    # Standard workflow: After code generation, decide whether to execute
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
