"""Pydantic models for API requests and responses"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any


# Request Models
class ChatMessage(BaseModel):
    """Chat message model"""
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    """Chat request model"""
    message: str
    chat_history: Optional[List[ChatMessage]] = []


class SwitchSheetRequest(BaseModel):
    """Switch sheet request model"""
    sheet_name: str


class PandasCodeRequest(BaseModel):
    """Pandas code execution request model"""
    code: str


# Response Models
class ChartData(BaseModel):
    """Chart data model"""
    type: str  # 'line', 'bar', 'pie', 'scatter', etc.
    labels: List[Any]
    datasets: List[Dict[str, Any]]
    title: str


class ChatResponse(BaseModel):
    """Chat response model"""
    response: str
    pandas_code: Optional[str] = None
    has_code: bool
    data_updated: bool
    updated_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    print_output: Optional[str] = None
    narrative_output: Optional[str] = None
    chart_data: Optional[ChartData] = None
