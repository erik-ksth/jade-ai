import base64
import os
import re
from typing import Dict, Any, Optional, List
import pandas as pd
import numpy as np
from groq import Groq

class AIAgent:
    def __init__(self):
        self.client = Groq(
            api_key=os.environ.get("GROQ_API_KEY")
        )
        # Available Groq models: llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768, gemma2-9b-it
        self.model = "openai/gpt-oss-20b"
    
    def _create_dataframe_context(self, df_info: Dict[str, Any]) -> str:
        """Create a context string describing the current dataframe"""
        if not df_info:
            return "No dataset is currently loaded."
        
        preview_data = df_info.get('preview', [])
        preview_str = str(preview_data) if preview_data else "No preview available"
        
        context = f"""
                    Current Dataset Information:
                    - Filename: {df_info.get('filename', 'Unknown')}
                    - Shape: {df_info.get('rows', 0)} rows × {df_info.get('columns', 0)} columns
                    - Columns: {', '.join(df_info.get('column_names', []))}
                    - Data Types: {df_info.get('dtypes', {})}

                    Sample Data (first 5 rows):
                    {preview_str}
                    """
        return context.strip()
    
    def _create_system_prompt(self) -> str:
        """Create the system prompt for the AI agent"""
        return """You are Jade AI, an expert data analysis assistant. Your role is to help users understand, clean, and analyze their datasets through natural conversation.

## Core Capabilities:
1. **Data Exploration**: Explain dataset structure, identify patterns, and answer questions about the data
2. **Data Cleaning**: Remove nulls, handle duplicates, standardize formats, fix data types
3. **Data Transformation**: Filter, group, aggregate, create new columns, merge datasets
4. **Data Analysis**: Generate insights, calculate statistics, create visualizations
5. **Chart Creation**: Generate charts and visualizations when users request them

## Response Format Requirements:
- **ALWAYS format your responses in proper Markdown**
- Use **bold text** for emphasis and important points
- Use *italic text* for subtle emphasis
- Use `inline code` for column names, values, and technical terms
- Use proper line breaks between paragraphs
- Use bullet points or numbered lists when appropriate
- Structure your responses with clear paragraphs

## Code Generation Rules:
- **Always wrap pandas code in markdown code blocks**: ```python
- **Include clear comments** explaining what each operation does
- **Use IN-PLACE operations whenever possible** - prefer `df.dropna(inplace=True)` over `df = df.dropna()`
- **NEVER use assignment with inplace=True** - use `df.dropna(inplace=True)` NOT `df = df.dropna(inplace=True)`
- **Modify the dataframe directly** using the `df` variable with in-place methods
- **Be specific and actionable** - provide code that can be executed immediately
- **Handle edge cases** - check for nulls, missing columns, data types

## Response Structure:
1. **Explain** what you're going to do and why (use proper markdown formatting)
2. **Provide code** in ```python blocks when data manipulation is needed
3. **Describe** the expected outcome of the operation

## Available Variables:
- `df`: the current dataframe
- `pd`: pandas library
- Always modify `df` using IN-PLACE operations (e.g., `df.dropna(inplace=True)`)
- NEVER assign the result of in-place operations back to df
- Use methods like: `df.dropna(inplace=True)`, `df.fillna(value, inplace=True)`, `df.drop_duplicates(inplace=True)`

## Chart Creation Instructions:
When a user requests to create a chart or visualization, you should:
1. **Identify the columns** they want to visualize
2. **Determine the chart type** based on the context and data:
   - **Bar Chart**: Compare categories (e.g., sales by product, quantity by item)
   - **Line Chart**: Show trends over time (e.g., revenue over months, performance over time)
   - **Area Chart**: Show cumulative trends with filled area
   - **Pie Chart**: Show proportions/percentages of a whole
   - **Doughnut Chart**: Like pie chart but with center cutout
   - **Scatter Chart**: Show correlation between two numeric variables
   - **Bubble Chart**: Show correlation with size representing a third dimension
   - **Radar Chart**: Show multiple metrics on radial axes
   - **Polar Area Chart**: Show data in circular segments
3. **Generate pandas code** that creates a variable called `chart_data_result` containing a dictionary with:
   - `type`: chart type ('line', 'bar', 'pie', 'doughnut', 'area', 'bubble', 'polarArea', 'radar', 'scatter')
   - `labels`: list of labels (usually from one column)
   - `data`: list of numeric values (from another column)
   - `label`: name/description of the data series
   - `title`: descriptive title for the chart

Examples:
```python
# Bar chart - comparing categories
chart_data_result = {
    'type': 'bar',
    'labels': df['Item'].tolist(),
    'data': df['Quantity'].tolist(),
    'label': 'Quantity by Item',
    'title': 'Item Quantity Chart'
}

# Line chart - trends over time
chart_data_result = {
    'type': 'line',
    'labels': df['Date'].tolist(),
    'data': df['Revenue'].tolist(),
    'label': 'Revenue Trend',
    'title': 'Revenue Over Time'
}

# Pie chart - proportions
chart_data_result = {
    'type': 'pie',
    'labels': df['Category'].tolist(),
    'data': df['Count'].tolist(),
    'label': 'Category Distribution',
    'title': 'Sales by Category'
}

# Scatter chart - correlation
chart_data_result = {
    'type': 'scatter',
    'labels': df['X_Column'].tolist(),
    'data': df['Y_Column'].tolist(),
    'label': 'X vs Y Correlation',
    'title': 'Relationship Analysis'
}
```

**IMPORTANT**: When creating charts, you MUST create a variable named exactly `chart_data_result` with the dictionary format shown above.

## Examples:
User: "Remove rows with missing values"
Response: "I'll help you **remove rows with missing values**. This will clean your dataset by eliminating incomplete records.

```python
# Count missing values before cleaning
print(f"Missing values per column: {df.isnull().sum()}")

# Remove rows with any missing values
df.dropna(inplace=True)

print(f"Dataset shape after cleaning: {df.shape}")
```

This operation removes any row that has at least one missing value. The cleaned dataframe will have complete data for analysis."

User: "Fill missing values with 0"
Response: "I'll **fill all missing values with 0** to preserve your data structure.

```python
# Fill missing values with 0
df.fillna(0, inplace=True)

print(f"Missing values after filling: {df.isnull().sum().sum()}")
```

This replaces all `NaN`/null values with `0` across the entire dataframe."

User: "Remove duplicate rows"
Response: "I'll **remove duplicate rows** from your dataset.

```python
# Remove duplicate rows
df.drop_duplicates(inplace=True)

print(f"Dataset shape after removing duplicates: {df.shape}")
```

This keeps only the first occurrence of each unique row combination."

**IMPORTANT**: 
- Always use in-place operations like `df.method(inplace=True)` and NEVER assign them back like `df = df.method(inplace=True)`
- **Format all responses in proper Markdown** with appropriate line breaks, bold text, and code formatting
- Be conversational, helpful, and always provide executable code when data manipulation is requested"""

    def assess_data_quality(self, df: pd.DataFrame, filename: str) -> Dict[str, Any]:
        """
        Analyze dataframe and generate comprehensive data quality report
        
        Returns:
            {
                "quality_score": float (0-100),
                "metrics": dict,
                "issues": list,
                "recommendations": list
            }
        """
        try:
            # Initialize metrics
            total_cells = df.shape[0] * df.shape[1]
            issues = []
            quality_factors = []
            
            # 1. Missing Values Analysis
            missing_count = int(df.isnull().sum().sum())  # Convert to Python int
            missing_percentage = (missing_count / total_cells * 100) if total_cells > 0 else 0
            missing_by_column = {col: int(count) for col, count in df.isnull().sum().to_dict().items()}  # Convert all to Python int
            
            if missing_percentage > 0:
                issues.append({
                    "type": "missing_values",
                    "severity": "high" if missing_percentage > 10 else "medium" if missing_percentage > 5 else "low",
                    "description": f"{missing_percentage:.2f}% of cells contain missing values",
                    "affected_columns": [col for col, count in missing_by_column.items() if count > 0]
                })
                quality_factors.append(max(0, 100 - missing_percentage * 2))
            else:
                quality_factors.append(100)
            
            # 2. Duplicate Rows Analysis
            duplicate_count = int(df.duplicated().sum())  # Convert to Python int
            duplicate_percentage = (duplicate_count / len(df) * 100) if len(df) > 0 else 0
            
            if duplicate_count > 0:
                issues.append({
                    "type": "duplicates",
                    "severity": "medium" if duplicate_percentage > 5 else "low",
                    "description": f"{duplicate_count} duplicate rows found ({duplicate_percentage:.2f}%)",
                    "count": int(duplicate_count)
                })
                quality_factors.append(max(0, 100 - duplicate_percentage * 3))
            else:
                quality_factors.append(100)
            
            # 3. Data Type Consistency
            inconsistent_types = []
            for col in df.columns:
                if df[col].dtype == 'object':
                    # Check if column should be numeric
                    non_null = df[col].dropna()
                    if len(non_null) > 0:
                        try:
                            pd.to_numeric(non_null, errors='raise')
                            inconsistent_types.append(col)
                        except:
                            pass
            
            if inconsistent_types:
                issues.append({
                    "type": "data_types",
                    "severity": "medium",
                    "description": f"{len(inconsistent_types)} columns may have incorrect data types",
                    "affected_columns": inconsistent_types
                })
                quality_factors.append(80)
            else:
                quality_factors.append(100)
            
            # 4. Empty Columns
            empty_columns = [col for col in df.columns if df[col].isnull().all()]
            
            if empty_columns:
                issues.append({
                    "type": "empty_columns",
                    "severity": "medium",
                    "description": f"{len(empty_columns)} columns are completely empty",
                    "affected_columns": empty_columns
                })
                quality_factors.append(70)
            else:
                quality_factors.append(100)
            
            # 5. Column Name Quality
            problematic_names = []
            for col in df.columns:
                if not col or col.strip() == '':
                    problematic_names.append(col)
                elif col.startswith('Unnamed:'):
                    problematic_names.append(col)
            
            if problematic_names:
                issues.append({
                    "type": "column_names",
                    "severity": "low",
                    "description": f"{len(problematic_names)} columns have unclear or missing names",
                    "affected_columns": problematic_names
                })
                quality_factors.append(85)
            else:
                quality_factors.append(100)
            
            # 6. Invalid/Error Values
            error_patterns = [
                'error', 'err', 'unknown', 'n/a', 'na', '#n/a', '#value', '#ref!', 
                '#div/0!', '#num!', '#name?', '#null!', 'null', 'none', 'undefined',
                '#value!', '#error', '####', 'invalid', 'missing', 'no data'
            ]
            
            error_columns = {}
            total_error_count = 0
            
            for col in df.columns:
                if df[col].dtype == 'object':  # Only check text columns
                    # Convert to lowercase for case-insensitive matching
                    col_values = df[col].astype(str).str.lower().str.strip()
                    
                    # Check for error patterns
                    error_mask = col_values.isin(error_patterns)
                    error_count = int(error_mask.sum())  # Convert to Python int
                    
                    if error_count > 0:
                        error_columns[col] = error_count
                        total_error_count += error_count
            
            if error_columns:
                error_percentage = (total_error_count / total_cells * 100) if total_cells > 0 else 0
                issues.append({
                    "type": "error_values",
                    "severity": "high" if error_percentage > 5 else "medium" if error_percentage > 1 else "low",
                    "description": f"{total_error_count} cells contain error/invalid values ({error_percentage:.2f}%)",
                    "affected_columns": list(error_columns.keys()),
                    "error_counts": error_columns
                })
                quality_factors.append(max(0, 100 - error_percentage * 2.5))
            else:
                quality_factors.append(100)
            
            # 7. Data Consistency (outliers for numeric columns)
            outlier_columns = []
            for col in df.columns:
                if pd.api.types.is_numeric_dtype(df[col]):
                    Q1 = df[col].quantile(0.25)
                    Q3 = df[col].quantile(0.75)
                    IQR = Q3 - Q1
                    outliers = int(((df[col] < (Q1 - 3 * IQR)) | (df[col] > (Q3 + 3 * IQR))).sum())  # Convert to Python int
                    if outliers > len(df) * 0.05:  # More than 5% outliers
                        outlier_columns.append(col)
            
            if outlier_columns:
                issues.append({
                    "type": "outliers",
                    "severity": "low",
                    "description": f"{len(outlier_columns)} columns contain potential outliers",
                    "affected_columns": outlier_columns
                })
                quality_factors.append(90)
            else:
                quality_factors.append(100)
            
            # Calculate overall quality score
            quality_score = sum(quality_factors) / len(quality_factors) if quality_factors else 0
            
            # Generate metrics summary
            metrics = {
                "total_rows": int(len(df)),
                "total_columns": int(len(df.columns)),
                "total_cells": int(total_cells),
                "missing_cells": int(missing_count),
                "missing_percentage": round(missing_percentage, 2),
                "duplicate_rows": int(duplicate_count),
                "duplicate_percentage": round(duplicate_percentage, 2),
                "empty_columns": len(empty_columns),
                "inconsistent_types": len(inconsistent_types),
                "error_values": total_error_count,
                "error_percentage": round((total_error_count / total_cells * 100) if total_cells > 0 else 0, 2)
            }
            
            return {
                "quality_score": round(quality_score, 1),
                "metrics": metrics,
                "issues": issues,
                "grade": self._get_quality_grade(quality_score)
            }
            
        except Exception as e:
            return {
                "quality_score": 0,
                "metrics": {},
                "issues": [{"type": "error", "severity": "high", "description": f"Error analyzing data: {str(e)}"}],
                "grade": "F"
            }
    
    def _get_quality_grade(self, score: float) -> str:
        """Convert quality score to letter grade"""
        if score >= 95:
            return "A+"
        elif score >= 90:
            return "A"
        elif score >= 85:
            return "B+"
        elif score >= 80:
            return "B"
        elif score >= 75:
            return "C+"
        elif score >= 70:
            return "C"
        elif score >= 60:
            return "D"
        else:
            return "F"
    
    def generate_improvement_suggestions(self, df: pd.DataFrame, quality_report: Dict[str, Any], filename: str) -> str:
        """
        Use AI to generate human-readable improvement suggestions based on quality report
        """
        try:
            # Build context about the dataset and issues
            issues_summary = "\n".join([
                f"- **{issue['type']}** ({issue['severity']} severity): {issue['description']}"
                for issue in quality_report.get('issues', [])
            ])
            
            if not issues_summary:
                issues_summary = "No significant issues detected!"
            
            metrics = quality_report.get('metrics', {})
            
            prompt = f"""You are analyzing a dataset called "{filename}".

**Data Quality Assessment Results:**
- Quality Score: {quality_report.get('quality_score', 0)}/100 (Grade: {quality_report.get('grade', 'N/A')})
- Total Rows: {metrics.get('total_rows', 0):,}
- Total Columns: {metrics.get('total_columns', 0)}
- Missing Values: {metrics.get('missing_percentage', 0)}%
- Duplicate Rows: {metrics.get('duplicate_rows', 0)} ({metrics.get('duplicate_percentage', 0)}%)
- Error Values: {metrics.get('error_values', 0)} ({metrics.get('error_percentage', 0)}%)

**Issues Found:**
{issues_summary}

Based on this analysis, provide:
1. A brief, friendly summary of the data quality (2-3 sentences)
2. Top 3-5 specific, actionable recommendations to improve the data quality
3. Priority order (what to fix first)

Format your response in clean Markdown with:
- Use **bold** for emphasis
- Use bullet points for recommendations
- Be specific and actionable
- Keep it concise and friendly"""

            # Generate AI response
            messages = [
                {"role": "system", "content": "You are a data quality expert providing helpful, actionable advice."},
                {"role": "user", "content": prompt}
            ]
            
            response_text = ""
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                stream=True,
                temperature=0.7,
                max_tokens=1000
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    response_text += chunk.choices[0].delta.content
            
            return response_text
            
        except Exception as e:
            return f"**Error generating suggestions:** {str(e)}"
    
    def generate_initial_assessment_message(self, df: pd.DataFrame, quality_report: Dict[str, Any], filename: str) -> str:
        """
        Generate a formatted initial AI message with quality assessment and suggestions
        """
        try:
            metrics = quality_report.get('metrics', {})
            quality_score = quality_report.get('quality_score', 0)
            grade = quality_report.get('grade', 'N/A')
            
            # Build header
            message = f"# 📊 Data Quality Assessment for `{filename}`\n\n"
            
            # Add quality score with visual indicator
            if quality_score >= 90:
                emoji = "🟢"
            elif quality_score >= 75:
                emoji = "🟡"
            elif quality_score >= 60:
                emoji = "🟠"
            else:
                emoji = "🔴"
            
            message += f"{emoji} **Quality Score: {quality_score}/100 (Grade {grade})**\n\n"
            
            # Add dataset overview
            message += "## Dataset Overview\n"
            message += f"- **Rows:** {metrics.get('total_rows', 0):,}\n"
            message += f"- **Columns:** {metrics.get('total_columns', 0)}\n"
            message += f"- **Total Cells:** {metrics.get('total_cells', 0):,}\n"
            message += f"- **Missing Values:** {metrics.get('missing_cells', 0):,} ({metrics.get('missing_percentage', 0)}%)\n"
            message += f"- **Error/Invalid Values:** {metrics.get('error_values', 0):,} ({metrics.get('error_percentage', 0)}%)\n"
            message += f"- **Duplicates:** {metrics.get('duplicate_rows', 0):,} rows\n\n"
            
            # Add issues if any
            issues = quality_report.get('issues', [])
            if issues:
                message += "## Issues Detected\n\n"
                
                # Group by severity
                high_issues = [i for i in issues if i.get('severity') == 'high']
                medium_issues = [i for i in issues if i.get('severity') == 'medium']
                low_issues = [i for i in issues if i.get('severity') == 'low']
                
                if high_issues:
                    message += "### 🔴 High Priority\n"
                    for issue in high_issues:
                        message += f"- **{issue['type'].replace('_', ' ').title()}**: {issue['description']}\n"
                    message += "\n"
                
                if medium_issues:
                    message += "### 🟡 Medium Priority\n"
                    for issue in medium_issues:
                        message += f"- **{issue['type'].replace('_', ' ').title()}**: {issue['description']}\n"
                    message += "\n"
                
                if low_issues:
                    message += "### 🟢 Low Priority\n"
                    for issue in low_issues:
                        message += f"- **{issue['type'].replace('_', ' ').title()}**: {issue['description']}\n"
                    message += "\n"
            else:
                message += "## ✨ Great News!\n\n"
                message += "No significant data quality issues detected! Your dataset looks clean and ready for analysis.\n\n"
            
            # Generate AI suggestions
            message += "## 💡 AI Recommendations\n\n"
            suggestions = self.generate_improvement_suggestions(df, quality_report, filename)
            message += suggestions + "\n\n"
            
            # Add helpful tip
            message += "---\n\n"
            message += "💬 **I'm here to help!** Feel free to ask me to:\n"
            message += "- Clean the data (remove nulls, duplicates, etc.)\n"
            message += "- Transform columns (rename, convert types, etc.)\n"
            message += "- Analyze patterns and generate insights\n"
            message += "- Create visualizations\n"
            
            return message
            
        except Exception as e:
            return f"**Error generating assessment message:** {str(e)}"

    def generate_response(self, user_message: str, df_info: Dict[str, Any] = None, chat_history: List[Dict] = None) -> Dict[str, Any]:
        """
        Generate AI response with dataframe context
        
        Returns:
            {
                "response": str,
                "pandas_code": Optional[str],
                "has_code": bool
            }
        """
        # Build the full message with context
        dataframe_context = self._create_dataframe_context(df_info)
        system_prompt = self._create_system_prompt()
        
        # Build conversation messages for Groq
        messages = []
        
        # Add system message with context
        messages.append({
            "role": "system",
            "content": f"{system_prompt}\n\n{dataframe_context}"
        })
        
        # Add chat history if provided
        if chat_history:
            for msg in chat_history[-5:]:  # Keep last 5 messages for context
                role = "user" if msg["role"] == "user" else "assistant"
                messages.append({
                    "role": role,
                    "content": msg["content"]
                })
        
        # Add current user message
        messages.append({
            "role": "user",
            "content": user_message
        })
        
        # Generate response
        try:
            response_text = ""
            stream = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                stream=True,
                temperature=0.7,
                max_tokens=2048
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    response_text += chunk.choices[0].delta.content
            
            # Extract pandas code from response
            pandas_code = self._extract_pandas_code(response_text)
            
            return {
                "response": response_text,
                "pandas_code": pandas_code,
                "has_code": pandas_code is not None
            }
            
        except Exception as e:
            return {
                "response": f"Error generating response: {str(e)}",
                "pandas_code": None,
                "has_code": False
            }
    
    def _extract_pandas_code(self, response: str) -> Optional[str]:
        """Extract pandas code from AI response using regex"""
        # Look for python code blocks
        pattern = r'```python\s*(.*?)\s*```'
        matches = re.findall(pattern, response, re.DOTALL)
        
        if matches:
            # Return the first (and usually only) code block
            code = matches[0].strip()
            return code if code else None
        
        return None

# Global instance
ai_agent = AIAgent()

def generate_ai_response(message: str, df_info: Dict[str, Any] = None, chat_history: List[Dict] = None) -> Dict[str, Any]:
    """Convenience function for backward compatibility"""
    return ai_agent.generate_response(message, df_info, chat_history)

if __name__ == "__main__":
    # Test the enhanced agent
    test_df_info = {
        "filename": "test.csv",
        "rows": 100,
        "columns": 3,
        "column_names": ["name", "age", "city"],
        "dtypes": {"name": "object", "age": "int64", "city": "object"},
        "preview": [
            {"name": "John", "age": 25, "city": "NYC"},
            {"name": "Jane", "age": 30, "city": "LA"}
        ]
    }
    
    result = generate_ai_response("Show me the data types", test_df_info)
    print("Response:", result["response"])
    print("Has code:", result["has_code"])
    if result["pandas_code"]:
        print("Code:", result["pandas_code"])