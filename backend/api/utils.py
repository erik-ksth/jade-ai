"""Utility functions for API routes"""

import pandas as pd
from datetime import datetime, date


def dataframe_to_json_safe(df: pd.DataFrame) -> dict:
    """
    Convert dataframe to JSON-safe dictionary, handling Timestamps and other non-serializable types.
    
    This function ensures that pandas Timestamp objects and other datetime types are converted
    to ISO format strings, preventing JSON serialization errors.
    
    Args:
        df: pandas DataFrame to convert
        
    Returns:
        Dictionary with:
        - data: list of records (rows as dicts)
        - columns: list of column names
        - rows: number of rows
        - dtypes: dictionary of column data types
    """
    # Create a copy to avoid modifying the original
    df_copy = df.copy()
    
    # Convert datetime/Timestamp columns to ISO format strings
    for col in df_copy.columns:
        if pd.api.types.is_datetime64_any_dtype(df_copy[col]):
            # Convert datetime columns to ISO format strings
            df_copy[col] = df_copy[col].apply(
                lambda x: x.isoformat() if pd.notna(x) else None
            )
        # Handle other non-serializable types in object columns
        elif df_copy[col].dtype == 'object':
            df_copy[col] = df_copy[col].apply(
                lambda x: str(x) if isinstance(x, (datetime, date, pd.Timestamp)) else x
            )
    
    return {
        "data": df_copy.to_dict(orient="records"),
        "columns": df.columns.tolist(),
        "rows": int(len(df)),
        "dtypes": {str(k): str(v) for k, v in df.dtypes.to_dict().items()}
    }
