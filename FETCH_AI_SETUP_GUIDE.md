# Fetch.ai Agentverse Setup Guide

Complete step-by-step guide to register and manage your Jade AI agents on Fetch.ai Agentverse for ASI (Artificial Superintelligence) integration.

---

## 📋 Prerequisites

Before you begin, ensure you have:
- ✅ Python 3.8+ installed
- ✅ `uagents` library installed (`pip install uagents`)
- ✅ A Fetch.ai account (we'll create this in Step 1)
- ✅ All 5 agents created in `backend/agents/` directory

---

## 🚀 Step 1: Create Fetch.ai Agentverse Account

### 1.1 Sign Up for Agentverse

1. **Visit Agentverse Portal**: Go to [https://agentverse.ai/](https://agentverse.ai/)
2. **Click "Sign Up"**: Use your email or social login
3. **Verify Email**: Check your inbox and verify your email address
4. **Complete Profile**: Fill in your profile information

### 1.2 Access Your Dashboard

Once logged in, you'll see:
- **My Agents** - List of your registered agents
- **Mailbox** - Communication hub for agents
- **Functions** - Register agent functions for DeltaV
- **Protocols** - View and manage agent protocols

---

## 🔑 Step 2: Get Your Agent Seeds and Addresses

### 2.1 Run Each Agent Locally First

Before registering on Agentverse, run each agent locally to get their addresses:

```bash
cd backend

# Terminal 1 - Data Ingestion Agent
python agents/data_ingestion_agent.py

# You'll see output like:
# INFO: [data_ingestion_agent]: data_ingestion_agent started successfully!
# INFO: [data_ingestion_agent]: Agent address: agent1q...
# INFO: [data_ingestion_agent]: Agent port: 8001
```

**IMPORTANT**: Copy the agent address (starts with `agent1q...`) for each agent!

### 2.2 Document Your Agent Information

Create a file `agent_addresses.txt` and save:

```
Data Ingestion Agent:
  - Name: data_ingestion_agent
  - Port: 8001
  - Address: agent1q... (copy from terminal)
  - Seed: data_ingestion_seed_phrase_123

Data Transformation Agent:
  - Name: data_transformation_agent
  - Port: 8002
  - Address: agent1q... (copy from terminal)
  - Seed: data_transformation_seed_phrase_456

AI Orchestrator Agent:
  - Name: ai_orchestrator_agent
  - Port: 8003
  - Address: agent1q... (copy from terminal)
  - Seed: ai_orchestrator_seed_phrase_789

Visualization Agent:
  - Name: visualization_agent
  - Port: 8004
  - Address: agent1q... (copy from terminal)
  - Seed: visualization_seed_phrase_012

State Management Agent:
  - Name: state_management_agent
  - Port: 8005
  - Address: agent1q... (copy from terminal)
  - Seed: state_management_seed_phrase_345
```

---

## 📮 Step 3: Register Agents on Agentverse (Mailbox Setup)

### 3.1 Access the Mailbox Section

1. Go to [https://agentverse.ai/mailroom](https://agentverse.ai/mailroom)
2. Click **"Create Mailbox"** or **"New Agent"**

### 3.2 Register Each Agent

For **EACH** of your 5 agents, follow these steps:

#### Agent 1: Data Ingestion Agent

1. **Click "New Agent"** in Agentverse
2. **Enter Agent Details**:
   - **Agent Name**: `data_ingestion_agent`
   - **Agent Address**: Paste the address you copied (starts with `agent1q...`)
   - **Description**: "Handles file upload, CSV/Excel parsing, and validation"
3. **Configure Mailbox**:
   - **Mailbox Type**: Select "HTTP Mailbox"
   - **Endpoint**: `http://localhost:8001/submit` (or your deployed URL)
4. **Click "Create"**

#### Agent 2: Data Transformation Agent

1. **Click "New Agent"**
2. **Enter Agent Details**:
   - **Agent Name**: `data_transformation_agent`
   - **Agent Address**: Paste the address
   - **Description**: "Executes pandas operations and data transformations"
3. **Configure Mailbox**:
   - **Endpoint**: `http://localhost:8002/submit`
4. **Click "Create"**

#### Agent 3: AI Orchestrator Agent

1. **Click "New Agent"**
2. **Enter Agent Details**:
   - **Agent Name**: `ai_orchestrator_agent`
   - **Agent Address**: Paste the address
   - **Description**: "Handles Groq integration, NLP, and code generation"
3. **Configure Mailbox**:
   - **Endpoint**: `http://localhost:8003/submit`
4. **Click "Create"**

#### Agent 4: Visualization Agent

1. **Click "New Agent"**
2. **Enter Agent Details**:
   - **Agent Name**: `visualization_agent`
   - **Agent Address**: Paste the address
   - **Description**: "Generates chart data and visualization configs"
3. **Configure Mailbox**:
   - **Endpoint**: `http://localhost:8004/submit`
4. **Click "Create"**

#### Agent 5: State Management Agent

1. **Click "New Agent"**
2. **Enter Agent Details**:
   - **Agent Name**: `state_management_agent`
   - **Agent Address**: Paste the address
   - **Description**: "Manages dataframe snapshots, undo/redo operations"
3. **Configure Mailbox**:
   - **Endpoint**: `http://localhost:8005/submit`
4. **Click "Create"**

---

## 🔗 Step 4: Update Agents with Mailbox Configuration

### 4.1 Get Mailbox API Keys

After registering each agent on Agentverse:

1. Go to your agent's detail page in Agentverse
2. Click on **"Mailbox Settings"** or **"API Keys"**
3. Copy the **Mailbox API Key** and **Mailbox Server URL**

### 4.2 Update Agent Code with Mailbox Keys

Update each agent file to include the mailbox configuration. Example for `data_ingestion_agent.py`:

```python
from uagents import Agent, Context, Protocol
from uagents.setup import fund_agent_if_low

AGENT_NAME = "data_ingestion_agent"
AGENT_PORT = 8001
AGENT_SEED = "data_ingestion_seed_phrase_123"

# Add mailbox configuration
MAILBOX_KEY = "your_mailbox_api_key_here"  # From Agentverse
MAILBOX_SERVER_URL = "https://agentverse.ai"  # Default

agent = Agent(
    name=AGENT_NAME,
    port=AGENT_PORT,
    seed=AGENT_SEED,
    endpoint=[f"http://localhost:{AGENT_PORT}/submit"],
    mailbox=f"{MAILBOX_KEY}@{MAILBOX_SERVER_URL}"
)

# Rest of the code...
```

Repeat this for all 5 agents with their respective mailbox keys.

---

## 🌐 Step 5: Make Agents Discoverable (DeltaV Integration)

### 5.1 Register Agent Functions

To make your agents discoverable by ASI/DeltaV:

1. **Go to "Functions" Tab** in Agentverse: [https://agentverse.ai/functions](https://agentverse.ai/functions)
2. **Click "Create Function"**

### 5.2 Register Each Agent's Capabilities

#### For Data Ingestion Agent:

1. **Function Name**: `upload_data_file`
2. **Description**: "Upload and parse CSV or Excel files for data analysis"
3. **Agent**: Select `data_ingestion_agent`
4. **Protocol**: `DataIngestion`
5. **Input Parameters**:
   ```json
   {
     "file": "file",
     "file_type": "string"
   }
   ```
6. **Output**: `parsed_data`
7. **Click "Create"**

#### For AI Orchestrator Agent:

1. **Function Name**: `analyze_data_with_ai`
2. **Description**: "Get AI-powered insights and code generation for data analysis"
3. **Agent**: Select `ai_orchestrator_agent`
4. **Protocol**: `AIOrchestratorProtocol`
5. **Input Parameters**:
   ```json
   {
     "query": "string",
     "data_context": "object"
   }
   ```
6. **Output**: `ai_response`
7. **Click "Create"**

Repeat similar steps for:
- **Data Transformation Agent** → `transform_data` function
- **Visualization Agent** → `create_chart` function
- **State Management Agent** → `manage_data_state` function

### 5.3 Verify Functions in DeltaV

1. Go to **DeltaV**: [https://deltav.agentverse.ai/](https://deltav.agentverse.ai/)
2. Search for your agent names or functions
3. Your agents should now be discoverable!

---

## 🧪 Step 6: Test Agent Communication

### 6.1 Test Local Communication

Create a test script `test_agents.py`:

```python
from uagents import Agent, Context
from uagents.query import query

async def test_agent():
    # Test Data Ingestion Agent
    response = await query(
        destination="agent1q...",  # Your agent address
        message={"test": "ping"},
        timeout=15.0
    )
    print(f"Response: {response}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(test_agent())
```

Run: `python test_agents.py`

### 6.2 Test via Agentverse

1. Go to your agent's page in Agentverse
2. Use the **"Test Message"** feature
3. Send a test message and verify response

---

## 🚀 Step 7: Deploy for Production

### 7.1 Update Endpoints for Production

For production deployment, update your agent endpoints:

```python
# Change from localhost to your server
endpoint=[f"https://your-domain.com/{AGENT_NAME}/submit"]
```

### 7.2 Deployment Options

#### Option A: Cloud Server (AWS, Google Cloud, Azure)

1. Deploy your backend on a cloud server
2. Ensure ports 8001-8005 are accessible
3. Update Agentverse mailbox endpoints with your server URL

#### Option B: Serverless (AWS Lambda, Google Cloud Functions)

1. Package each agent as a serverless function
2. Set up API Gateway endpoints
3. Update Agentverse with API Gateway URLs

#### Option C: Docker Container

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["python", "agents/data_ingestion_agent.py"]
```

Deploy to Docker Hub, AWS ECS, or Kubernetes.

### 7.3 Update Agentverse Mailbox Endpoints

1. Go to each agent in Agentverse
2. Click **"Edit"** or **"Settings"**
3. Update **"Endpoint"** from localhost to your production URL
4. Save changes

---

## 🔐 Step 8: Security Best Practices

### 8.1 Secure Your Seeds

**NEVER** commit your seed phrases to Git!

Create a `.env` file:
```bash
DATA_INGESTION_SEED="your_secure_seed_here"
DATA_TRANSFORMATION_SEED="your_secure_seed_here"
AI_ORCHESTRATOR_SEED="your_secure_seed_here"
VISUALIZATION_SEED="your_secure_seed_here"
STATE_MANAGEMENT_SEED="your_secure_seed_here"
```

Update agents to read from `.env`:
```python
import os
from dotenv import load_dotenv

load_dotenv()

AGENT_SEED = os.getenv("DATA_INGESTION_SEED")
```

### 8.2 Enable HTTPS

For production, always use HTTPS endpoints:
```python
endpoint=[f"https://your-domain.com/{AGENT_NAME}/submit"]
```

### 8.3 Implement Authentication

Add authentication to your agent endpoints using API keys or OAuth.

---

## 📊 Step 9: Monitor Your Agents

### 9.1 Agentverse Dashboard

Monitor your agents at: [https://agentverse.ai/agents](https://agentverse.ai/agents)

You can see:
- ✅ Agent status (online/offline)
- 📨 Message count
- ⏱️ Response times
- 🚨 Error logs

### 9.2 Set Up Alerts

In Agentverse:
1. Go to **"Settings"** → **"Notifications"**
2. Enable email/SMS alerts for:
   - Agent downtime
   - High error rates
   - Low balance alerts

---

## 🎯 Step 10: Using Your Agents with ASI

### 10.1 Access via DeltaV

1. Open DeltaV: [https://deltav.agentverse.ai/](https://deltav.agentverse.ai/)
2. Type queries like:
   - "Upload my sales data file"
   - "Analyze this dataset with AI"
   - "Create a bar chart of revenue by month"

### 10.2 Agent-to-Agent Communication

Your agents can now communicate with:
- Other Fetch.ai agents
- ASI services
- DeltaV marketplace agents

---

## 🆘 Troubleshooting

### Issue: Agent not appearing in Agentverse

**Solution**:
1. Verify agent is running: `ps aux | grep python`
2. Check agent address matches what you registered
3. Ensure endpoint is accessible (test with curl)

### Issue: "Mailbox connection failed"

**Solution**:
1. Verify mailbox API key is correct
2. Check internet connectivity
3. Ensure Agentverse is not down (check status page)

### Issue: "Agent offline" status

**Solution**:
1. Restart your agent
2. Check logs for errors
3. Verify endpoint URL is correct and accessible

### Issue: Functions not discoverable in DeltaV

**Solution**:
1. Ensure functions are marked as "Public" in Agentverse
2. Wait up to 5 minutes for indexing
3. Verify protocol names match exactly

---

## 📚 Additional Resources

- **Fetch.ai Documentation**: [https://docs.fetch.ai/](https://docs.fetch.ai/)
- **uAgents Guide**: [https://fetch.ai/docs/guides/agents](https://fetch.ai/docs/guides/agents)
- **Agentverse Tutorials**: [https://fetch.ai/docs/guides/agentverse](https://fetch.ai/docs/guides/agentverse)
- **DeltaV Documentation**: [https://fetch.ai/docs/concepts/ai-engine/deltav](https://fetch.ai/docs/concepts/ai-engine/deltav)
- **Community Discord**: [https://discord.gg/fetchai](https://discord.gg/fetchai)

---

## ✅ Checklist

Before going live, ensure:

- [ ] All 5 agents run successfully locally
- [ ] Agent addresses documented
- [ ] All agents registered on Agentverse
- [ ] Mailbox configurations updated
- [ ] Functions registered in DeltaV
- [ ] Agents discoverable via search
- [ ] Test messages sent and received
- [ ] Production endpoints configured
- [ ] HTTPS enabled
- [ ] Seeds secured in `.env`
- [ ] Monitoring and alerts set up
- [ ] Documentation updated

---

## 🎉 Success!

Your Jade AI agents are now:
- ✅ Running on Fetch.ai infrastructure
- ✅ Discoverable via ASI/DeltaV
- ✅ Using mailbox for reliable communication
- ✅ Ready for production use

Your agents can now participate in the Fetch.ai ecosystem and be discovered by users through DeltaV!

