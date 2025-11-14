"""Centralized state management for dataframes"""

from typing import Dict, List, Optional, Any
import pandas as pd


class DataFrameState:
    """Manages dataframe state and sheets"""
    
    def __init__(self):
        self._current_dataframe: Optional[pd.DataFrame] = None
        self._all_sheets: Dict[str, pd.DataFrame] = {}
        self._current_sheet_name: Optional[str] = None
    
    @property
    def current_dataframe(self) -> Optional[pd.DataFrame]:
        """Get current active dataframe"""
        return self._current_dataframe
    
    @current_dataframe.setter
    def current_dataframe(self, df: pd.DataFrame):
        """Set current active dataframe"""
        self._current_dataframe = df
    
    @property
    def current_sheet_name(self) -> Optional[str]:
        """Get current sheet name"""
        return self._current_sheet_name
    
    @property
    def all_sheets(self) -> Dict[str, pd.DataFrame]:
        """Get all sheets"""
        return self._all_sheets
    
    def get_info(self) -> Dict[str, Any]:
        """Get current dataframe information for AI context"""
        if self._current_dataframe is None:
            return {}
        
        return {
            "filename": "current_dataset",
            "rows": int(len(self._current_dataframe)),
            "columns": int(len(self._current_dataframe.columns)),
            "column_names": self._current_dataframe.columns.tolist(),
            "dtypes": {str(k): str(v) for k, v in self._current_dataframe.dtypes.to_dict().items()},
            "preview": self._current_dataframe.head(5).to_dict(orient="records")
        }
    
    def add_sheet(self, name: str, df: pd.DataFrame):
        """Add a sheet to the collection"""
        self._all_sheets[name] = df
    
    def switch_sheet(self, name: str) -> bool:
        """Switch to a different sheet"""
        if name in self._all_sheets:
            self._current_sheet_name = name
            self._current_dataframe = self._all_sheets[name]
            return True
        return False
    
    def get_sheets_info(self) -> List[Dict[str, Any]]:
        """Get information about all sheets"""
        sheets_info = []
        for sheet_name, sheet_df in self._all_sheets.items():
            sheets_info.append({
                "name": sheet_name,
                "rows": int(len(sheet_df)),
                "columns": int(len(sheet_df.columns)),
                "column_names": sheet_df.columns.tolist(),
                "is_current": sheet_name == self._current_sheet_name
            })
        return sheets_info
    
    def clear(self):
        """Clear all state"""
        self._current_dataframe = None
        self._all_sheets.clear()
        self._current_sheet_name = None
    
    def has_data(self) -> bool:
        """Check if any data is loaded"""
        return self._current_dataframe is not None


# Singleton instance
df_state = DataFrameState()
