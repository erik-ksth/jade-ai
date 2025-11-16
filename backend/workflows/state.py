"""State models for LangGraph workflows"""

from typing import TypedDict, Optional, List, Dict, Any, Literal, Callable
from enum import Enum


class WorkflowIntent(str, Enum):
    """Intent types for workflow routing"""
    CLEAN = "clean"
    TRANSFORM = "transform"
    ANALYZE = "analyze"
    VISUALIZE = "visualize"
    EXPLORE = "explore"


class WorkflowState(TypedDict):
    """Base state for all workflows"""
    # User input
    user_message: str
    chat_history: List[Dict[str, str]]
    
    # Dataframe context
    df_info: Dict[str, Any]
    
    # Intent classification
    intent: Optional[WorkflowIntent]
    confidence: Optional[float]
    
    # Code generation
    pandas_code: Optional[str]
    code_explanation: Optional[str]
    
    # Execution results
    execution_success: bool
    execution_error: Optional[str]
    print_output: Optional[str]
    chart_data: Optional[Dict[str, Any]]
    
    # Response
    ai_response: str
    narrative_output: Optional[str]
    
    # Quality assessment (for iterative cleaning)
    quality_assessment: Optional[Dict[str, Any]]
    cleaning_iteration: int
    max_cleaning_iterations: int
    cleaning_history: List[Dict[str, Any]]  # Track what was fixed in each iteration
    
    # Workflow control
    needs_approval: bool
    approved: bool
    retry_count: int
    max_retries: int
    
    # Streaming support
    stream_callback: Optional[Callable[[str], None]]


class CleanWorkflowState(WorkflowState):
    """State for data cleaning workflow"""
    detected_issues: Optional[List[str]]
    cleaning_strategy: Optional[str]


class TransformWorkflowState(WorkflowState):
    """State for data transformation workflow"""
    transformation_type: Optional[str]
    affected_columns: Optional[List[str]]


class AnalyzeWorkflowState(WorkflowState):
    """State for data analysis workflow"""
    analysis_type: Optional[str]
    statistical_results: Optional[Dict[str, Any]]


class VisualizeWorkflowState(WorkflowState):
    """State for data visualization workflow"""
    chart_type: Optional[str]
    chart_config: Optional[Dict[str, Any]]


class ExploreWorkflowState(WorkflowState):
    """State for data exploration workflow"""
    exploration_focus: Optional[str]
    insights: Optional[List[str]]
