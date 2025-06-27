from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi_users import FastAPIUsers, BaseUserManager, UUIDIDMixin, schemas
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users_db_sqlmodel import SQLModelUserDatabase
from sqlmodel import SQLModel, Field, create_engine, Session, select
from uuid import UUID, uuid4
import secrets
import os
from pathlib import Path
from passlib.context import CryptContext
import json
from pydantic import BaseModel, EmailStr
from backend.core.inactivity_jwt_strategy import InactivityJWTStrategy
from typing import Optional

# ---------- CONFIG ----------
DATA_DIR = Path(__file__).resolve().parent.parent.parent / "graph_data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = DATA_DIR / "users.db"
DATABASE_URL = f"sqlite:///{DB_PATH}"
SECRET = secrets.token_urlsafe(32)

print(f"[UserDB] Using DATABASE_URL: {DATABASE_URL}")

# ---------- MODELS ----------
class User(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(nullable=False, unique=True, index=True)
    hashed_password: str = Field(nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    is_superuser: bool = Field(default=False, nullable=False)
    is_verified: bool = Field(default=True, nullable=False)
    username: str = Field(nullable=False, unique=True, index=True)

class UserCreate(schemas.BaseUserCreate):
    username: str

class UserRead(schemas.BaseUser[UUID]):
    username: str

class UserUpdate(schemas.BaseUserUpdate):
    username: str

# Custom login schema for username/email login
class UserLogin(BaseModel):
    username_or_email: str
    password: str

# ---------- DATABASE ----------
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SQLModel.metadata.create_all(engine)

def get_user_db():
    with Session(engine) as session:
        yield SQLModelUserDatabase(session, User)

# ---------- MANAGER ----------
class UserManager(UUIDIDMixin, BaseUserManager[User, UUID]):
    user_db_model = User
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

    async def on_after_register(self, user: User, request=None):
        # Only print username and email, not hashed_password
        print(f"[DEBUG] User registered: username={getattr(user, 'username', None)}, email={getattr(user, 'email', None)}")

        # Check if this is the first user and make them superuser
        await self._make_first_user_superuser(user)

        # Initialize user directory structure
        await self.initialize_user_directories(str(user.id))
    
    async def _make_first_user_superuser(self, user: User):
        """Make the first user in the system a superuser"""
        try:
            with Session(engine) as session:
                # Count total users
                total_users = len(session.exec(select(User)).all())
                
                if total_users == 1:  # This is the first user
                    user.is_superuser = True
                    session.add(user)
                    session.commit()
                    print(f"[ADMIN] First user '{user.username}' automatically promoted to superuser")
                    
                    # Log the admin promotion
                    from backend.core.logging_system import get_logger
                    logger = get_logger()
                    logger.security(
                        f"First user '{user.username}' automatically promoted to superuser",
                        event_type="first_user_superuser_promotion",
                        user_id=str(user.id),
                        username=user.username
                    )
        except Exception as e:
            print(f"[ERROR] Failed to make first user superuser: {e}")
    
    async def initialize_user_directories(self, user_id: str):
        """Create the necessary directory structure and default files for a new user."""
        
        # Base user directory
        user_dir = Path("graph_data") / "users" / user_id
        user_dir.mkdir(parents=True, exist_ok=True)
        
        # Create subdirectories
        subdirs = [
            "nodes",
            "attributeNodes", 
            "relationNodes",
            "transitions",
            "functions",
            "graphs",
            "schemas"  # For user-specific schema extensions
        ]
        
        for subdir in subdirs:
            (user_dir / subdir).mkdir(exist_ok=True)
        
        # Create default registry files
        registries = [
            "node_registry.json",
            "attribute_registry.json", 
            "relation_registry.json",
            "transition_registry.json",
            "function_registry.json"
        ]
        
        for registry in registries:
            registry_path = user_dir / registry
            if not registry_path.exists():
                with open(registry_path, 'w') as f:
                    json.dump({}, f)
        
        print(f"[DEBUG] Initialized directories for user {user_id}")

    async def authenticate(self, credentials: UserLogin) -> User | None:
        """Custom authenticate method that supports login with username or email"""
        pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")
        
        # Try to find user by username or email
        with Session(engine) as session:
            # Try username first
            stmt = select(User).where(User.username == credentials.username_or_email)
            user = session.exec(stmt).first()
            
            if not user:
                # Try email
                stmt = select(User).where(User.email == credentials.username_or_email)
                user = session.exec(stmt).first()
            
            if not user:
                return None
            
            # Verify password
            if not pwd_context.verify(credentials.password, user.hashed_password):
                return None
            
            return user

    async def _create(self, user_create: UserCreate) -> User:
        """Override _create to handle username field"""
        pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")
        
        user_data = {
            "email": user_create.email,
            "username": user_create.username,
            "hashed_password": pwd_context.hash(user_create.password),
            "is_active": user_create.is_active,
            "is_superuser": user_create.is_superuser,
            "is_verified": user_create.is_verified
        }
        
        user = User(**user_data)
        return user

async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)

# ---------- AUTH ----------
bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

def get_jwt_strategy() -> InactivityJWTStrategy:
    return InactivityJWTStrategy(
        secret=SECRET, 
        lifetime_seconds=3600,  # 1 hour max lifetime
        inactivity_threshold_minutes=20  # 20 minutes inactivity threshold
    )

auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[
    User, UUID
](
    get_user_manager,
    [auth_backend],
)

current_active_user = fastapi_users.current_user(active=True)

# ---------- ROUTER ----------
users_router = APIRouter()

users_router.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/jwt",
    tags=["auth"]
)

users_router.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="",
    tags=["auth"]
)

@users_router.post("/login")
async def login(credentials: UserLogin):
    """Custom login endpoint that accepts username or email"""
    user_manager = UserManager(get_user_db().__next__())
    user = await user_manager.authenticate(credentials)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    # Generate JWT token
    jwt_strategy = get_jwt_strategy()
    token = await jwt_strategy.write_token(user)
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": str(user.id),
            "username": user.username,
            "email": user.email,
            "is_active": user.is_active,
            "is_superuser": user.is_superuser
        }
    }

@users_router.get("/whoami")
async def whoami(user: User = Depends(current_active_user)):
    return {
        "username": user.username,
        "id": str(user.id),
        "is_superuser": user.is_superuser,
        "is_active": user.is_active
    }

@users_router.get("/config")
async def get_auth_config():
    """Get authentication configuration including inactivity threshold"""
    return {
        "inactivity_threshold_minutes": 20,  # Should match the JWT strategy configuration
        "max_token_lifetime_hours": 1,  # Should match the JWT strategy configuration
        "features": {
            "inactivity_based_expiration": True
        }
    }

@users_router.get("/debug/list_users")
def list_users():
    with Session(engine) as session:
        users = session.exec(select(User)).all()
        return [
            {"username": u.username, "email": u.email, "id": str(u.id)}
            for u in users
        ]

# ---------- ADMIN MANAGEMENT ENDPOINTS ----------

# Pydantic models for admin operations
class UserPromoteRequest(BaseModel):
    user_id: str
    reason: Optional[str] = None

class UserDemoteRequest(BaseModel):
    user_id: str
    reason: Optional[str] = None

class AdminUserCreate(BaseModel):
    username: str
    email: str
    password: str
    is_superuser: bool = False
    is_active: bool = True

class UserUpdateRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None

@users_router.get("/admin/users")
async def admin_list_users(user: User = Depends(current_active_user)):
    """List all users (admin only)"""
    if not user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        with Session(engine) as session:
            users = session.exec(select(User)).all()
            return {
                "users": [
                    {
                        "id": str(u.id),
                        "username": u.username,
                        "email": u.email,
                        "is_active": u.is_active,
                        "is_superuser": u.is_superuser,
                        "is_verified": u.is_verified,
                        "created_at": getattr(u, 'created_at', None)
                    }
                    for u in users
                ],
                "total": len(users),
                "superusers": sum(1 for u in users if u.is_superuser),
                "active_users": sum(1 for u in users if u.is_active)
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list users: {str(e)}")

@users_router.post("/admin/users")
async def admin_create_user(
    user_data: AdminUserCreate,
    current_user: User = Depends(current_active_user)
):
    """Create a new user (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        user_manager = UserManager(get_user_db().__next__())
        
        # Create user using FastAPI Users schema
        user_create = UserCreate(
            email=user_data.email,
            username=user_data.username,
            password=user_data.password,
            is_active=user_data.is_active,
            is_superuser=user_data.is_superuser,
            is_verified=True
        )
        
        user = await user_manager.create(user_create)
        
        # Log the admin action
        from backend.core.logging_system import get_logger
        logger = get_logger()
        logger.security(
            f"Admin '{current_user.username}' created user '{user.username}'",
            event_type="admin_user_creation",
            admin_user_id=str(current_user.id),
            created_user_id=str(user.id),
            created_username=user.username,
            is_superuser=user_data.is_superuser
        )
        
        return {
            "message": "User created successfully",
            "user": {
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "is_active": user.is_active,
                "is_superuser": user.is_superuser
            }
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to create user: {str(e)}")

@users_router.put("/admin/users/{user_id}")
async def admin_update_user(
    user_id: str,
    user_data: UserUpdateRequest,
    current_user: User = Depends(current_active_user)
):
    """Update user details (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Convert user_id to proper UUID format if needed
        if len(user_id) == 32:
            # Add hyphens to make it a proper UUID
            user_id = f"{user_id[:8]}-{user_id[8:12]}-{user_id[12:16]}-{user_id[16:20]}-{user_id[20:]}"
        
        with Session(engine) as session:
            # Find the user to update
            user = session.exec(select(User).where(User.id == UUID(user_id))).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Prevent admin from demoting themselves
            if str(user.id) == str(current_user.id) and user_data.is_superuser == False:
                raise HTTPException(status_code=400, detail="Cannot demote yourself")
            
            # Update fields
            if user_data.username is not None:
                user.username = user_data.username
            if user_data.email is not None:
                user.email = user_data.email
            if user_data.is_active is not None:
                user.is_active = user_data.is_active
            if user_data.is_superuser is not None:
                user.is_superuser = user_data.is_superuser
            
            session.add(user)
            session.commit()
            
            # Log the admin action
            from backend.core.logging_system import get_logger
            logger = get_logger()
            logger.security(
                f"Admin '{current_user.username}' updated user '{user.username}'",
                event_type="admin_user_update",
                admin_user_id=str(current_user.id),
                updated_user_id=str(user.id),
                updated_username=user.username,
                changes=user_data.dict(exclude_unset=True)
            )
            
            return {
                "message": "User updated successfully",
                "user": {
                    "id": str(user.id),
                    "username": user.username,
                    "email": user.email,
                    "is_active": user.is_active,
                    "is_superuser": user.is_superuser
                }
            }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid user ID format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update user: {str(e)}")

@users_router.post("/admin/users/{user_id}/promote")
async def admin_promote_user(
    user_id: str,
    request: UserPromoteRequest,
    current_user: User = Depends(current_active_user)
):
    """Promote a user to superuser (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Convert user_id to proper UUID format if needed
        if len(user_id) == 32:
            # Add hyphens to make it a proper UUID
            user_id = f"{user_id[:8]}-{user_id[8:12]}-{user_id[12:16]}-{user_id[16:20]}-{user_id[20:]}"
        
        with Session(engine) as session:
            user = session.exec(select(User).where(User.id == UUID(user_id))).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            if user.is_superuser:
                raise HTTPException(status_code=400, detail="User is already a superuser")
            
            user.is_superuser = True
            session.add(user)
            session.commit()
            
            # Log the admin action
            from backend.core.logging_system import get_logger
            logger = get_logger()
            logger.security(
                f"Admin '{current_user.username}' promoted user '{user.username}' to superuser",
                event_type="admin_user_promotion",
                admin_user_id=str(current_user.id),
                promoted_user_id=str(user.id),
                promoted_username=user.username,
                reason=request.reason
            )
            
            return {
                "message": f"User '{user.username}' promoted to superuser successfully",
                "user": {
                    "id": str(user.id),
                    "username": user.username,
                    "email": user.email,
                    "is_active": user.is_active,
                    "is_superuser": user.is_superuser
                }
            }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid user ID format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to promote user: {str(e)}")

@users_router.post("/admin/users/{user_id}/demote")
async def admin_demote_user(
    user_id: str,
    request: UserDemoteRequest,
    current_user: User = Depends(current_active_user)
):
    """Demote a superuser to regular user (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Convert user_id to proper UUID format if needed
        if len(user_id) == 32:
            # Add hyphens to make it a proper UUID
            user_id = f"{user_id[:8]}-{user_id[8:12]}-{user_id[12:16]}-{user_id[16:20]}-{user_id[20:]}"
        
        with Session(engine) as session:
            user = session.exec(select(User).where(User.id == UUID(user_id))).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            if not user.is_superuser:
                raise HTTPException(status_code=400, detail="User is not a superuser")
            
            # Prevent admin from demoting themselves
            if str(user.id) == str(current_user.id):
                raise HTTPException(status_code=400, detail="Cannot demote yourself")
            
            user.is_superuser = False
            session.add(user)
            session.commit()
            
            # Log the admin action
            from backend.core.logging_system import get_logger
            logger = get_logger()
            logger.security(
                f"Admin '{current_user.username}' demoted user '{user.username}' from superuser",
                event_type="admin_user_demotion",
                admin_user_id=str(current_user.id),
                demoted_user_id=str(user.id),
                demoted_username=user.username,
                reason=request.reason
            )
            
            return {
                "message": f"User '{user.username}' demoted from superuser successfully",
                "user": {
                    "id": str(user.id),
                    "username": user.username,
                    "email": user.email,
                    "is_active": user.is_active,
                    "is_superuser": user.is_superuser
                }
            }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid user ID format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to demote user: {str(e)}")

@users_router.delete("/admin/users/{user_id}")
async def admin_delete_user(
    user_id: str,
    current_user: User = Depends(current_active_user)
):
    """Delete a user (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        # Convert user_id to proper UUID format if needed
        if len(user_id) == 32:
            # Add hyphens to make it a proper UUID
            user_id = f"{user_id[:8]}-{user_id[8:12]}-{user_id[12:16]}-{user_id[16:20]}-{user_id[20:]}"
        
        with Session(engine) as session:
            user = session.exec(select(User).where(User.id == UUID(user_id))).first()
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Prevent admin from deleting themselves
            if str(user.id) == str(current_user.id):
                raise HTTPException(status_code=400, detail="Cannot delete yourself")
            
            username = user.username
            user_email = user.email
            
            # Delete the user
            session.delete(user)
            session.commit()
            
            # Log the admin action
            from backend.core.logging_system import get_logger
            logger = get_logger()
            logger.security(
                f"Admin '{current_user.username}' deleted user '{username}'",
                event_type="admin_user_deletion",
                admin_user_id=str(current_user.id),
                deleted_username=username,
                deleted_email=user_email
            )
            
            return {
                "message": f"User '{username}' deleted successfully"
            }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid user ID format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete user: {str(e)}")

@users_router.get("/admin/stats")
async def admin_get_stats(current_user: User = Depends(current_active_user)):
    """Get system statistics (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    try:
        with Session(engine) as session:
            total_users = session.exec(select(User)).all()
            active_users = session.exec(select(User).where(User.is_active == True)).all()
            superusers = session.exec(select(User).where(User.is_superuser == True)).all()
            
            return {
                "total_users": len(total_users),
                "active_users": len(active_users),
                "inactive_users": len(total_users) - len(active_users),
                "superusers": len(superusers),
                "regular_users": len(total_users) - len(superusers),
                "system_info": {
                    "first_user_created": True if len(total_users) > 0 else False,
                    "has_superusers": len(superusers) > 0
                }
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")
