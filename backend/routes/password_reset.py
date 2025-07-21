"""
Password reset functionality for NodeBook authentication system.
"""

from fastapi import APIRouter, HTTPException, Depends, Security
from pydantic import BaseModel, EmailStr
from sqlmodel import Session, select
from datetime import datetime, timedelta
import secrets
import logging
from typing import Optional
import os
from uuid import UUID

from backend.routes.users import User, engine, current_active_user
from backend.core.email_service import email_service
from backend.core.logging_system import get_logger

logger = get_logger()
password_reset_router = APIRouter()

EMAIL_FEATURES_ENABLED = os.getenv("EMAIL_FEATURES_ENABLED", "false").lower() == "true"

# Pydantic models
class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class AdminResetPasswordRequest(BaseModel):
    user_id: str
    reason: Optional[str] = None

# In-memory token storage (in production, use Redis or database)
password_reset_tokens = {}

def generate_reset_token() -> str:
    """Generate a secure password reset token."""
    return secrets.token_urlsafe(32)

def store_reset_token(email: str, token: str, expires_in_hours: int = 1):
    """Store password reset token with expiration."""
    expires_at = datetime.utcnow() + timedelta(hours=expires_in_hours)
    password_reset_tokens[token] = {
        "email": email,
        "expires_at": expires_at,
        "used": False
    }

def validate_reset_token(token: str) -> Optional[str]:
    """Validate reset token and return associated email if valid."""
    if token not in password_reset_tokens:
        return None
    
    token_data = password_reset_tokens[token]
    
    # Check if token is expired
    if datetime.utcnow() > token_data["expires_at"]:
        del password_reset_tokens[token]
        return None
    
    # Check if token is already used
    if token_data["used"]:
        del password_reset_tokens[token]
        return None
    
    return token_data["email"]

def invalidate_reset_token(token: str):
    """Mark reset token as used."""
    if token in password_reset_tokens:
        password_reset_tokens[token]["used"] = True

@password_reset_router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """
    Send password reset email to user.
    
    This endpoint will always return success to prevent email enumeration,
    but will only send an email if the user exists.
    """
    if not EMAIL_FEATURES_ENABLED:
        return {"message": "Password reset by email is disabled on this server. Please contact your administrator."}
    try:
        # Find user by email
        with Session(engine) as session:
            user = session.exec(select(User).where(User.email == request.email)).first()
            
            if not user:
                # Don't reveal if user exists or not
                print(f"Password reset requested for non-existent email: {request.email}")
                return {"message": "If the email exists, a password reset link has been sent."}
            
            if not user.is_active:
                print(f"Password reset requested for inactive user: {request.email}")
                return {"message": "If the email exists, a password reset link has been sent."}
            
            # Generate reset token
            token = generate_reset_token()
            store_reset_token(request.email, token)
            
            # Send email
            base_url = "http://localhost:3001"  # TODO: Get from config
            email_sent = email_service.send_password_reset_email(
                request.email, user.username, token, base_url
            )
            
            if email_sent:
                logger.security(
                    f"Password reset email sent to {request.email}",
                    event_type="password_reset_email_sent",
                    user_id=str(user.id),
                    username=user.username
                )
            else:
                logger.error(f"Failed to send password reset email to {request.email}")
            
            return {"message": "If the email exists, a password reset link has been sent."}
            
    except Exception as e:
        logger.error(f"Error in forgot_password: {str(e)}")
        return {"message": "If the email exists, a password reset link has been sent."}

@password_reset_router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """
    Reset password using token.
    """
    if not EMAIL_FEATURES_ENABLED:
        raise HTTPException(status_code=400, detail="Password reset by email is disabled. Please contact your administrator.")
    try:
        # Validate token
        email = validate_reset_token(request.token)
        if not email:
            raise HTTPException(status_code=400, detail="Invalid or expired reset token")
        
        # Find user
        with Session(engine) as session:
            user = session.exec(select(User).where(User.email == email)).first()
            
            if not user:
                raise HTTPException(status_code=400, detail="Invalid or expired reset token")
            
            if not user.is_active:
                raise HTTPException(status_code=400, detail="Account is not active")
            
            # Validate password strength
            if len(request.new_password) < 8:
                raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
            
            # Update password
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")
            user.hashed_password = pwd_context.hash(request.new_password)
            
            session.add(user)
            session.commit()
            
            # Invalidate token
            invalidate_reset_token(request.token)
            
            # Log the action
            logger.security(
                f"Password reset completed for {email}",
                event_type="password_reset_completed",
                user_id=str(user.id),
                username=user.username
            )
            
            return {"message": "Password reset successfully"}
            
    except HTTPException:
        raise
    except Exception as e:
        print("DEBUG ERROR:", e)
        raise HTTPException(status_code=500, detail="Internal server error")

@password_reset_router.post("/admin/reset-user-password")
async def admin_reset_user_password(
    request: AdminResetPasswordRequest,
    current_user: User = Depends(current_active_user)
):
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    if EMAIL_FEATURES_ENABLED:
        raise HTTPException(status_code=400, detail="Admin password reset is disabled when email features are enabled.")
    try:
        with Session(engine) as session:
            user_id = UUID(request.user_id)
            user = session.exec(select(User).where(User.id == user_id)).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            if not user.is_active:
                raise HTTPException(status_code=400, detail="Cannot reset password for inactive user")
            temp_password = secrets.token_urlsafe(8)
            from passlib.context import CryptContext
            pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")
            user.hashed_password = pwd_context.hash(temp_password)
            user.must_change_password = True  # Force user to change password on next login
            session.add(user)
            session.commit()
            return {
                "message": "Password reset successfully",
                "temp_password": temp_password,
                "email_sent": False
            }
    except HTTPException:
        raise
    except Exception as e:
        print("DEBUG ERROR:", e)
        raise HTTPException(status_code=500, detail="Internal server error")

# New endpoint: user-initiated password change
from fastapi import Security
from fastapi.security import OAuth2PasswordRequestForm
class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

@password_reset_router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_user: User = Depends(current_active_user)
):
    try:
        from passlib.context import CryptContext
        pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")
        # Verify current password
        if not pwd_context.verify(request.current_password, current_user.hashed_password):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        # Validate new password
        if len(request.new_password) < 8:
            raise HTTPException(status_code=400, detail="Password must be at least 8 characters long")
        # Update password
        current_user.hashed_password = pwd_context.hash(request.new_password)
        current_user.must_change_password = False
        with Session(engine) as session:
            user = session.exec(select(User).where(User.id == UUID(str(current_user.id)))).first()
            if user:
                user.hashed_password = current_user.hashed_password
                user.must_change_password = False
                session.add(user)
                session.commit()
        logger.security(
            f"User changed password successfully",
            event_type="user_password_changed",
            user_id=str(current_user.id),
            username=current_user.username
        )
        return {"message": "Password changed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print("DEBUG ERROR:", e)
        raise HTTPException(status_code=500, detail="Internal server error")

@password_reset_router.get("/test-email")
async def test_email_service(current_user: User = Depends(current_active_user)):
    """
    Test email service connection (admin only).
    """
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Test connection
        connection_ok = email_service.test_connection()
        
        if connection_ok:
            return {"message": "Email service is working correctly"}
        else:
            return {"message": "Email service is not working", "enabled": email_service.enabled}
            
    except Exception as e:
        logger.error(f"Error testing email service: {str(e)}")
        raise HTTPException(status_code=500, detail="Error testing email service") 