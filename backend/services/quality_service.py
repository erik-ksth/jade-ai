"""Data quality assessment service"""

import pandas as pd
from typing import Dict, Any
from aiAgent import ai_agent


class QualityService:
    """Service for data quality assessment and reporting"""
    
    def __init__(self):
        self.ai_agent = ai_agent
    
    def assess(self, df: pd.DataFrame, filename: str) -> Dict[str, Any]:
        """
        Assess data quality of a dataframe
        
        Args:
            df: DataFrame to assess
            filename: Name of the file
        
        Returns:
            Quality report dictionary
        """
        return self.ai_agent.assess_data_quality(df, filename)
    
    def generate_message(
        self,
        df: pd.DataFrame,
        quality_report: Dict[str, Any],
        filename: str
    ) -> str:
        """
        Generate formatted assessment message
        
        Args:
            df: DataFrame that was assessed
            quality_report: Quality report from assessment
            filename: Name of the file
        
        Returns:
            Formatted markdown message
        """
        return self.ai_agent.generate_initial_assessment_message(
            df,
            quality_report,
            filename
        )


# Singleton instance
quality_service = QualityService()
