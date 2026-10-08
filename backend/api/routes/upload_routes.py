"""Upload routes for file handling"""

import uuid

from fastapi import APIRouter, UploadFile, File, HTTPException
from api.utils import dataframe_to_json_safe
from services.file_service import file_service
from core.state import df_state

router = APIRouter(tags=["upload"])


@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload and process CSV or Excel file"""
    
    # Validate file extension
    if not file_service.validate_file_extension(file.filename):
        raise HTTPException(
            status_code=400,
            detail="Only CSV and Excel files are supported"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Every upload gets its own keys so files with the same sheet names
        # (e.g. two CSVs, both "Sheet1") don't overwrite each other
        upload_id = uuid.uuid4().hex[:8]

        # Parse file based on type
        if file_service.is_csv(file.filename):
            sheets_dict = {"Sheet1": file_service.parse_csv(content)}
        else:
            sheets_dict = file_service.parse_excel(content)

        sheets_info = []
        for name, sheet_df in sheets_dict.items():
            key = f"{upload_id}:{name}"
            df_state.add_sheet(key, sheet_df)
            sheets_info.append({
                "name": name,
                "key": key,
                "rows": len(sheet_df),
                "columns": len(sheet_df.columns),
                "column_names": sheet_df.columns.tolist()
            })

        # Make the first sheet of this upload the active dataset
        df_state.switch_sheet(sheets_info[0]["key"])
        has_multiple_sheets = len(sheets_info) > 1
        sheets = [info["name"] for info in sheets_info]

        # Build response with JSON-safe data
        json_safe_data = dataframe_to_json_safe(df_state.current_dataframe)
        json_safe_preview = dataframe_to_json_safe(df_state.current_dataframe.head(5))
        
        return {
            "filename": file.filename,
            "rows": json_safe_data["rows"],
            "columns": len(json_safe_data["columns"]),
            "column_names": json_safe_data["columns"],
            "dtypes": json_safe_data["dtypes"],
            "preview": json_safe_preview["data"],
            "data": json_safe_data["data"],
            "sheets": sheets,
            "sheets_info": sheets_info,
            "current_sheet": df_state.current_sheet_name,
            "dataset_key": df_state.current_sheet_name,
            "has_multiple_sheets": has_multiple_sheets
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )
