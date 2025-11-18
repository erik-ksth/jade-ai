"""Data management routes (sheets, undo, execute)"""

from fastapi import APIRouter, HTTPException
from api.models import SwitchSheetRequest, PandasCodeRequest
from api.utils import dataframe_to_json_safe
from core.state import df_state
import pandas as pd

router = APIRouter(tags=["data"])


@router.get("/sheets")
async def get_sheets():
    """Get list of all available sheets"""
    
    if not df_state.has_data():
        return {
            "sheets": [],
            "current_sheet": None,
            "message": "No file loaded"
        }
    
    sheets_info = df_state.get_sheets_info()
    
    return {
        "sheets": list(df_state.all_sheets.keys()),
        "sheets_info": sheets_info,
        "current_sheet": df_state.current_sheet_name
    }


@router.post("/switch-sheet")
async def switch_sheet(request: SwitchSheetRequest):
    """Switch to a different sheet"""
    
    if not df_state.switch_sheet(request.sheet_name):
        raise HTTPException(
            status_code=404,
            detail=f"Sheet '{request.sheet_name}' not found"
        )
    
    json_safe_data = dataframe_to_json_safe(df_state.current_dataframe)
    
    return {
        "success": True,
        "message": f"Switched to sheet '{request.sheet_name}'",
        "current_sheet": df_state.current_sheet_name,
        "data": json_safe_data["data"],
        "columns": json_safe_data["columns"],
        "rows": json_safe_data["rows"],
        "dtypes": json_safe_data["dtypes"]
    }


@router.post("/execute-pandas")
async def execute_pandas_code(request: PandasCodeRequest):
    """Execute pandas code directly (legacy endpoint)"""
    
    if not df_state.has_data():
        return {"error": "No dataset loaded"}
    
    try:
        # Execute code with proper context
        exec_context = {'pd': pd, 'df': df_state.current_dataframe}
        exec(request.code, exec_context, exec_context)
        
        # Return updated data
        json_safe_data = dataframe_to_json_safe(df_state.current_dataframe)
        
        return {
            "success": True,
            "data": json_safe_data["data"],
            "columns": json_safe_data["columns"],
            "rows": json_safe_data["rows"]
        }
        
    except Exception as e:
        return {"error": str(e)}


@router.post("/clear")
async def clear_state():
    """Clear all backend state (dataframes, sheets, chat history)"""
    
    df_state.clear()
    
    return {
        "success": True,
        "message": "Backend state cleared successfully"
    }
