"""Utility functions for dataframe operations"""

import pandas as pd
from typing import Dict, Any, List, Optional


class DataFrameUtils:
    """Utility functions for working with dataframes"""
    
    @staticmethod
    def get_info(df: pd.DataFrame) -> Dict[str, Any]:
        """Get comprehensive information about a dataframe"""
        if df is None:
            return {}
        
        return {
            "rows": len(df),
            "columns": len(df.columns),
            "column_names": df.columns.tolist(),
            "dtypes": df.dtypes.astype(str).to_dict(),
            "memory_usage": df.memory_usage(deep=True).sum(),
            "null_counts": df.isnull().sum().to_dict(),
        }
    
    @staticmethod
    def get_preview(df: pd.DataFrame, rows: int = 5) -> List[Dict[str, Any]]:
        """Get preview of dataframe as list of dicts"""
        if df is None:
            return []
        return df.head(rows).to_dict(orient="records")
    
    @staticmethod
    def to_dict(df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Convert dataframe to list of dictionaries"""
        if df is None:
            return []
        return df.to_dict(orient="records")
    
    @staticmethod
    def get_column_stats(df: pd.DataFrame, column: str) -> Optional[Dict[str, Any]]:
        """Get statistics for a specific column"""
        if df is None or column not in df.columns:
            return None
        
        col_data = df[column]
        stats = {
            "name": column,
            "dtype": str(col_data.dtype),
            "null_count": int(col_data.isnull().sum()),
            "null_percentage": float(col_data.isnull().sum() / len(df) * 100),
            "unique_count": int(col_data.nunique()),
        }
        
        # Add numeric stats if applicable
        if pd.api.types.is_numeric_dtype(col_data):
            stats.update({
                "mean": float(col_data.mean()) if not col_data.isnull().all() else None,
                "median": float(col_data.median()) if not col_data.isnull().all() else None,
                "std": float(col_data.std()) if not col_data.isnull().all() else None,
                "min": float(col_data.min()) if not col_data.isnull().all() else None,
                "max": float(col_data.max()) if not col_data.isnull().all() else None,
            })
        
        return stats
    
    @staticmethod
    def format_for_response(df: pd.DataFrame) -> Dict[str, Any]:
        """Format dataframe for API response"""
        if df is None:
            return {}
        
        return {
            "data": df.to_dict(orient="records"),
            "columns": df.columns.tolist(),
            "rows": len(df),
            "dtypes": df.dtypes.astype(str).to_dict()
        }
    
    @staticmethod
    def clean_for_json(df: pd.DataFrame) -> pd.DataFrame:
        """Clean dataframe for JSON serialization"""
        if df is None:
            return None
        
        # Replace NaN with None for JSON compatibility
        return df.where(pd.notna(df), None)
