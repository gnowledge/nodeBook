"""
Custom JWT Strategy with Inactivity-Based Token Expiration

This module implements a custom JWT strategy that extends the standard JWT strategy
to include inactivity-based token expiration. Instead of using a fixed expiration time,
tokens are considered expired if the user has been inactive for more than a specified
duration (default: 20 minutes).

The strategy checks the user's recent activity by examining audit and operation logs
to determine if they have been active within the inactivity threshold.
"""

import jwt
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, Union
from fastapi_users.authentication import JWTStrategy
from fastapi_users.jwt import SecretType, decode_jwt, generate_jwt
from backend.core.logging_system import get_logger, LogCategory
import json


class InactivityJWTStrategy(JWTStrategy):
    """
    Custom JWT Strategy that implements inactivity-based token expiration.
    
    This strategy extends the standard JWT strategy to check user activity
    from logs rather than relying solely on a fixed expiration time.
    """
    
    def __init__(
        self,
        secret: SecretType,
        lifetime_seconds: Optional[int] = 3600,  # Default 1 hour max lifetime
        inactivity_threshold_minutes: int = 20,  # Default 20 minutes inactivity
        token_audience: list[str] = ["fastapi-users:auth"],
        algorithm: str = "HS256",
        public_key: Optional[SecretType] = None,
    ):
        super().__init__(
            secret=secret,
            lifetime_seconds=lifetime_seconds,
            token_audience=token_audience,
            algorithm=algorithm,
            public_key=public_key,
        )
        self.inactivity_threshold_minutes = inactivity_threshold_minutes
        self.logger = get_logger()
    
    async def write_token(self, user) -> str:
        """
        Generate a JWT token with current timestamp for inactivity tracking.
        
        Args:
            user: The user object
            
        Returns:
            JWT token string
        """
        # Add current timestamp to track when token was issued
        data = {
            "sub": str(user.id),
            "aud": self.token_audience,
            "issued_at": datetime.now(timezone.utc).isoformat(),  # For inactivity tracking
        }
        
        return generate_jwt(
            data, self.encode_key, self.lifetime_seconds, algorithm=self.algorithm
        )
    
    async def read_token(
        self, token: Optional[str], user_manager
    ) -> Optional[Any]:
        """
        Validate JWT token and check for user inactivity.
        
        Args:
            token: JWT token string
            user_manager: User manager object
            
        Returns:
            User object if token is valid and user is active, None otherwise
        """
        if token is None:
            return None

        try:
            # First, decode the token to get basic JWT validation
            data = decode_jwt(
                token, self.decode_key, self.token_audience, algorithms=[self.algorithm]
            )
            
            user_id = data.get("sub")
            if user_id is None:
                return None
            
            # Get the user object
            try:
                parsed_id = user_manager.parse_id(user_id)
                user = await user_manager.get(parsed_id)
            except Exception:
                return None
            
            # Check if user has been inactive for too long
            if not self._is_user_active(user_id):
                self.logger.security(
                    f"Token rejected due to user inactivity",
                    event_type="token_inactivity_expiry",
                    user_id=user_id,
                    inactivity_threshold_minutes=self.inactivity_threshold_minutes
                )
                return None
            
            return user
            
        except jwt.PyJWTError as e:
            self.logger.security(
                f"JWT token validation failed: {str(e)}",
                event_type="token_validation_error",
                user_id="unknown"
            )
            return None
        except Exception as e:
            self.logger.error(
                f"Unexpected error during token validation: {str(e)}",
                error=e
            )
            return None
    
    def _is_user_active(self, user_id: str) -> bool:
        """
        Check if user has been active within the inactivity threshold.
        
        Args:
            user_id: User identifier
            
        Returns:
            True if user has been active recently, False otherwise
        """
        try:
            # Get recent logs for this user
            recent_logs = self.logger.get_recent_logs(limit=1000)
            
            # Filter logs for this user and relevant categories
            user_logs = [
                log for log in recent_logs
                if log.get("user_id") == user_id and
                log.get("category") in [LogCategory.AUDIT.value, LogCategory.OPERATION.value]
            ]
            
            if not user_logs:
                # No activity logs found - this could be a newly logged-in user
                # Check if we have any recent login activity or if this is a fresh token
                # For now, be more lenient and allow the token if no logs exist
                # This prevents newly logged-in users from being immediately rejected
                self.logger.debug(
                    f"No activity logs found for user {user_id}, allowing token (new user or fresh login)",
                    user_id=user_id
                )
                return True
            
            # Get the most recent activity timestamp
            latest_activity = max(
                user_logs,
                key=lambda log: log.get("timestamp", "")
            )
            
            latest_timestamp = latest_activity.get("timestamp")
            if not latest_timestamp:
                return True  # Be lenient if timestamp is missing
            
            # Parse the timestamp
            try:
                # Handle both ISO format and other formats
                if 'T' in latest_timestamp:
                    # ISO format
                    latest_time = datetime.fromisoformat(
                        latest_timestamp.replace('Z', '+00:00')
                    )
                else:
                    # Try parsing as regular datetime
                    latest_time = datetime.fromisoformat(latest_timestamp)
                
                # Calculate time difference
                now = datetime.now(timezone.utc)
                time_diff = now - latest_time
                
                # Check if within inactivity threshold
                threshold = timedelta(minutes=self.inactivity_threshold_minutes)
                is_active = time_diff <= threshold
                
                if not is_active:
                    self.logger.debug(
                        f"User {user_id} inactive for {time_diff.total_seconds() / 60:.1f} minutes "
                        f"(threshold: {self.inactivity_threshold_minutes} minutes)",
                        user_id=user_id,
                        last_activity=latest_timestamp,
                        inactivity_duration_minutes=time_diff.total_seconds() / 60
                    )
                
                return is_active
                
            except (ValueError, TypeError) as e:
                self.logger.error(
                    f"Error parsing timestamp '{latest_timestamp}': {str(e)}",
                    user_id=user_id
                )
                return True  # Be lenient on parsing errors
                
        except Exception as e:
            self.logger.error(
                f"Error checking user activity: {str(e)}",
                user_id=user_id,
                error=e
            )
            # In case of error, be conservative and consider user active
            # This prevents legitimate users from being locked out due to system errors
            return True
    
    def _log_user_activity(self, user_id: str, operation: str = "token_validation"):
        """
        Log user activity for inactivity tracking.
        
        Args:
            user_id: User identifier
            operation: Operation being performed
        """
        self.logger.audit(
            f"User activity detected during {operation}",
            operation=operation,
            user_id=user_id
        ) 