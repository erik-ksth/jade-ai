import base64
import os
import re
from typing import Dict, Any, Optional, List
from google import genai
from google.genai import types

class AIAgent:
    def __init__(self):
        self.client = genai.Client(
            api_key="AIzaSyALhsQhFps702ucIbKAlsBEGcJ1s80peEk"
        )
        self.model = "gemma-3-27b-it"
    
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
        
        # Build conversation history
        contents = []
        
        # Add system context
        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=f"{system_prompt}\n\n{dataframe_context}")]
        ))
        
        # Add chat history if provided
        if chat_history:
            for msg in chat_history[-5:]:  # Keep last 5 messages for context
                role = "user" if msg["role"] == "user" else "model"
                contents.append(types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=msg["content"])]
                ))
        
        # Add current user message
        contents.append(types.Content(
            role="user",
            parts=[types.Part.from_text(text=user_message)]
        ))
        
        # Generate response
        try:
            response_text = ""
            for chunk in self.client.models.generate_content_stream(
                model=self.model,
                contents=contents,
                config=types.GenerateContentConfig()
            ):
                if chunk.text:
                    response_text += chunk.text
            
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