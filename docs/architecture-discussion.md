# Jade AI - Architecture Discussion & Improvement Plan

> **Date**: January 14, 2026  
> **Status**: In Progress

---

## Overview

This document captures ongoing discussions about improving Jade AI's architecture, focusing on transforming it into a more robust BI-style analytics platform similar to Power BI or Tableau.

---

## 1. Dashboard Redesign

### Current State

- Free-form canvas with drag/resize (react-rnd)
- Chart.js for visualizations
- Static charts generated from pandas code
- Text and box elements for annotations

### Target State (BI-Style)

- Grid-based tile layout with snap-to-grid
- Interactive charts with cross-filtering
- Global slicers/filters affecting all visuals
- Drill-down capabilities
- Rich tooltips with additional metrics
- Save/load dashboard configurations

### Proposed Stack Changes

| Component     | Current                    | Proposed                           |
| ------------- | -------------------------- | ---------------------------------- |
| Layout        | react-rnd (free-form)      | react-grid-layout (grid tiles)     |
| Charts        | Chart.js / react-chartjs-2 | ECharts / echarts-for-react        |
| State         | Local component state      | Centralized filter state (Zustand) |
| Interactivity | None                       | Cross-filtering, drill-down        |

### Key Features to Implement

- [ ] Cross-filtering between charts
- [ ] Global slicer/filter components
- [ ] Grid-based dashboard layout
- [ ] Drill-down navigation
- [ ] Rich interactive tooltips

---

## 2. Multi-User & Persistence (Scalable Architecture)

### Current Problems

- `df_state` is a Python singleton — all users share the same dataframe
- Everything is in-memory — restart = data loss
- No user authentication or session isolation

### Target Architecture

#### Database Layer

| Component            | Technology           | Purpose                                        |
| -------------------- | -------------------- | ---------------------------------------------- |
| **Primary DB**       | PostgreSQL           | Users, sessions, metadata, dashboard configs   |
| **Cache**            | Redis                | Session state, hot data, pub/sub for real-time |
| **Object Storage**   | S3 / MinIO           | Uploaded files, exported Parquet files         |
| **Analytics Engine** | DuckDB (per-request) | Fast analytical queries on Parquet             |

#### Data Model (PostgreSQL)

```sql
-- Users & Auth
users (id, email, password_hash, created_at)
sessions (id, user_id, created_at, expires_at)

-- Projects & Files
projects (id, user_id, name, created_at)
datasets (id, project_id, name, storage_path, row_count, columns_json, created_at)
dataset_versions (id, dataset_id, version, storage_path, created_at, pandas_code)

-- Dashboards
dashboards (id, project_id, name, layout_json, created_at)
dashboard_widgets (id, dashboard_id, type, config_json, position_json)
dashboard_filters (id, dashboard_id, column, filter_type, default_value)

-- Chat & AI
chat_sessions (id, project_id, created_at)
chat_messages (id, chat_session_id, role, content, pandas_code, created_at)
```

#### Storage Strategy

```
uploads/
  {user_id}/
    {project_id}/
      original/
        {dataset_id}.{ext}      # Original uploaded file
      versions/
        {dataset_id}_v1.parquet # After transformations
        {dataset_id}_v2.parquet
```

#### Session-Based State Management

```python
# Replace singleton with session-scoped state
class SessionDataStore:
    def __init__(self, redis_client, s3_client):
        self.redis = redis_client
        self.s3 = s3_client

    async def get_dataframe(self, session_id: str, dataset_id: str) -> pd.DataFrame:
        # 1. Check Redis cache
        cache_key = f"df:{session_id}:{dataset_id}"
        cached = await self.redis.get(cache_key)
        if cached:
            return pd.read_parquet(io.BytesIO(cached))

        # 2. Load from S3/storage
        path = await self.get_storage_path(dataset_id)
        df = pd.read_parquet(path)

        # 3. Cache for future requests
        await self.redis.setex(cache_key, 3600, df.to_parquet())
        return df

    async def save_dataframe(self, session_id: str, dataset_id: str, df: pd.DataFrame):
        # 1. Save to S3
        # 2. Create new version record
        # 3. Update Redis cache
        # 4. Invalidate related caches
```

#### API Changes

```python
# All endpoints require authentication
@app.post("/chat")
async def chat(
    request: ChatRequest,
    session: Session = Depends(get_current_session),  # Auth middleware
    db: Database = Depends(get_db),
    data_store: SessionDataStore = Depends(get_data_store)
):
    # Load user's dataframe, not global singleton
    df = await data_store.get_dataframe(session.id, request.dataset_id)

    # Execute workflow with user-scoped state
    result = await workflow.invoke({
        "dataframe": df,
        "session_id": session.id,
        ...
    })

    # Persist changes
    if result.data_updated:
        await data_store.save_dataframe(session.id, request.dataset_id, result.df)
```

#### Real-Time Updates (WebSocket + Redis Pub/Sub)

```
User A edits dashboard → Save to DB → Publish to Redis channel
                                    ↓
                         Redis broadcasts to all subscribers
                                    ↓
                         User B's WebSocket receives update → UI refreshes
```

### Infrastructure

```
                    ┌─────────────────┐
                    │   Load Balancer │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐          ┌────▼────┐          ┌────▼────┐
   │ API Pod │          │ API Pod │          │ API Pod │
   └────┬────┘          └────┬────┘          └────┬────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             │
        ┌──────────┬─────────┼─────────┬──────────┐
        │          │         │         │          │
   ┌────▼────┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌────▼────┐
   │PostgreSQL│ │ Redis │ │  S3   │ │DuckDB │ │ Worker  │
   │ (Primary)│ │(Cache)│ │(Files)│ │(Query)│ │ (Async) │
   └──────────┘ └───────┘ └───────┘ └───────┘ └─────────┘
```

### Migration Path

1. **Phase 1**: Add PostgreSQL + basic auth (users, sessions)
2. **Phase 2**: Move file storage to S3, dataframes to Parquet
3. **Phase 3**: Add Redis caching layer
4. **Phase 4**: Replace singleton with SessionDataStore
5. **Phase 5**: Add real-time collaboration via WebSocket

---

## 3. Open Questions

1. **Auth provider**: Build custom or use Auth0/Clerk/Supabase Auth?
2. **Hosting**: Self-hosted (K8s) or managed (AWS/GCP/Vercel)?
3. **Collaboration**: Real-time multi-user editing on same dashboard?
4. **Billing**: Any plans for usage-based pricing (storage, API calls)?

---

## 4. Discussion Notes

_Add notes from ongoing discussions below:_

---

## Next Steps

1. Finalize dashboard requirements (BI-style redesign)
2. Choose auth strategy
3. Set up PostgreSQL schema + migrations
4. Implement session-based data store
5. Add S3/MinIO for file storage
6. Migrate from singleton to multi-user architecture
