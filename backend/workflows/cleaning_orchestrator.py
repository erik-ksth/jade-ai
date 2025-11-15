"""
Iterative Data Cleaning Orchestrator
Handles the iterative cleaning workflow with quality assessment and batch fixes
"""

from langgraph.graph import StateGraph, END
from typing import Dict, Any, Literal
from .state import WorkflowState
from .nodes import quality_assessor, generate_code_node, execute_code_node


def should_continue_cleaning(state: WorkflowState) -> Literal["assess_quality", "generate_summary"]:
    """
    Decide whether to continue cleaning or finish
    
    Returns:
        "assess_quality" if more cleaning needed
        "generate_summary" if done or max iterations reached
    """
    quality = state.get("quality_assessment", {})
    iteration = state.get("cleaning_iteration", 0)
    max_iterations = state.get("max_cleaning_iterations", 5)
    
    # Check if we've hit max iterations
    if iteration >= max_iterations:
        return "generate_summary"
    
    # Check if there are still issues to fix
    if quality.get("has_issues", False):
        issues = quality.get("issues", {})
        # Continue if there are high or medium priority issues
        if issues.get("high") or issues.get("medium"):
            return "assess_quality"
    
    # No more issues or only low priority - we're done
    return "generate_summary"


def generate_batch_fix_code(state: WorkflowState) -> WorkflowState:
    """
    Generate code to fix all issues of the current priority level in batch
    """
    quality = state.get("quality_assessment", {})
    issues = quality.get("issues", {})
    iteration = state.get("cleaning_iteration", 0)
    
    # Determine which priority level to fix
    if issues.get("high"):
        priority = "high"
        issues_to_fix = issues["high"]
    elif issues.get("medium"):
        priority = "medium"
        issues_to_fix = issues["medium"]
    else:
        priority = "low"
        issues_to_fix = issues.get("low", [])
    
    # Build iteration header
    issues_description = "\n".join([
        f"  • {issue['description']}"
        for issue in issues_to_fix
    ])
    
    iteration_header = f"""🔍 **Iteration {iteration + 1}: Assessing quality...**

Found {len(issues_to_fix)} {priority}-priority issue{'s' if len(issues_to_fix) != 1 else ''}:

{issues_description}

⚙️ **Fixing {priority}-priority issues...**

"""
    
    # Build prompt for code generation
    prompt = f"""Generate Python code to fix these {priority}-priority issues:

{chr(10).join([f"- {issue['type']}: {issue['description']}" for issue in issues_to_fix])}

Use in-place operations and include print statements showing what was fixed.

Respond with ONLY the code block:

```python
# Your batch fix code here
```"""
    
    # Update state with the prompt
    updated_state = {
        **state,
        "user_message": prompt,
        "cleaning_iteration": iteration + 1
    }
    
    # Generate code using the existing code generator
    result = generate_code_node(updated_state)
    
    # Prepend iteration header to AI response
    current_response = state.get("ai_response", "")
    result["ai_response"] = current_response + iteration_header + result.get("ai_response", "")
    
    # Track what we're fixing in this iteration
    cleaning_history = state.get("cleaning_history", [])
    cleaning_history.append({
        "iteration": iteration + 1,
        "priority": priority,
        "issues_fixed": [issue["type"] for issue in issues_to_fix],
        "code": result.get("pandas_code", ""),
        "response": iteration_header
    })
    
    return {
        **result,
        "cleaning_history": cleaning_history
    }


def assess_quality_node(state: WorkflowState) -> WorkflowState:
    """Assess data quality and add success message if coming from execution"""
    result = quality_assessor.assess(state)
    
    # If we just executed code, add a success message
    if state.get("execution_success") and state.get("cleaning_iteration", 0) > 0:
        print_output = state.get("print_output", "")
        success_msg = f"\n✅ **Fixed!** Issues resolved successfully.\n\n"
        
        # Add print output if available
        if print_output:
            success_msg += f"```\n{print_output}\n```\n\n"
        
        # Append to response
        current_response = result.get("ai_response", "")
        result["ai_response"] = current_response + success_msg
    
    return result


def generate_cleaning_summary(state: WorkflowState) -> WorkflowState:
    """
    Generate final summary of all cleaning iterations
    """
    quality = state.get("quality_assessment", {})
    cleaning_history = state.get("cleaning_history", [])
    iteration = state.get("cleaning_iteration", 0)
    
    # Get current accumulated response
    current_response = state.get("ai_response", "")
    
    # Build final summary
    summary_parts = [
        f"\n---\n\n",
        f"🎉 **All Done! Data Cleaning Complete!**\n\n",
        f"Completed {iteration} cleaning iteration{'s' if iteration != 1 else ''}.\n\n"
    ]
    
    # Add final quality metrics
    summary_parts.append(f"**Final Data Quality:**\n\n")
    summary_parts.append(f"• Quality Score: {quality.get('quality_score', 0)}/100\n")
    summary_parts.append(f"• Total Rows: {quality.get('total_rows', 0):,}\n")
    summary_parts.append(f"• Total Columns: {quality.get('total_columns', 0)}\n")
    
    # Check for remaining issues
    issues = quality.get("issues", {})
    remaining = len(issues.get("high", [])) + len(issues.get("medium", [])) + len(issues.get("low", []))
    
    if remaining == 0:
        summary_parts.append("\n✨ Your data is now clean with no remaining issues!")
    else:
        summary_parts.append(f"\n⚠️ {remaining} low-priority issue{'s' if remaining != 1 else ''} remaining (can be addressed later)")
    
    summary = "".join(summary_parts)
    
    return {
        **state,
        "ai_response": current_response + summary,
        "execution_success": True
    }


# Build the cleaning workflow graph
def create_cleaning_workflow():
    """Create the iterative cleaning workflow"""
    workflow = StateGraph(WorkflowState)
    
    # Add nodes
    workflow.add_node("assess_quality", assess_quality_node)
    workflow.add_node("generate_fix", generate_batch_fix_code)
    workflow.add_node("execute_fix", execute_code_node)
    workflow.add_node("generate_summary", generate_cleaning_summary)
    
    # Set entry point
    workflow.set_entry_point("assess_quality")
    
    # Add edges
    workflow.add_conditional_edges(
        "assess_quality",
        should_continue_cleaning,
        {
            "assess_quality": "generate_fix",  # Continue cleaning
            "generate_summary": "generate_summary"  # Done
        }
    )
    
    workflow.add_edge("generate_fix", "execute_fix")
    workflow.add_edge("execute_fix", "assess_quality")  # Loop back to assess
    workflow.add_edge("generate_summary", END)
    
    return workflow.compile()


# Create the compiled workflow
cleaning_workflow = create_cleaning_workflow()
