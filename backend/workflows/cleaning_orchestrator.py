"""
Iterative Data Cleaning Orchestrator
Handles the iterative cleaning workflow with quality assessment and batch fixes
"""

from langgraph.graph import StateGraph, END
from typing import Dict, Any, Literal
from .state import WorkflowState
from .nodes import quality_assessor, generate_code_node, execute_code_node
from core.state import df_state


def emit(state: WorkflowState, text: str) -> str:
    """Stream text to the client (when streaming) and return the accumulated response"""
    stream_callback = state.get("stream_callback")
    if stream_callback:
        stream_callback(text)
    return state.get("ai_response", "") + text


def describe_issue(issue: Dict[str, Any]) -> str:
    columns = issue.get("affected_columns") or []
    if columns:
        return f"{issue['description']} (columns: {', '.join(map(str, columns))})"
    return issue["description"]


def issues_signature(quality: Dict[str, Any]) -> list:
    """Comparable summary of the high/medium issues, used to detect a pass that changed nothing"""
    issues = quality.get("issues", {})
    return sorted(issue["description"] for issue in issues.get("high", []) + issues.get("medium", []))


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
    
    # Stop when the last pass made no progress on the issues it targeted
    history = state.get("cleaning_history", [])
    if history and history[-1].get("issues_signature") == issues_signature(quality):
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
    
    plural = "s" if len(issues_to_fix) != 1 else ""
    issue_lines = "\n".join(f"- {describe_issue(issue)}" for issue in issues_to_fix)
    iteration_header = (
        f"{'' if iteration == 0 else chr(10)}**Pass {iteration + 1}: {len(issues_to_fix)} "
        f"{priority}-priority issue{plural}**\n\n{issue_lines}\n\n"
    )

    # Build prompt for code generation
    prompt = f"""Generate Python code to fix these {priority}-priority data quality issues:

{issue_lines}

Strategy (keep as many rows as possible):
- Replace placeholder values (ERROR, UNKNOWN, etc.) with pd.NA first.
- Convert numeric-looking columns with pd.to_numeric(errors="coerce") before any arithmetic.
- Recover missing numbers from related columns when a relationship exists
  (e.g. total = quantity x unit price; solve for whichever one is missing).
- Fill missing categorical values with the label "Not recorded" instead of dropping the row.
- Drop a row only when it lacks a value that cannot be recovered and matters for analysis
  (an item name, a date, or a number that cannot be derived), and print how many rows were dropped.

Use in-place operations. Print what was fixed with before/after counts.

Respond with one short sentence followed by the code block."""

    # Stream the header before the model starts writing code
    state = {**state, "ai_response": emit(state, iteration_header)}

    # Update state with the prompt
    updated_state = {
        **state,
        "user_message": prompt,
        "df_info": df_state.get_info(),  # reflect fixes from earlier passes
        "cleaning_iteration": iteration + 1
    }
    
    # Generate code using the existing code generator
    result = generate_code_node(updated_state)
    
    result["ai_response"] = state.get("ai_response", "") + result.get("ai_response", "")
    
    # Track what we're fixing in this iteration
    cleaning_history = state.get("cleaning_history", [])
    cleaning_history.append({
        "iteration": iteration + 1,
        "priority": priority,
        "issues_fixed": [issue["type"] for issue in issues_to_fix],
        "code": result.get("pandas_code", ""),
        "response": iteration_header,
        "issues_signature": issues_signature(quality),
    })
    
    return {
        **result,
        "cleaning_history": cleaning_history
    }


def assess_quality_node(state: WorkflowState) -> WorkflowState:
    """Report the previous pass (if any), then re-assess data quality"""
    if state.get("cleaning_iteration", 0) > 0:
        if state.get("execution_success"):
            print_output = (state.get("print_output") or "").strip()
            report = f"\n```text\n{print_output}\n```\n" if print_output else ""
        else:
            report = f"\nThis pass failed: `{state.get('execution_error', 'unknown error')}`. Trying again.\n"
        state = {**state, "ai_response": emit(state, report)}

    return quality_assessor.assess(state)


def generate_cleaning_summary(state: WorkflowState) -> WorkflowState:
    """
    Generate final summary of all cleaning iterations
    """
    quality = state.get("quality_assessment", {})
    cleaning_history = state.get("cleaning_history", [])
    iteration = state.get("cleaning_iteration", 0)
    
    issues = quality.get("issues", {})
    remaining = len(issues.get("high", [])) + len(issues.get("medium", [])) + len(issues.get("low", []))
    rows = quality.get("total_rows", 0)
    columns = quality.get("total_columns", 0)
    score = quality.get("quality_score", 0)

    if iteration == 0 and remaining == 0:
        summary = f"No data quality issues found. The dataset has {rows:,} rows and {columns} columns."
    else:
        passes = f"{iteration} pass{'es' if iteration != 1 else ''}"
        summary = (
            f"\n**Cleaning complete** after {passes}. "
            f"The dataset now has {rows:,} rows and {columns} columns, with a quality score of {score:g}/100."
        )
        if remaining:
            summary += (
                f" {remaining} minor issue{'s' if remaining != 1 else ''} remain"
                f"{'s' if remaining == 1 else ''}; ask me to address {'it' if remaining == 1 else 'them'} if needed."
            )

    return {
        **state,
        "ai_response": emit(state, summary),
        "execution_success": True,
        # Failed passes are reported inline; don't surface a stale error at the end
        "execution_error": None,
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
