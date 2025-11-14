"""Safe execution of pandas code"""

import pandas as pd
import io
from contextlib import redirect_stdout
from typing import Dict, Any, Optional, Tuple


class CodeExecutor:
    """Handles safe execution of pandas code"""
    
    @staticmethod
    def execute(
        code: str,
        dataframe: pd.DataFrame
    ) -> Tuple[bool, Optional[str], Optional[str], Optional[Dict]]:
        """
        Execute pandas code safely with output capture
        
        Args:
            code: Python code to execute
            dataframe: DataFrame to operate on
        
        Returns:
            Tuple of (success, print_output, error_message, chart_data)
        """
        try:
            # Validate dataframe exists
            if dataframe is None:
                return (False, None, "No dataframe provided for execution", None)
            
            # Capture stdout
            captured_output = io.StringIO()
            
            # Create execution context
            exec_context = {
                'pd': pd,
                'df': dataframe,
                'chart_data_result': None
            }
            
            # Execute code with captured output
            # Pass exec_context as both globals and locals so assignments work
            with redirect_stdout(captured_output):
                exec(code, exec_context, exec_context)
            
            # Get results
            print_output = captured_output.getvalue().strip()
            chart_data = exec_context.get('chart_data_result')
            
            return (
                True,
                print_output if print_output else None,
                None,
                chart_data
            )
            
        except Exception as e:
            return (False, None, str(e), None)
    
    @staticmethod
    def validate(code: str) -> Tuple[bool, Optional[str]]:
        """
        Validate code for basic safety checks
        
        Args:
            code: Python code to validate
        
        Returns:
            Tuple of (is_safe, error_message)
        """
        # Dangerous patterns to check
        dangerous_patterns = [
            'import os',
            'import sys',
            '__import__',
            'open(',
            'eval(',
            'compile(',
            'subprocess',
            'pickle',
        ]
        
        code_lower = code.lower()
        
        for pattern in dangerous_patterns:
            if pattern.lower() in code_lower:
                return (False, f"Potentially dangerous operation detected: {pattern}")
        
        return (True, None)
    
    @staticmethod
    def extract_imports(code: str) -> list:
        """Extract import statements from code"""
        imports = []
        for line in code.split('\n'):
            line = line.strip()
            if line.startswith('import ') or line.startswith('from '):
                imports.append(line)
        return imports
