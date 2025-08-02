# Summary Queue Monitoring and Debugging Solution

## 🎯 **Problem Statement**

The user reported that:
1. UI shows "submitted" when clicking "Get Summary (OpenAI)"
2. Server returns summary but it's not applied to the node
3. Need to check pending requests in the queue

## 🔍 **Root Cause Analysis**

### ✅ **What We've Discovered**

1. **Queue Status**: Currently empty (0 pending requests)
2. **API Issue**: Endpoint returns 404 "Node not found" despite:
   - Direct `load_node()` calls working perfectly
   - File exists and is readable
   - Node has no description (ready for summary)

3. **Environment Difference**: 
   - **Direct tests**: Run from `backend/` directory
   - **API server**: Runs from project root with `PYTHONPATH="$(pwd)/backend"`

### 🐛 **Core Issue**

The API endpoint is failing to load nodes due to **working directory and Python path differences** between the test environment and the API server environment.

## 📊 **Monitoring Tools Created**

### 1. **Queue Monitoring Script** (`backend/monitor_summary_queue.py`)
```bash
python backend/monitor_summary_queue.py
```
**Output:**
```
🔍 Summary Queue Monitor
==================================================
✅ Summary queue initialized
📊 Current queue size: 0
✅ No pending requests in queue

📁 Checking test nodes...
📄 Node: testnode_nodescription
   Has description: ❌ No
   Status: Ready for summary generation
```

### 2. **Queue Submission Test** (`backend/test_queue_submission.py`)
```bash
python backend/test_queue_submission.py
```
**Monitors queue changes in real-time when submitting requests**

### 3. **API Endpoint Debugging** (`backend/debug_api_endpoint.py`)
```bash
python backend/debug_api_endpoint.py
```
**Step-by-step debugging of the exact API endpoint logic**

### 4. **API Environment Test** (`backend/test_api_environment.py`)
```bash
python backend/test_api_environment.py
```
**Simulates the exact API server environment**

## 🎯 **Solution: Queue Monitoring Endpoint**

### Added API Endpoint: `GET /api/ndf/summary_queue/status`

```python
@router.get("/summary_queue/status")
def get_summary_queue_status():
    """Get the current status of the summary queue"""
    try:
        sq = init_summary_queue()
        queue_size = sq.queue_size()
        return {
            "queue_size": queue_size,
            "status": "active" if queue_size > 0 else "idle",
            "message": f"Queue has {queue_size} pending requests" if queue_size > 0 else "No pending requests"
        }
    except Exception as e:
        return {
            "queue_size": 0,
            "status": "error",
            "message": f"Error accessing queue: {str(e)}"
        }
```

### Usage:
```bash
curl http://localhost:8000/api/ndf/summary_queue/status
```

**Expected Response:**
```json
{
  "queue_size": 0,
  "status": "idle",
  "message": "No pending requests"
}
```

## 🔧 **How to Monitor the Queue**

### 1. **Check Queue Status**
```bash
# Via API endpoint
curl http://localhost:8000/api/ndf/summary_queue/status

# Via monitoring script
python backend/monitor_summary_queue.py
```

### 2. **Monitor in Real-Time**
```bash
# Watch queue changes
watch -n 2 'curl -s http://localhost:8000/api/ndf/summary_queue/status | jq'

# Or use the monitoring script
python backend/monitor_summary_queue.py
```

### 3. **Check Backend Logs**
Look for these patterns in the backend logs:
```
[SummaryQueue] Processing node: testnode_nodescription
[SummaryQueue] Summary for testnode_nodescription: ...
[SummaryQueue] Saved summary for testnode_nodescription to disk.
[SummaryQueue] Failed to persist summary for testnode_nodescription: ...
```

## 🚀 **Proper Service Startup**

### Always use the provided scripts:
```bash
# From project root
cd /home/nagarjun/dev/nodeBook
source python_env/bin/activate

# Start backend
./scripts/start_backend.sh

# Start frontend (in another terminal)
./scripts/start_frontend.sh
```

### Verify services are running:
```bash
# Check backend
curl http://localhost:8000/api/health

# Check frontend
curl http://localhost:5173

# Check queue status
curl http://localhost:8000/api/ndf/summary_queue/status
```

## 🐛 **Troubleshooting Steps**

### 1. **If Queue Shows 0 Requests**
- Check if API endpoint is working: `curl -X POST http://localhost:8000/api/ndf/users/testuser123/graphs/testgraph/nodes/testnode_nodescription/submit_to_summary_queue`
- Check backend logs for errors
- Verify node file exists: `ls -la graph_data/users/testuser123/nodes/`

### 2. **If API Returns 404**
- Restart backend using proper script: `./scripts/start_backend.sh`
- Check working directory and Python path
- Verify node file exists and is readable

### 3. **If Summary Not Applied to Node**
- Check backend logs for `[SummaryQueue]` messages
- Verify OpenAI API key is configured
- Check if node file is writable

### 4. **If Services Not Starting**
- Kill existing processes: `pkill -f uvicorn && pkill -f vite`
- Activate virtual environment: `source python_env/bin/activate`
- Use startup scripts from project root

## 📋 **Quick Commands Reference**

```bash
# Monitor queue status
curl http://localhost:8000/api/ndf/summary_queue/status

# Check backend health
curl http://localhost:8000/api/health

# Submit test request
curl -X POST http://localhost:8000/api/ndf/users/testuser123/graphs/testgraph/nodes/testnode_nodescription/submit_to_summary_queue

# Monitor queue in real-time
watch -n 2 'curl -s http://localhost:8000/api/ndf/summary_queue/status'

# Check backend logs
tail -f /path/to/backend/logs  # (if logs are written to file)
```

## 🎯 **Next Steps**

1. **Restart backend properly** using the startup script
2. **Test the queue monitoring endpoint**
3. **Submit a test request** and monitor queue changes
4. **Check backend logs** for summary processing messages
5. **Verify summary is applied** to the node file

The monitoring infrastructure is now in place. The main issue appears to be the API endpoint not working due to environment differences, which should be resolved by using the proper startup scripts. 