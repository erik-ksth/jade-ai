"""Code execution service"""

import pandas as pd
from typing import Dict, Any, Optional, Tuple
from tools.code_executor import CodeExecutor


class ExecutionService:
    """Service for executing pandas code safely"""
    
    def __init__(self):
        self.executor = CodeExecutor()
    
    def execute_code(
        self,
        code: str,
        dataframe: pd.DataFrame
    ) -> Tuple[bool, Optional[str], Optional[str], Optional[Dict]]:
        """
        Execute pandas code with validation
        
        Args:
            code: Python code to execute
            dataframe: DataFrame to operate on
        
        Returns:
            Tuple of (success, print_output, error_message, chart_data)
        """
        # Validate code first
        is_safe, error_msg = self.executor.validate(code)
        if not is_safe:
            return (False, None, error_msg, None)
        
        # Execute code
        return self.executor.execute(code, dataframe)
    
    def validate_code(self, code: str) -> Tuple[bool, Optional[str]]:
        """
        Validate code for safety
        
        Args:
            code: Python code to validate
        
        Returns:
            Tuple of (is_safe, error_message)
        """
        return self.executor.validate(code)


# Singleton instance
execution_service = ExecutionService()
