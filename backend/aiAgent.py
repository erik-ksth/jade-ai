import os
import re
from typing import Dict, Any, Optional, List
import pandas as pd
from groq import Groq

class AIAgent:
    def __init__(self):
        self.client = Groq(
            api_key=os.environ.get("GROQ_API_KEY")
        )
        # Available Groq models: llama-3.3-70b-versatile, llama-3.1-8b-instant, mixtral-8x7b-32768, gemma2-9b-it
        self.model = "openai/gpt-oss-120b"
    
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
- **When creating tables, use proper Markdown table syntax:**
  - Each row must be on a separate line
  - Use pipes (|) to separate columns
  - Include a header separator row with dashes (---)
  - Example:
    ```
    | Column 1 | Column 2 | Column 3 |
    |----------|----------|----------|
    | Value 1  | Value 2  | Value 3  |
    | Value 4  | Value 5  | Value 6  |
    ```

## Code Generation Rules:
- **Always wrap pandas code in markdown code blocks**: ```python
- **Include clear comments** explaining what each operation does
- **Use IN-PLACE operations whenever possible** - prefer `df.dropna(inplace=True)` over `df = df.dropna()`
- **NEVER use assignment with inplace=True** - use `df.dropna(inplace=True)` NOT `df = df.dropna(inplace=True)`
- **Modify the dataframe directly** using the `df` variable with in-place methods
- **Be specific and actionable** - provide code that can be executed immediately
- **Handle edge cases** - check for nulls, missing columns, data types

## Response Structure (IMPORTANT - Follow This Format):

**For ALL data manipulation requests, structure your response EXACTLY like this:**

🤔 **Analyzing your request...**

[Brief 1-2 sentence explanation of what you understand the user wants]

⚙️ **Executing...**

```python
# Your pandas code here with comments
df.operation(inplace=True)
print(f"Result: {df.shape}")
```

✅ **Done!** [Brief summary of what was accomplished]

• Key metric or change 1
• Key metric or change 2
• Key metric or change 3

**Example:**

User: "remove the first row"

Your response:
🤔 **Analyzing your request...**

I need to remove the first row from your dataset.

⚙️ **Executing...**

```python
# Drop the first row (index 0)
df.drop(df.index[0], inplace=True)
print(f"New shape: {df.shape}")
print(f"First row is now: {df.iloc[0].to_dict()}")
```

✅ **Done!** I removed the first row from your dataset.

• Dataset: 8,158 → 8,157 rows
• First row is now: TXN_3977031 (Cake purchase)
• All data has been preserved except the removed row

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
    
    def assess_data_quality(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Assess data quality and return issues grouped by priority
        
        Returns:
            {
                "has_issues": bool,
                "quality_score": float (0-100),
                "issues": {
                    "high": [...],
                    "medium": [...],
                    "low": [...]
                }
            }
        """
        try:
            issues = {"high": [], "medium": [], "low": []}
            total_cells = df.shape[0] * df.shape[1]
            quality_factors = []
            
            # 1. Missing Values (HIGH priority if >5%)
            missing_count = int(df.isnull().sum().sum())
            missing_percentage = float((missing_count / total_cells * 100) if total_cells > 0 else 0)
            
            if missing_percentage > 5:
                issues["high"].append({
                    "type": "missing_values",
                    "description": f"{missing_percentage:.1f}% of cells contain missing values",
                    "count": missing_count,
                    "affected_columns": [col for col in df.columns if df[col].isnull().any()]
                })
                quality_factors.append(max(0, 100 - missing_percentage * 2))
            elif missing_percentage > 0:
                issues["medium"].append({
                    "type": "missing_values",
                    "description": f"{missing_percentage:.1f}% of cells contain missing values",
                    "count": missing_count,
                    "affected_columns": [col for col in df.columns if df[col].isnull().any()]
                })
                quality_factors.append(90)
            else:
                quality_factors.append(100)
            
            # 2. Duplicate Rows (MEDIUM priority if >5%)
            duplicate_count = int(df.duplicated().sum())
            duplicate_percentage = (duplicate_count / len(df) * 100) if len(df) > 0 else 0
            
            if duplicate_percentage > 5:
                issues["medium"].append({
                    "type": "duplicates",
                    "description": f"{duplicate_count} duplicate rows ({duplicate_percentage:.1f}%)",
                    "count": duplicate_count
                })
                quality_factors.append(max(0, 100 - duplicate_percentage * 3))
            elif duplicate_count > 0:
                issues["low"].append({
                    "type": "duplicates",
                    "description": f"{duplicate_count} duplicate rows ({duplicate_percentage:.1f}%)",
                    "count": duplicate_count
                })
                quality_factors.append(95)
            else:
                quality_factors.append(100)
            
            # 3. Empty Columns (HIGH priority)
            empty_columns = [col for col in df.columns if df[col].isnull().all()]
            if empty_columns:
                issues["high"].append({
                    "type": "empty_columns",
                    "description": f"{len(empty_columns)} columns are completely empty",
                    "affected_columns": empty_columns
                })
                quality_factors.append(70)
            else:
                quality_factors.append(100)
            
            # 4. Data Type Issues (MEDIUM priority)
            type_issues = []
            for col in df.columns:
                if df[col].dtype == 'object':
                    non_null = df[col].dropna()
                    if len(non_null) > 0:
                        try:
                            pd.to_numeric(non_null, errors='raise')
                            type_issues.append(col)
                        except:
                            pass
            
            if type_issues:
                issues["medium"].append({
                    "type": "data_types",
                    "description": f"{len(type_issues)} columns may have incorrect data types",
                    "affected_columns": type_issues
                })
                quality_factors.append(85)
            else:
                quality_factors.append(100)
            
            # 5. Problematic Column Names (LOW priority)
            problematic_names = [col for col in df.columns 
                               if not col or col.strip() == '' or col.startswith('Unnamed:')]
            if problematic_names:
                issues["low"].append({
                    "type": "column_names",
                    "description": f"{len(problematic_names)} columns have unclear names",
                    "affected_columns": problematic_names
                })
                quality_factors.append(90)
            else:
                quality_factors.append(100)
            
            # Calculate overall quality score
            quality_score = sum(quality_factors) / len(quality_factors) if quality_factors else 0
            
            # Check if there are any issues
            has_issues = bool(issues["high"] or issues["medium"] or issues["low"])
            
            return {
                "has_issues": has_issues,
                "quality_score": float(round(quality_score, 1)),
                "issues": issues,
                "total_rows": int(len(df)),
                "total_columns": int(len(df.columns))
            }
            
        except Exception as e:
            return {
                "has_issues": False,
                "quality_score": 0,
                "issues": {"high": [], "medium": [], "low": []},
                "error": str(e)
            }

# Global instance
ai_agent = AIAgent()
