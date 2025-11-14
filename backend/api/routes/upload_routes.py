"""Upload routes for file handling"""

from fastapi import APIRouter, UploadFile, File, HTTPException
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
        
        # Parse file based on type
        if file_service.is_csv(file.filename):
            # CSV file - single sheet
            df = file_service.parse_csv(content)
            df_state.add_sheet("Sheet1", df)
            df_state.switch_sheet("Sheet1")
            has_multiple_sheets = False
            sheets = ["Sheet1"]
            sheets_info = [{
                "name": "Sheet1",
                "rows": len(df),
                "columns": len(df.columns),
                "column_names": df.columns.tolist()
            }]
        else:
            # Excel file - multiple sheets
            sheets_dict = file_service.parse_excel(content)
            for name, sheet_df in sheets_dict.items():
                df_state.add_sheet(name, sheet_df)
            
            # Switch to first sheet
            first_sheet = list(sheets_dict.keys())[0]
            df_state.switch_sheet(first_sheet)
            has_multiple_sheets = len(sheets_dict) > 1
            sheets = list(sheets_dict.keys())
            sheets_info = df_state.get_sheets_info()
        
        # Build response
        return {
            "filename": file.filename,
            "rows": int(len(df_state.current_dataframe)),
            "columns": int(len(df_state.current_dataframe.columns)),
            "column_names": df_state.current_dataframe.columns.tolist(),
            "dtypes": {str(k): str(v) for k, v in df_state.current_dataframe.dtypes.to_dict().items()},
            "preview": df_state.current_dataframe.head(5).to_dict(orient="records"),
            "data": df_state.current_dataframe.to_dict(orient="records"),
            "sheets": sheets,
            "sheets_info": sheets_info,
            "current_sheet": df_state.current_sheet_name,
            "has_multiple_sheets": has_multiple_sheets
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error processing file: {str(e)}"
        )
