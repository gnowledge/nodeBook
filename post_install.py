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

# --- 1. Create admin user ---
def create_admin_user():
    from backend.routes.users import User, engine, Session
    from uuid import uuid4
    from passlib.context import CryptContext
    from sqlmodel import select

    username = "admin"
    email = "admin@example.com"
    password = "admin123"  # Change as needed
    pwd_context = CryptContext(schemes=["argon2", "bcrypt"], deprecated="auto")
    hashed_password = pwd_context.hash(password)

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
            is_verified=True
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
