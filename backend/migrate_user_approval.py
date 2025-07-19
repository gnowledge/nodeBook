#!/usr/bin/env python3
"""
Migration script to add approval fields to the User table.
Run this script to update the existing database schema.
"""

import sqlite3
import os
from pathlib import Path
from datetime import datetime, timezone

def migrate_user_approval():
    """Add approval fields to the User table"""
    
    # Get the database path
    DATA_DIR = Path(__file__).resolve().parent.parent / "graph_data"
    DB_PATH = DATA_DIR / "users.db"
    
    print(f"Migrating database: {DB_PATH}")
    
    if not DB_PATH.exists():
        print("❌ Database file not found. Please ensure the backend has been run at least once.")
        return False
    
    try:
        # Connect to the database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Check if columns already exist
        cursor.execute("PRAGMA table_info(user)")
        columns = [column[1] for column in cursor.fetchall()]
        
        print(f"Current columns: {columns}")
        
        # Add new columns if they don't exist
        new_columns = [
            ("is_approved", "BOOLEAN DEFAULT 0"),
            ("approval_note", "TEXT DEFAULT ''"),
            ("institution", "TEXT DEFAULT ''"),
            ("approved_by", "TEXT"),  # UUID as text
            ("approved_at", "TEXT"),  # ISO datetime as text
            ("created_at", "TEXT DEFAULT '" + datetime.now(timezone.utc).isoformat() + "'")
        ]
        
        for column_name, column_def in new_columns:
            if column_name not in columns:
                print(f"Adding column: {column_name}")
                cursor.execute(f"ALTER TABLE user ADD COLUMN {column_name} {column_def}")
            else:
                print(f"Column {column_name} already exists, skipping...")
        
        # Update existing users to be approved (for backward compatibility)
        cursor.execute("UPDATE user SET is_approved = 1, is_active = 1 WHERE is_approved IS NULL")
        
        # Commit changes
        conn.commit()
        conn.close()
        
        print("✅ Database migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    print("🔄 Starting User Approval Migration...")
    print("=" * 50)
    
    success = migrate_user_approval()
    
    if success:
        print("\n✅ Migration completed successfully!")
        print("The User table now includes approval fields:")
        print("  - is_approved: Boolean flag for approval status")
        print("  - approval_note: User's introduction note")
        print("  - institution: User's school/college/institution")
        print("  - approved_by: Admin who approved the user")
        print("  - approved_at: When the user was approved")
        print("  - created_at: When the user registered")
        print("\nExisting users have been automatically approved for backward compatibility.")
    else:
        print("\n❌ Migration failed. Please check the error messages above.")
        exit(1) 