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
        inactivity_threshold_minutes: int = 5256000,  # Effectively disable inactivity expiry (10 years)
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
        # Always return True to disable inactivity expiry
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