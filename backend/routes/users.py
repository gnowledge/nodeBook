from fastapi import FastAPI, APIRouter, Depends, HTTPException
from fastapi_users import FastAPIUsers, BaseUserManager, UUIDIDMixin, schemas
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users_db_sqlmodel import SQLModelUserDatabase
from sqlmodel import SQLModel, Field, create_engine, Session
from uuid import UUID, uuid4
import secrets
import os
from pathlib import Path
from passlib.context import CryptContext
import json

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
        
        # Initialize user directory structure
        await self.initialize_user_directories(str(user.id))
    
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
            "morphs",
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
            "relation_node_registry.json",
            "morph_registry.json",
            "transition_registry.json",
            "function_registry.json"
        ]
        
        for registry in registries:
            registry_path = user_dir / registry
            if not registry_path.exists():
                with open(registry_path, 'w') as f:
                    json.dump({}, f)
        
        print(f"[DEBUG] Initialized directories for user {user_id}")

    async def validate_password(self, password: str, user: User) -> None:
        pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")
        is_valid = pwd_context.verify(password, user.hashed_password)
        print(f"[DEBUG] Password check: {is_valid} for user: {user.username}, password: {password}, hash: {user.hashed_password}")
        return await super().validate_password(password, user)

async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)

# ---------- AUTH ----------
bearer_transport = BearerTransport(tokenUrl="auth/jwt/login")

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=SECRET, lifetime_seconds=3600)

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

@users_router.get("/whoami")
async def whoami(user: User = Depends(current_active_user)):
    return {
        "username": user.username,
        "id": str(user.id),
        "is_superuser": user.is_superuser,
        "is_active": user.is_active
    }

@users_router.get("/debug/list_users")
def list_users():
    with Session(engine) as session:
        users = session.query(User).all()
        return [
            {"username": u.username, "email": u.email, "id": str(u.id)}
            for u in users
        ]
