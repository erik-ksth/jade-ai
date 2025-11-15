"""
Quality Assessor Node
Assesses data quality and identifies issues that need to be fixed
"""

from typing import Dict, Any
from core.state import df_state
from aiAgent import ai_agent


class QualityAssessor:
    """Assesses data quality and returns issues grouped by priority"""
    
    def assess(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Assess current dataframe quality
        
        Returns updated state with quality assessment
        """
        try:
            # Get current dataframe
            df = df_state.current_dataframe
            
            if df is None:
                return {
                    **state,
                    "quality_assessment": {
                        "has_issues": False,
                        "quality_score": 0,
                        "issues": {"high": [], "medium": [], "low": []},
                        "error": "No dataframe loaded"
                    }
                }
            
            # Assess quality
            assessment = ai_agent.assess_data_quality(df)
            
            # Add to state
            return {
                **state,
                "quality_assessment": assessment
            }
            
        except Exception as e:
            return {
                **state,
                "quality_assessment": {
                    "has_issues": False,
                    "quality_score": 0,
                    "issues": {"high": [], "medium": [], "low": []},
                    "error": str(e)
                }
            }


# Singleton instance
quality_assessor = QualityAssessor()
