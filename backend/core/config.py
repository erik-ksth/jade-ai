"""Configuration settings for Jade AI backend"""

import os
from typing import List


class Settings:
    """Application settings"""
    
    # API Settings
    APP_TITLE: str = "Jade AI - Data Analytics API"
    APP_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    
    # CORS Settings
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]
    
    # Dataframe Settings
    MAX_FILE_SIZE_MB: int = 100
    
    # Groq API Settings
    GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")
    GROQ_MODEL: str = "openai/gpt-oss-20b"
    
    # File Processing
    SUPPORTED_FILE_EXTENSIONS: List[str] = [".csv", ".xlsx", ".xls"]
    
    # Security
    DANGEROUS_CODE_PATTERNS: List[str] = [
        "import os",
        "import sys",
        "__import__",
        "open(",
        "eval(",
        "compile(",
        "exec(",
        "subprocess",
        "pickle",
    ]


settings = Settings()
