# Logging Routes

Logging routes provide API endpoints for accessing and managing the logging system.

## Overview

The logging routes module handles log retrieval, export, performance metrics, and logging system management. Users can view logs, export them, and get performance metrics through these endpoints.

## Key Endpoints

### Log Retrieval
- `GET /api/logs/recent` - Get recent logs with optional filtering
- `GET /api/logs/categories` - Get all available log categories
- `GET /api/logs/stats` - Get logging statistics

### Log Export
- `POST /api/logs/export` - Export logs to JSON file
- `DELETE /api/logs/clear` - Clear the in-memory log buffer

### Performance Monitoring
- `GET /api/logs/performance` - Get performance metrics
- `GET /api/logs/health` - Check logging system health

## Usage Examples

### Getting Recent Logs
```python
import requests

# Get recent logs
response = requests.get("http://localhost:8000/api/logs/recent")
logs = response.json()

# Get logs filtered by category
response = requests.get("http://localhost:8000/api/logs/recent?category=ERROR&limit=50")
error_logs = response.json()

# Get logs for specific user
response = requests.get("http://localhost:8000/api/logs/recent?user_id=user123")
user_logs = response.json()
```

### Exporting Logs
```python
# Export logs from last 24 hours
response = requests.post("http://localhost:8000/api/logs/export?hours=24")
with open("logs_export.json", "wb") as f:
    f.write(response.content)

# Export error logs only
response = requests.post("http://localhost:8000/api/logs/export?category=ERROR&hours=48")
```

### Getting Performance Metrics
```python
response = requests.get("http://localhost:8000/api/logs/performance")
metrics = response.json()
print(f"Average response time: {metrics['metrics']['avg_response_time']}")
```

## Log Categories

Available log categories:
- **AUDIT**: User actions and system access
- **OPERATION**: General operations and workflows
- **DEBUG**: Debugging information
- **ERROR**: Error messages and exceptions
- **SECURITY**: Security-related events
- **PERFORMANCE**: Performance metrics and timing
- **ATOMIC**: Atomic operation logs
- **SYSTEM**: System-level events

## Error Handling

- `200` - Success
- `400` - Invalid parameters (e.g., invalid category)
- `500` - Internal server error

## Dependencies

- Logging system core module
- File system operations
- Performance monitoring utilities 