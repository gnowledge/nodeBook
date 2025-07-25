# scripts/post_install.py
"""
Script to:
1. Create an admin user with a default password.
2. Download the spaCy en_core_web_sm model.

Usage:
    python scripts/post_install.py

You can add more post-installation steps to this script as needed.
"""
import subprocess
import sys
import os
from pathlib import Path

# Add the parent directory to sys.path so we can import backend modules
script_dir = Path(__file__).parent
project_root = script_dir.parent
sys.path.insert(0, str(project_root))

# --- 1. Create admin user ---
def create_admin_user():
    from routes.users import User, engine, Session
    from uuid import uuid4
    from passlib.context import CryptContext
    from sqlmodel import select
    from datetime import datetime

    username = "admin"
    email = "admin@example.com"
    password = "admin123"  # Change as needed
    pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")
    hashed_password = pwd_context.hash(password)
    now = datetime.utcnow()

    with Session(engine) as session:
        existing = session.exec(select(User).where(User.username == username)).first()
        if existing:
            print(f"[INFO] Admin user '{username}' already exists.")
            return
        user = User(
            id=uuid4(),
            username=username,
            email=email,
            hashed_password=hashed_password,
            is_active=True,
            is_superuser=True,
            is_verified=True,
            is_approved=True,
            approval_note="Initial admin user created by post_install script.",
            institution="System",
            approved_by=None,
            approved_at=now,
            created_at=now
        )
        session.add(user)
        session.commit()
        print(f"[SUCCESS] Admin user '{username}' created with password '{password}'")

# --- 2. Download spaCy en_core_web_sm ---
def download_spacy_model():
    print("[INFO] Downloading spaCy model 'en_core_web_sm'...")
    subprocess.check_call([sys.executable, "-m", "spacy", "download", "en_core_web_sm"])
    print("[SUCCESS] spaCy model 'en_core_web_sm' downloaded.")

if __name__ == "__main__":
    create_admin_user()
    download_spacy_model()
