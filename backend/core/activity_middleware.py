"""
Activity Tracking Middleware

This middleware logs user activity for all authenticated requests to enable
inactivity-based token expiration. It tracks when users make API calls and
logs this activity for the inactivity JWT strategy to use.
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import StreamingResponse
from typing import Callable, Optional
import time
from core.logging_system import get_logger
from routes.users import current_active_user
from fastapi import HTTPException


class ActivityTrackingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that tracks user activity for inactivity-based token expiration.
    
    This middleware logs all authenticated API requests to track user activity
    and enable the inactivity-based JWT strategy to determine if a user has
    been inactive for too long.
    """
    
    def __init__(self, app, exclude_paths: Optional[list[str]] = None):
        super().__init__(app)
        self.logger = get_logger()
        self.exclude_paths = exclude_paths or [
            "/docs",
            "/redoc", 
            "/openapi.json",
            "/api/logs",  # Don't track log viewing as activity
            "/favicon.ico",
            "/static",
            "/health"
        ]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """
        Process the request and log user activity if authenticated.
        
        Args:
            request: The incoming request
            call_next: The next middleware/endpoint to call
            
        Returns:
            The response from the next middleware/endpoint
        """
        start_time = time.time()
        
        # Check if this path should be excluded from activity tracking
        path = request.url.path
        if any(path.startswith(exclude) for exclude in self.exclude_paths):
            return await call_next(request)
        
        # Try to get the authenticated user
        user_id = None
        try:
            # Check if there's an authorization header
            auth_header = request.headers.get("Authorization")
            if auth_header and auth_header.startswith("Bearer "):
                # Try to get the current user (this will validate the token)
                # We'll do this in a try-catch to avoid breaking the request flow
                try:
                    # Import here to avoid circular imports
                    from routes.users import current_active_user
                    user = await current_active_user(request)
                    if user:
                        user_id = str(user.id)
                except HTTPException:
                    # Token is invalid or expired, but we don't want to break the flow
                    pass
        except Exception:
            # Any other error, continue without logging activity
            pass
        
        # Process the request
        response = await call_next(request)
        
        # Log user activity if authenticated
        if user_id:
            duration = time.time() - start_time
            
            # Log the activity
            self.logger.audit(
                f"API request: {request.method} {path}",
                operation=f"{request.method.lower()}_{path.replace('/', '_').strip('_')}",
                user_id=user_id,
                method=request.method,
                path=path,
                status_code=response.status_code,
                duration=duration,
                user_agent=request.headers.get("User-Agent", ""),
                ip_address=request.client.host if request.client else None
            )
        
        return response


def get_activity_middleware(exclude_paths: Optional[list[str]] = None):
    """
    Factory function to create the activity tracking middleware.
    
    Args:
        exclude_paths: List of paths to exclude from activity tracking
        
    Returns:
        ActivityTrackingMiddleware instance
    """
    return lambda app: ActivityTrackingMiddleware(app, exclude_paths) 