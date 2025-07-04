"""
Activity Tracking Middleware

This middleware logs user activity for authenticated requests to enable
inactivity-based token expiration. It tracks when users make API calls and
logs this activity for the inactivity JWT strategy to use.
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import StreamingResponse
from typing import Callable, Optional
import time
from backend.core.logging_system import get_logger
from backend.routes.users import current_active_user
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
        
        # Define CUD operations that should be logged for users
        self.cud_operations = {
            "POST": "created",
            "PUT": "updated", 
            "PATCH": "updated",
            "DELETE": "deleted"
        }
        
        # Define user-friendly operation names
        self.user_friendly_operations = {
            # Node operations
            "post_nodes": "Created node",
            "put_nodes": "Updated node", 
            "delete_nodes": "Deleted node",
            
            # Graph operations
            "post_graphs": "Created graph",
            "put_graphs": "Updated graph",
            "delete_graphs": "Deleted graph",
            
            # Relation operations
            "post_relations": "Added relation",
            "put_relations": "Updated relation",
            "delete_relations": "Deleted relation",
            
            # Attribute operations
            "post_attributes": "Added attribute",
            "put_attributes": "Updated attribute", 
            "delete_attributes": "Deleted attribute",
            
            # Transition operations
            "post_transitions": "Created transition",
            "put_transitions": "Updated transition",
            "delete_transitions": "Deleted transition",
            
            # Function operations
            "post_functions": "Created function",
            "put_functions": "Updated function",
            "delete_functions": "Deleted function",
            
            # Schema operations
            "post_node_types": "Created node type",
            "put_node_types": "Updated node type",
            "delete_node_types": "Deleted node type",
            
            "post_relation_types": "Created relation type",
            "put_relation_types": "Updated relation type", 
            "delete_relation_types": "Deleted relation type",
            
            "post_attribute_types": "Created attribute type",
            "put_attribute_types": "Updated attribute type",
            "delete_attribute_types": "Deleted attribute type",
            
            # Morph operations
            "post_morphs": "Created morph",
            "put_morphs": "Updated morph",
            "delete_morphs": "Deleted morph",
            
            # CNL operations
            "post_cnl": "Updated CNL",
            "put_cnl": "Updated CNL",
            
            # Preferences
            "put_preferences": "Updated preferences",
            
            # Authentication
            "post_auth_login": "Logged in",
            "post_auth_logout": "Logged out",
            "post_auth_register": "Registered account"
        }
    
    def _should_log_request(self, method: str, path: str) -> bool:
        """
        Determine if this request should be logged for user activity.
        Only log CUD operations (Create, Update, Delete) and exclude read operations.
        """
        # Only log CUD operations
        if method not in self.cud_operations:
            return False
            
        # Exclude certain paths that are not user actions
        exclude_patterns = [
            "/api/logs",
            "/api/health", 
            "/health",
            "/docs",
            "/redoc",
            "/openapi.json",
            "/static",
            "/favicon.ico"
        ]
        
        for pattern in exclude_patterns:
            if path.startswith(pattern):
                return False
                
        return True
    
    def _get_user_friendly_message(self, method: str, path: str) -> str:
        """
        Convert technical API calls to user-friendly messages.
        """
        # Extract operation from path
        path_parts = path.strip('/').split('/')
        
        # Handle different path patterns
        if len(path_parts) >= 3:
            # For paths like /api/ndf/users/{user_id}/graphs/{graph_id}/nodes
            # or /api/ndf/users/{user_id}/graphs/{graph_id}/nodes/{node_id}
            if path_parts[1] == 'ndf' and len(path_parts) >= 6:
                # Extract the resource type (nodes, relations, etc.)
                resource = path_parts[-2] if path_parts[-1].isdigit() else path_parts[-1]
                
                # Create operation key
                operation_key = f"{method.lower()}_{resource}"
                
                # Get user-friendly message
                if operation_key in self.user_friendly_operations:
                    return self.user_friendly_operations[operation_key]
            
            # For auth paths like /api/auth/login
            elif path_parts[1] == 'auth' and len(path_parts) >= 3:
                auth_action = path_parts[-1]
                operation_key = f"{method.lower()}_auth_{auth_action}"
                
                if operation_key in self.user_friendly_operations:
                    return self.user_friendly_operations[operation_key]
            
            # For other paths, try to extract resource from the end
            resource = path_parts[-1] if path_parts[-1] else path_parts[-2]
            
            # Create operation key
            operation_key = f"{method.lower()}_{resource}"
            
            # Get user-friendly message
            if operation_key in self.user_friendly_operations:
                return self.user_friendly_operations[operation_key]
            
            # Fallback: create generic message
            action = self.cud_operations.get(method, "modified")
            return f"{action.title()} {resource.replace('_', ' ')}"
        
        # Fallback for unknown operations
        action = self.cud_operations.get(method, "modified")
        return f"{action.title()} item"
    
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
                    from backend.routes.users import current_active_user
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
        
        # Log user activity if authenticated and this is a CUD operation
        if user_id and self._should_log_request(request.method, path):
            duration = time.time() - start_time
            
            # Get user-friendly message
            user_message = self._get_user_friendly_message(request.method, path)
            
            # Log the activity with user-friendly language
            self.logger.audit(
                user_message,
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