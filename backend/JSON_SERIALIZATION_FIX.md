# JSON Serialization Fix for Timestamp Objects

## Problem

When pandas datetime operations created `Timestamp` objects in the dataframe, the API routes failed with:

```
TypeError: Object of type Timestamp is not JSON serializable
```

This occurred when:

- Converting Transaction Date to datetime
- Creating Month/Year columns from datetime
- Any operation that produces pandas Timestamp objects

## Root Cause

The API routes were directly calling `df.to_dict(orient="records")` which doesn't handle pandas `Timestamp` objects. These need to be converted to strings before JSON serialization.

## Solution

### 1. Created Shared Utility Function

**File:** `/backend/api/utils.py`

```python
def dataframe_to_json_safe(df: pd.DataFrame) -> dict:
    """Convert dataframe to JSON-safe dictionary"""
    df_copy = df.copy()

    # Convert datetime/Timestamp columns to ISO format strings
    for col in df_copy.columns:
        if pd.api.types.is_datetime64_any_dtype(df_copy[col]):
            df_copy[col] = df_copy[col].apply(
                lambda x: x.isoformat() if pd.notna(x) else None
            )
        # Handle other non-serializable types in object columns
        elif df_copy[col].dtype == 'object':
            df_copy[col] = df_copy[col].apply(
                lambda x: str(x) if isinstance(x, (datetime, date, pd.Timestamp)) else x
            )

    return {
        "data": df_copy.to_dict(orient="records"),
        "columns": df.columns.tolist(),
        "rows": int(len(df)),
        "dtypes": {str(k): str(v) for k, v in df.dtypes.to_dict().items()}
    }
```

### 2. Updated All API Routes

**Files Modified:**

- `/backend/api/routes/chat_routes.py` - Both `/chat` and `/chat/stream` endpoints
- `/backend/api/routes/upload_routes.py` - `/upload` endpoint
- `/backend/api/routes/data_routes.py` - `/switch-sheet` and `/execute-pandas` endpoints

**Changes:**

- Replaced direct `to_dict()` calls with `dataframe_to_json_safe()`
- Imported shared utility function
- Removed duplicate code

### 3. How It Works

**Before (Broken):**

```python
"data": df.to_dict(orient="records")  # ❌ Fails with Timestamp
```

**After (Fixed):**

```python
json_safe_data = dataframe_to_json_safe(df)
"data": json_safe_data["data"]  # ✅ Timestamps converted to ISO strings
```

**Example Conversion:**

```python
# Original Timestamp
Timestamp('2023-01-15 10:30:00')

# Converted to ISO string
"2023-01-15T10:30:00"
```

## Benefits

1. **Handles All Datetime Types:**

   - `pandas.Timestamp`
   - `datetime.datetime`
   - `datetime.date`
   - `numpy.datetime64`

2. **Preserves Data:**

   - Uses ISO format (standard, reversible)
   - Handles NaT/None values correctly
   - Doesn't modify original dataframe

3. **Centralized Solution:**

   - Single utility function
   - Easy to maintain
   - Consistent across all endpoints

4. **Future-Proof:**
   - Handles object columns with mixed types
   - Can be extended for other non-serializable types

## Testing

The fix resolves the error for operations like:

```python
# Convert to datetime
df['Transaction Date'] = pd.to_datetime(df['Transaction Date'], errors='coerce')

# Extract date components
df['Month'] = df['Transaction Date'].dt.month
df['Year'] = df['Transaction Date'].dt.year
```

These operations now work without JSON serialization errors.

## Files Created/Modified

**Created:**

- `/backend/api/utils.py` - New utility module

**Modified:**

- `/backend/api/routes/chat_routes.py`
- `/backend/api/routes/upload_routes.py`
- `/backend/api/routes/data_routes.py`

All changes are backward compatible and the server will auto-reload.
