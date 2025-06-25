"""
NDF Studio Logging System

This module provides comprehensive logging capabilities for the NDF Studio backend,
including audit trails, debugging, and operational transparency.

Features:
- Multiple log categories (AUDIT, OPERATION, DEBUG, ERROR, SECURITY)
- File-based logging with rotation
- User display capabilities
- Structured logging with timestamps
- Atomic operation tracking
- Performance monitoring
"""

import logging
import logging.handlers
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, List
from enum import Enum
import threading
from contextlib import contextmanager
import time
import traceback

# Log Categories
class LogCategory(Enum):
    AUDIT = "AUDIT"           # User actions, data changes, CRUD operations
    OPERATION = "OPERATION"   # System operations, API calls, business logic
    DEBUG = "DEBUG"           # Debugging information, variable states
    ERROR = "ERROR"           # Errors, exceptions, failures
    SECURITY = "SECURITY"     # Authentication, authorization, security events
    PERFORMANCE = "PERFORMANCE"  # Performance metrics, timing information
    ATOMIC = "ATOMIC"         # Atomic operation tracking, transactions
    SYSTEM = "SYSTEM"         # System events, startup, shutdown

class NDFLogger:
    """
    Centralized logging system for NDF Studio
    """
    
    def __init__(self, user_id: str = "system", log_dir: str = "logs"):
        self.user_id = user_id
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(exist_ok=True)
        
        # Initialize loggers for each category
        self.loggers: Dict[LogCategory, logging.Logger] = {}
        self._setup_loggers()
        
        # User display buffer
        self.display_buffer: List[Dict[str, Any]] = []
        self.buffer_lock = threading.Lock()
        self.max_buffer_size = 1000
        
        # Performance tracking
        self.performance_metrics: Dict[str, List[float]] = {}
        self.metrics_lock = threading.Lock()
    
    def _setup_loggers(self):
        """Setup individual loggers for each category"""
        for category in LogCategory:
            logger = logging.getLogger(f"ndf.{category.value.lower()}")
            logger.setLevel(logging.DEBUG)
            
            # Prevent duplicate handlers
            if logger.handlers:
                continue
            
            # Create formatter
            formatter = logging.Formatter(
                '%(asctime)s | %(name)s | %(levelname)s | %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            
            # File handler with rotation
            log_file = self.log_dir / f"{category.value.lower()}.log"
            file_handler = logging.handlers.RotatingFileHandler(
                log_file,
                maxBytes=10*1024*1024,  # 10MB
                backupCount=5
            )
            file_handler.setLevel(logging.DEBUG)
            file_handler.setFormatter(formatter)
            
            # Console handler for critical logs
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setLevel(logging.INFO)
            console_handler.setFormatter(formatter)
            
            logger.addHandler(file_handler)
            logger.addHandler(console_handler)
            
            self.loggers[category] = logger
    
    def _log(self, category: LogCategory, level: int, message: str, **kwargs):
        """Internal logging method"""
        # Create structured log entry
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": self.user_id,
            "category": category.value,
            "message": message,
            **kwargs
        }
        
        # Log to file
        logger = self.loggers[category]
        log_message = json.dumps(log_entry, default=str)
        logger.log(level, log_message)
        
        # Add to display buffer for user visibility
        with self.buffer_lock:
            self.display_buffer.append(log_entry)
            if len(self.display_buffer) > self.max_buffer_size:
                self.display_buffer.pop(0)
    
    def audit(self, message: str, operation: str = None, resource: str = None, 
              user_id: str = None, **kwargs):
        """Log audit events (user actions, data changes)"""
        self._log(LogCategory.AUDIT, logging.INFO, message,
                  operation=operation, resource=resource, user_id=user_id, **kwargs)
    
    def operation(self, message: str, operation: str = None, duration: float = None,
                  **kwargs):
        """Log system operations"""
        self._log(LogCategory.OPERATION, logging.INFO, message,
                  operation=operation, duration=duration, **kwargs)
    
    def debug(self, message: str, **kwargs):
        """Log debug information"""
        self._log(LogCategory.DEBUG, logging.DEBUG, message, **kwargs)
    
    def error(self, message: str, error: Exception = None, **kwargs):
        """Log errors and exceptions"""
        error_info = {}
        if error:
            error_info = {
                "error_type": type(error).__name__,
                "error_message": str(error),
                "traceback": traceback.format_exc()
            }
        self._log(LogCategory.ERROR, logging.ERROR, message,
                  error=error_info, **kwargs)
    
    def security(self, message: str, event_type: str = None, **kwargs):
        """Log security events"""
        self._log(LogCategory.SECURITY, logging.WARNING, message,
                  event_type=event_type, **kwargs)
    
    def performance(self, message: str, metric_name: str = None, value: float = None,
                   **kwargs):
        """Log performance metrics"""
        self._log(LogCategory.PERFORMANCE, logging.INFO, message,
                  metric_name=metric_name, value=value, **kwargs)
        
        # Store metric for analysis
        if metric_name and value is not None:
            with self.metrics_lock:
                if metric_name not in self.performance_metrics:
                    self.performance_metrics[metric_name] = []
                self.performance_metrics[metric_name].append(value)
    
    def atomic(self, message: str, transaction_id: str = None, operation: str = None,
               **kwargs):
        """Log atomic operations"""
        self._log(LogCategory.ATOMIC, logging.INFO, message,
                  transaction_id=transaction_id, operation=operation, **kwargs)
    
    def system(self, message: str, event_type: str = None, **kwargs):
        """Log system events"""
        self._log(LogCategory.SYSTEM, logging.INFO, message,
                  event_type=event_type, **kwargs)
    
    @contextmanager
    def performance_timer(self, operation_name: str):
        """Context manager for timing operations"""
        start_time = time.time()
        try:
            yield
        finally:
            duration = time.time() - start_time
            self.performance(f"Operation completed", 
                           metric_name=operation_name, 
                           value=duration,
                           operation=operation_name)
    
    def get_recent_logs(self, category: Optional[LogCategory] = None, 
                       limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent logs for user display"""
        with self.buffer_lock:
            logs = self.display_buffer.copy()
        
        if category:
            logs = [log for log in logs if log.get("category") == category.value]
        
        return logs[-limit:] if limit else logs
    
    def get_performance_metrics(self, metric_name: Optional[str] = None) -> Dict[str, Any]:
        """Get performance metrics"""
        with self.metrics_lock:
            if metric_name:
                values = self.performance_metrics.get(metric_name, [])
                return {
                    "metric": metric_name,
                    "count": len(values),
                    "average": sum(values) / len(values) if values else 0,
                    "min": min(values) if values else 0,
                    "max": max(values) if values else 0,
                    "values": values[-100:]  # Last 100 values
                }
            else:
                return {
                    name: {
                        "count": len(values),
                        "average": sum(values) / len(values) if values else 0,
                        "min": min(values) if values else 0,
                        "max": max(values) if values else 0
                    }
                    for name, values in self.performance_metrics.items()
                }
    
    def clear_buffer(self):
        """Clear the display buffer"""
        with self.buffer_lock:
            self.display_buffer.clear()
    
    def export_logs(self, category: Optional[LogCategory] = None, 
                   start_time: Optional[datetime] = None,
                   end_time: Optional[datetime] = None) -> str:
        """Export logs to a file"""
        export_file = self.log_dir / f"export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        logs = self.get_recent_logs(category)
        
        # Filter by time if specified
        if start_time or end_time:
            filtered_logs = []
            for log in logs:
                log_time = datetime.fromisoformat(log["timestamp"].replace('Z', '+00:00'))
                if start_time and log_time < start_time:
                    continue
                if end_time and log_time > end_time:
                    continue
                filtered_logs.append(log)
            logs = filtered_logs
        
        with open(export_file, 'w') as f:
            json.dump(logs, f, indent=2, default=str)
        
        return str(export_file)

# Global logger instance
_global_logger: Optional[NDFLogger] = None

def get_logger(user_id: str = "system") -> NDFLogger:
    """Get the global logger instance"""
    global _global_logger
    if _global_logger is None:
        _global_logger = NDFLogger(user_id)
    return _global_logger

def set_user_id(user_id: str):
    """Set the current user ID for logging"""
    global _global_logger
    if _global_logger:
        _global_logger.user_id = user_id

# Convenience functions for quick logging
def log_audit(message: str, **kwargs):
    """Quick audit logging"""
    get_logger().audit(message, **kwargs)

def log_operation(message: str, **kwargs):
    """Quick operation logging"""
    get_logger().operation(message, **kwargs)

def log_error(message: str, error: Exception = None, **kwargs):
    """Quick error logging"""
    get_logger().error(message, error, **kwargs)

def log_atomic(message: str, **kwargs):
    """Quick atomic operation logging"""
    get_logger().atomic(message, **kwargs)

def log_performance(message: str, **kwargs):
    """Quick performance logging"""
    get_logger().performance(message, **kwargs) 