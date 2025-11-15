# LangGraph Workflow Architecture

This directory contains the LangGraph-based workflow orchestration for Jade AI's data operations.

## Architecture Overview

The system uses an **intent-based architecture** where user requests are classified and routed through specialized workflows:

```
User Request → Intent Classification → Workflow Execution → Response Generation
```

## Workflow Types

### 1. **Clean** - Data Cleaning Operations

- Removing duplicates, null values, or invalid data
- Fixing data types or formats
- Handling missing values
- Standardizing data

### 2. **Transform** - Data Transformation

- Creating new columns or features
- Aggregating or grouping data
- Filtering or selecting data
- Reshaping data (pivot, melt, etc.)

### 3. **Analyze** - Statistical Analysis

- Calculating statistics (mean, median, correlation, etc.)
- Finding patterns or trends
- Comparing groups
- Statistical tests

### 4. **Visualize** - Data Visualization

- Creating charts (bar, line, pie, scatter, etc.)
- Plotting data
- Visual comparisons

### 5. **Explore** - Data Exploration

- Viewing data structure
- Getting data summaries
- Understanding the dataset
- General questions about data

## Workflow Flow

```
┌─────────────────────┐
│  Classify Intent    │  ← Determines user's goal (Clean/Transform/Analyze/Visualize/Explore)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Generate Code      │  ← Creates pandas code based on intent
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Execute Code       │  ← Runs the code (if present)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Generate Response  │  ← Creates final response with narrative
└─────────────────────┘
```

## Key Features

### 🔄 Automatic Retry Logic

If code execution fails, the workflow automatically retries code generation up to 2 times with error context.

### 🎯 Intent-Based Routing

Uses LLM to classify user intent with confidence scoring, ensuring requests are handled by the appropriate workflow logic.

### 📊 Chart Data Handling

Automatically detects and formats chart data for Chart.js visualization.

### 📝 Narrative Generation

Generates human-friendly explanations of execution results and print outputs.

### ✅ State Management

Maintains comprehensive state throughout the workflow including:

- User input and chat history
- Dataframe context
- Intent classification
- Code generation and execution results
- Error handling and retry counts

## File Structure

```
workflows/
├── __init__.py                 # Module exports
├── README.md                   # This file
├── state.py                    # State models (WorkflowState, CleanWorkflowState, etc.)
├── orchestrator.py             # Main workflow graph and routing logic
└── nodes/
    ├── __init__.py             # Node exports
    ├── intent_classifier.py    # Intent classification node
    ├── code_generator.py       # Code generation node
    ├── code_executor.py        # Code execution node
    └── response_generator.py   # Response generation node
```

## Usage

The workflow is automatically invoked by the `/chat` endpoint:

```python
from workflows.orchestrator import workflow_graph
from workflows.state import WorkflowState

# Prepare initial state
initial_state: WorkflowState = {
    "user_message": "remove duplicates from the dataset",
    "chat_history": [],
    "df_info": df_state.get_info(),
    # ... other state fields
}

# Run workflow
final_state = workflow_graph.invoke(initial_state)

# Access results
response = final_state["ai_response"]
code = final_state["pandas_code"]
success = final_state["execution_success"]
```

## Extending the Workflow

To add new workflow types or customize behavior:

1. **Add new intent** in `state.py`:

   ```python
   class WorkflowIntent(str, Enum):
       CUSTOM = "custom"
   ```

2. **Update intent classifier** in `nodes/intent_classifier.py` to recognize the new intent

3. **Create custom state** (optional) in `state.py`:

   ```python
   class CustomWorkflowState(WorkflowState):
       custom_field: Optional[str]
   ```

4. **Add conditional routing** in `orchestrator.py` if needed

## Benefits Over Previous Architecture

✅ **Separation of Concerns** - Each node has a single responsibility  
✅ **Testability** - Nodes can be tested independently  
✅ **Observability** - Clear workflow execution path with logging  
✅ **Extensibility** - Easy to add new workflow types or nodes  
✅ **Error Recovery** - Built-in retry logic and error handling  
✅ **Type Safety** - Strongly typed state models

## Dependencies

- `langgraph==0.2.45` - Workflow orchestration framework
- `langchain-core==0.3.21` - Core LangChain functionality
- `langchain-groq==0.2.1` - Groq LLM integration
