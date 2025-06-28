"""
Logging API Routes

This module provides API endpoints for accessing and managing the logging system.
Users can view logs, export them, and get performance metrics.
"""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse, FileResponse
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta, timezone
from pathlib import Path
import json
import os

from backend.core.logging_system import get_logger, LogCategory

router = APIRouter(prefix="/api/logs", tags=["logging"])

@router.get("/recent")
def get_recent_logs(
    category: Optional[str] = Query(None, description="Filter by log category"),
    limit: int = Query(100, ge=1, le=1000, description="Number of logs to return"),
    user_id: Optional[str] = Query(None, description="Filter by user ID")
):
    """
    Get recent logs with optional filtering by category and user ID.
    
    Categories: AUDIT, OPERATION, DEBUG, ERROR, SECURITY, PERFORMANCE, ATOMIC, SYSTEM
    """
    try:
        logger = get_logger()
        
        # Parse category if provided
        log_category = None
        if category:
            try:
                log_category = LogCategory(category.upper())
            except ValueError:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid category. Must be one of: {[c.value for c in LogCategory]}"
                )
        
        # Get logs
        logs = logger.get_recent_logs(category=log_category, limit=limit)
        
        # Filter by user_id if provided
        if user_id:
            logs = [log for log in logs if log.get("user_id") == user_id]
        
        return {
            "logs": logs,
            "count": len(logs),
            "category": category,
            "user_id": user_id,
            "limit": limit
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve logs: {str(e)}")

@router.get("/categories")
def get_log_categories():
    """Get all available log categories"""
    return {
        "categories": [
            {
                "name": category.value,
                "description": category.name,
                "color": _get_category_color(category)
            }
            for category in LogCategory
        ]
    }

@router.get("/performance")
def get_performance_metrics(
    metric_name: Optional[str] = Query(None, description="Specific metric to retrieve")
):
    """Get performance metrics"""
    try:
        logger = get_logger()
        metrics = logger.get_performance_metrics(None if metric_name is None else metric_name)
        
        return {
            "metrics": metrics,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve metrics: {str(e)}")

@router.post("/export")
def export_logs(
    category: Optional[str] = Query(None, description="Filter by log category"),
    hours: int = Query(24, ge=1, le=168, description="Export logs from last N hours"),
    user_id: Optional[str] = Query(None, description="Filter by user ID")
):
    """
    Export logs to a JSON file.
    
    Returns a downloadable file with the exported logs.
    """
    try:
        logger = get_logger()
        
        # Calculate time range
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours)
        
        # Parse category if provided
        log_category = None
        if category:
            try:
                log_category = LogCategory(category.upper())
            except ValueError:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid category. Must be one of: {[c.value for c in LogCategory]}"
                )
        
        # Export logs
        export_file = logger.export_logs(
            category=log_category,
            start_time=start_time,
            end_time=end_time
        )
        
        # Filter by user_id if provided
        if user_id:
            with open(export_file, 'r') as f:
                logs = json.load(f)
            
            filtered_logs = [log for log in logs if log.get("user_id") == user_id]
            
            # Write filtered logs back to file
            with open(export_file, 'w') as f:
                json.dump(filtered_logs, f, indent=2)
        
        # Return the file for download
        return FileResponse(
            export_file,
            media_type="application/json",
            filename=f"ndf_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export logs: {str(e)}")

@router.delete("/clear")
def clear_log_buffer():
    """Clear the in-memory log buffer"""
    try:
        logger = get_logger()
        logger.clear_buffer()
        
        return {
            "status": "success",
            "message": "Log buffer cleared",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear buffer: {str(e)}")

@router.get("/stats")
def get_log_statistics():
    """Get logging statistics"""
    try:
        logger = get_logger()
        logs = logger.get_recent_logs()
        
        # Calculate statistics
        stats = {
            "total_logs": len(logs),
            "by_category": {},
            "by_user": {},
            "recent_activity": {
                "last_hour": 0,
                "last_24_hours": 0,
                "last_week": 0
            }
        }
        
        now = datetime.now(timezone.utc)
        one_hour_ago = now - timedelta(hours=1)
        one_day_ago = now - timedelta(days=1)
        one_week_ago = now - timedelta(weeks=1)
        
        for log in logs:
            # Category stats
            category = log.get("category", "UNKNOWN")
            stats["by_category"][category] = stats["by_category"].get(category, 0) + 1
            
            # User stats
            user = log.get("user_id", "UNKNOWN")
            stats["by_user"][user] = stats["by_user"].get(user, 0) + 1
            
            # Time-based stats
            log_time = datetime.fromisoformat(log["timestamp"].replace('Z', '+00:00'))
            if log_time > one_hour_ago:
                stats["recent_activity"]["last_hour"] += 1
            if log_time > one_day_ago:
                stats["recent_activity"]["last_24_hours"] += 1
            if log_time > one_week_ago:
                stats["recent_activity"]["last_week"] += 1
        
        return {
            "statistics": stats,
            "timestamp": now.isoformat()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")

@router.get("/health")
def get_logging_health():
    """Get logging system health status"""
    try:
        logger = get_logger()
        
        # Check if log directory exists and is writable
        log_dir = logger.log_dir
        health_status = {
            "status": "healthy",
            "log_directory": str(log_dir),
            "directory_exists": log_dir.exists(),
            "directory_writable": os.access(log_dir, os.W_OK) if log_dir.exists() else False,
            "buffer_size": len(logger.display_buffer),
            "max_buffer_size": logger.max_buffer_size,
            "timestamp": datetime.now().isoformat()
        }
        
        # Check for any issues
        issues = []
        if not log_dir.exists():
            issues.append("Log directory does not exist")
        elif not os.access(log_dir, os.W_OK):
            issues.append("Log directory is not writable")
        
        if issues:
            health_status["status"] = "unhealthy"
            health_status["issues"] = issues
        
        return health_status
        
    except Exception as e:
        return {
            "status": "error",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

def _get_category_color(category: LogCategory) -> str:
    """Get color for log category display"""
    colors = {
        LogCategory.AUDIT: "#2563eb",      # Blue
        LogCategory.OPERATION: "#059669",  # Green
        LogCategory.DEBUG: "#7c3aed",      # Purple
        LogCategory.ERROR: "#dc2626",      # Red
        LogCategory.SECURITY: "#ea580c",   # Orange
        LogCategory.PERFORMANCE: "#0891b2", # Cyan
        LogCategory.ATOMIC: "#be185d",     # Pink
        LogCategory.SYSTEM: "#6b7280"      # Gray
    }
    return colors.get(category, "#6b7280") 