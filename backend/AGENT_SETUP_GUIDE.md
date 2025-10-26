# Multi-Agent Backend Setup Guide

This guide will help you set up and run the multi-agent backend system using uAgents (Fetch.ai) framework.

## Prerequisites

- Python 3.8 or higher
- pip (Python package manager)
- Groq API key (for AI processing)

## Step 1: Environment Setup

### 1.1 Create Virtual Environment
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 1.2 Install Dependencies
```bash
pip install -r requirements.txt
```

### 1.3 Set Environment Variables
Create a `.env` file in the backend directory:
```bash
# Required: Groq API Key
GROQ_API_KEY=your_groq_api_key_here
```

**Get your Groq API key:**
1. Visit [https://console.groq.com/](https://console.groq.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key and add it to your `.env` file

## Step 2: Agent Architecture Overview

The system consists of 5 specialized agents:

### 2.1 Data Ingestion Agent (Port 8001)
- **Purpose**: Handles file upload, CSV/Excel parsing, and validation
- **Responsibilities**:
  - Parse CSV and Excel files
  - Validate file formats
  - Extract sheet information
  - Return structured data

### 2.2 Data Transformation Agent (Port 8002)
- **Purpose**: Executes pandas operations and data transformations
- **Responsibilities**:
  - Execute pandas code safely
  - Handle data type conversions
  - Manage dataframe state
  - Return updated data

### 2.3 AI Orchestrator Agent (Port 8003)
- **Purpose**: Handles Groq integration, NLP, and code generation
- **Responsibilities**:
  - Process natural language queries
  - Generate pandas code
  - Provide AI-powered insights
  - Handle chat history

### 2.4 Visualization Agent (Port 8004)
- **Purpose**: Generates chart data and visualization configs
- **Responsibilities**:
  - Create Chart.js compatible data
  - Generate color palettes
  - Support multiple chart types
  - Validate chart configurations

### 2.5 State Management Agent (Port 8005)
- **Purpose**: Manages dataframe snapshots, undo/redo operations
- **Responsibilities**:
  - Create and restore snapshots
  - Handle sheet switching
  - Manage operation history
  - Maintain state consistency

## Step 3: Running the Agents

### 3.1 Start All Agents
```bash
cd backend
python agents/run_agents.py
```

This will start all 5 agents simultaneously. You should see output like:
```
=== Jade AI Multi-Agent System ===
Starting all agents...

=== Multi-Agent System Configuration ===
Network: local
Log Level: INFO
Environment Valid: True

=== Agent Configuration ===

data_ingestion_agent:
  Port: 8001
  Description: Handles file upload, CSV/Excel parsing, and validation

data_transformation_agent:
  Port: 8002
  Description: Executes pandas operations and data transformations

ai_orchestrator_agent:
  Port: 8003
  Description: Handles Groq integration, NLP, and code generation

visualization_agent:
  Port: 8004
  Description: Generates chart data and visualization configs

state_management_agent:
  Port: 8005
  Description: Manages dataframe snapshots, undo/redo operations

✅ Environment validation passed!

🚀 Starting agents...
Data Ingestion Agent initialized at agent1q...
Data Transformation Agent initialized at agent1q...
AI Orchestrator Agent initialized at agent1q...
Visualization Agent initialized at agent1q...
State Management Agent initialized at agent1q...
All agents started successfully
```

### 3.2 Run Individual Agents (Optional)
You can also run individual agents for testing:

```bash
# Data Ingestion Agent
python agents/data_ingestion_agent.py

# Data Transformation Agent
python agents/data_transformation_agent.py

# AI Orchestrator Agent
python agents/ai_orchestrator_agent.py

# Visualization Agent
python agents/visualization_agent.py

# State Management Agent
python agents/state_management_agent.py
```

## Step 4: Agent Communication

### 4.1 Message Flow
```
FastAPI Endpoints → Agents (via uAgents protocol) → Response back to FastAPI
```

### 4.2 Agent Addresses
Each agent has a unique address that can be used for direct communication:
- Data Ingestion: `agent1q...` (Port 8001)
- Data Transformation: `agent1q...` (Port 8002)
- AI Orchestrator: `agent1q...` (Port 8003)
- Visualization: `agent1q...` (Port 8004)
- State Management: `agent1q...` (Port 8005)

### 4.3 Message Types
The system uses structured message protocols:
- `FileUploadRequest/Response` - File processing
- `TransformDataRequest/Response` - Data transformations
- `AIQueryRequest/Response` - AI processing
- `CreateChartRequest/Response` - Chart generation
- `CreateSnapshotRequest/Response` - State management

## Step 5: Integration with FastAPI

### 5.1 Update main.py
The existing FastAPI endpoints will be updated to communicate with agents instead of handling logic directly. The API contract remains the same for frontend compatibility.

### 5.2 Agent Manager
The `AgentManager` class handles:
- Agent initialization
- Message routing
- Error handling
- Status monitoring

## Step 6: Testing the System

### 6.1 Health Check
```bash
# Check if agents are running
python -c "from agents.agent_manager import agent_manager; print(agent_manager.get_agent_status())"
```

### 6.2 Test Individual Agents
```bash
# Test data ingestion
python -c "
from agents.data_ingestion_agent import data_ingestion_agent
print('Data Ingestion Agent:', data_ingestion_agent.address)
"

# Test AI orchestrator
python -c "
from agents.ai_orchestrator_agent import ai_orchestrator_agent
print('AI Orchestrator Agent:', ai_orchestrator_agent.address)
"
```

## Step 7: Troubleshooting

### 7.1 Common Issues

**Issue**: `ModuleNotFoundError: No module named 'uagents'`
**Solution**: Make sure you're in the virtual environment and have installed requirements:
```bash
source venv/bin/activate
pip install -r requirements.txt
```

**Issue**: `Environment validation failed`
**Solution**: Check your `.env` file and ensure `GROQ_API_KEY` is set:
```bash
echo $GROQ_API_KEY  # Should show your API key
```

**Issue**: `Port already in use`
**Solution**: Check if agents are already running or change ports in `config/agent_config.py`

**Issue**: `Groq API error`
**Solution**: Verify your API key is valid and has sufficient credits

### 7.2 Logs and Debugging

Enable debug logging by setting in `.env`:
```
LOG_LEVEL=DEBUG
```

### 7.3 Agent Status
Check agent status:
```bash
python -c "
from agents.agent_manager import agent_manager
import json
print(json.dumps(agent_manager.get_agent_status(), indent=2))
"
```

## Step 8: Production Deployment

### 8.1 Environment Variables
For production, set this environment variable:
```bash
export GROQ_API_KEY="your_production_key"
```

### 8.2 Process Management
Use a process manager like `supervisor` or `systemd` to manage agent processes:

```ini
# /etc/supervisor/conf.d/jade-agents.conf
[program:jade-agents]
command=/path/to/backend/venv/bin/python /path/to/backend/agents/run_agents.py
directory=/path/to/backend
user=www-data
autostart=true
autorestart=true
stderr_logfile=/var/log/jade-agents.err.log
stdout_logfile=/var/log/jade-agents.out.log
```

## Step 9: Monitoring and Maintenance

### 9.1 Agent Health Monitoring
- Monitor agent uptime and response times
- Check for memory leaks in long-running processes
- Monitor Groq API usage and costs

### 9.2 Log Management
- Rotate logs regularly
- Monitor error logs for issues
- Set up alerts for critical errors

### 9.3 Performance Optimization
- Adjust `max_snapshots` based on memory usage
- Tune Groq model parameters for cost/performance balance
- Monitor agent communication latency

## Support

For issues or questions:
1. Check the logs for error messages
2. Verify environment configuration
3. Test individual agents
4. Check Groq API status and credits

The multi-agent system provides a robust, scalable foundation for data processing with clear separation of concerns and distributed processing capabilities.
