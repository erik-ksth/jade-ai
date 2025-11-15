"""Data management routes (sheets, undo, execute)"""

from fastapi import APIRouter, HTTPException
from api.models import SwitchSheetRequest, PandasCodeRequest
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
    
    return {
        "success": True,
        "message": f"Switched to sheet '{request.sheet_name}'",
        "current_sheet": df_state.current_sheet_name,
        "data": df_state.current_dataframe.to_dict(orient="records"),
        "columns": df_state.current_dataframe.columns.tolist(),
        "rows": int(len(df_state.current_dataframe)),
        "dtypes": {str(k): str(v) for k, v in df_state.current_dataframe.dtypes.to_dict().items()}
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
        return {
            "success": True,
            "data": df_state.current_dataframe.to_dict(orient="records"),
            "columns": df_state.current_dataframe.columns.tolist(),
            "rows": int(len(df_state.current_dataframe))
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
