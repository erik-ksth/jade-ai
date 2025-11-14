"""File parsing and loading service"""

import pandas as pd
import io
from typing import Dict, Tuple


class FileService:
    """Handles file parsing and loading operations"""
    
    @staticmethod
    def parse_csv(content: bytes) -> pd.DataFrame:
        """
        Parse CSV file content into DataFrame
        
        Args:
            content: Raw file bytes
        
        Returns:
            Parsed DataFrame
        """
        df = pd.read_csv(
            io.BytesIO(content),
            dtype=str,
            keep_default_na=False
        )
        # Replace empty strings with None for consistency
        return df.replace('', None)
    
    @staticmethod
    def parse_excel(content: bytes) -> Dict[str, pd.DataFrame]:
        """
        Parse Excel file and return all sheets
        
        Args:
            content: Raw file bytes
        
        Returns:
            Dictionary of {sheet_name: DataFrame}
        """
        excel_file = pd.ExcelFile(io.BytesIO(content))
        sheets = {}
        
        for sheet_name in excel_file.sheet_names:
            sheet_df = pd.read_excel(
                excel_file,
                sheet_name=sheet_name,
                dtype=str,
                keep_default_na=False
            )
            # Replace empty strings with None for consistency
            sheets[sheet_name] = sheet_df.replace('', None)
        
        return sheets
    
    @staticmethod
    def validate_file_extension(filename: str) -> bool:
        """
        Check if file extension is supported
        
        Args:
            filename: Name of the file
        
        Returns:
            True if supported, False otherwise
        """
        return filename.endswith(('.csv', '.xlsx', '.xls'))
    
    @staticmethod
    def is_csv(filename: str) -> bool:
        """
        Check if file is CSV format
        
        Args:
            filename: Name of the file
        
        Returns:
            True if CSV, False otherwise
        """
        return filename.endswith('.csv')
    
    @staticmethod
    def get_file_type(filename: str) -> str:
        """
        Get file type from filename
        
        Args:
            filename: Name of the file
        
        Returns:
            File type ('csv', 'excel', or 'unknown')
        """
        if filename.endswith('.csv'):
            return 'csv'
        elif filename.endswith(('.xlsx', '.xls')):
            return 'excel'
        return 'unknown'


# Singleton instance
file_service = FileService()
