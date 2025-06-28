"""
Test configuration and fixtures for NDF Studio backend tests.

This module provides:
1. Authentication bypass for tests
2. UUID validation monkeypatching for legacy tests
3. Test database and file system setup
4. Common test utilities and fixtures
"""

import pytest
import uuid
from unittest.mock import Mock, patch
from typing import Generator, Optional
import os
import shutil
import tempfile
from pathlib import Path


# ============================================================================
# AUTHENTICATION BYPASS FOR TESTS
# ============================================================================

class MockUser:
    """Mock user object for testing that bypasses authentication."""
    
    def __init__(self, user_id: str = "test-user-id", is_superuser: bool = False):
        self.id = user_id
        self.username = "testuser"
        self.email = "test@example.com"
        self.is_active = True
        self.is_superuser = is_superuser
    
    def __str__(self):
        return f"MockUser(id={self.id})"


def get_mock_user(user_id: str = "test-user-id", is_superuser: bool = False) -> MockUser:
    """Create a mock user for testing."""
    return MockUser(user_id=user_id, is_superuser=is_superuser)


def mock_current_active_user(user_id: str = "test-user-id", is_superuser: bool = False):
    """Mock dependency that returns a test user instead of requiring authentication."""
    return get_mock_user(user_id=user_id, is_superuser=is_superuser)


# ============================================================================
# UUID VALIDATION MONKEYPATCHING
# ============================================================================

def mock_uuid_validation(uuid_str: str) -> bool:
    """
    Mock UUID validation that accepts both valid UUIDs and legacy non-UUID strings.
    
    This allows legacy tests to pass without requiring actual UUIDs.
    """
    if not uuid_str:
        return False
    
    # If it's already a valid UUID, accept it
    try:
        uuid.UUID(uuid_str)
        return True
    except ValueError:
        pass
    
    # For legacy tests, accept any non-empty string as a "valid" user ID
    # This allows tests written before UUID validation to pass
    return bool(uuid_str.strip())


def mock_uuid_generation() -> str:
    """Generate a valid UUID for testing."""
    return str(uuid.uuid4())


# ============================================================================
# TEST FIXTURES
# ============================================================================

@pytest.fixture(scope="function")
def temp_test_dir() -> Generator[Path, None, None]:
    """Create a temporary directory for test data."""
    temp_dir = Path(tempfile.mkdtemp(prefix="ndf_test_"))
    yield temp_dir
    
    # Clean up
    if temp_dir.exists():
        shutil.rmtree(temp_dir)


@pytest.fixture(scope="function")
def mock_user_data(temp_test_dir: Path) -> Generator[dict, None, None]:
    """Create mock user data for testing."""
    user_id = "test-user-id"
    user_data = {
        "id": user_id,
        "username": "testuser",
        "email": "test@example.com",
        "is_active": True,
        "is_superuser": False
    }
    
    # Create user directory structure
    user_dir = temp_test_dir / "users" / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    
    # Create basic user files
    (user_dir / "node_registry.json").write_text('{"test-user-id": {}}')
    (user_dir / "relation_registry.json").write_text('{}')
    (user_dir / "attribute_registry.json").write_text('{}')
    
    # Create graphs directory
    graphs_dir = user_dir / "graphs"
    graphs_dir.mkdir(exist_ok=True)
    
    yield user_data


# ============================================================================
# MONKEYPATCHING SETUP
# ============================================================================

def pytest_configure(config):
    """Configure pytest with necessary monkeypatching."""
    
    # For now, we'll use a simpler approach - just provide the mock functions
    # without trying to patch non-existent functions
    pass


def pytest_unconfigure(config):
    """Clean up monkeypatching after tests."""
    pass


# ============================================================================
# TEST UTILITIES
# ============================================================================

def create_test_user(user_id: Optional[str] = None, is_superuser: bool = False) -> MockUser:
    """Create a test user with optional custom ID."""
    if user_id is None:
        user_id = str(uuid.uuid4())
    return get_mock_user(user_id=user_id, is_superuser=is_superuser)


def create_test_graph_data(user_id: str, graph_id: str) -> dict:
    """Create basic test graph data."""
    return {
        "metadata": {
            "name": f"Test Graph {graph_id}",
            "description": "Test graph for unit testing",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        },
        "nodes": {},
        "relations": {},
        "attributes": {}
    }


def setup_test_environment(temp_dir: Path, user_id: str = "test-user-id"):
    """Set up a complete test environment with user data."""
    
    # Create user directory structure
    user_dir = temp_dir / "users" / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    
    # Create registry files
    (user_dir / "node_registry.json").write_text('{}')
    (user_dir / "relation_registry.json").write_text('{}')
    (user_dir / "attribute_registry.json").write_text('{}')
    
    # Create graphs directory
    graphs_dir = user_dir / "graphs"
    graphs_dir.mkdir(exist_ok=True)
    
    return user_dir


# ============================================================================
# MARKERS FOR TEST ORGANIZATION
# ============================================================================

def pytest_collection_modifyitems(config, items):
    """Add custom markers to tests."""
    
    for item in items:
        # Mark tests that require authentication bypass
        if "auth" in item.nodeid.lower() or "user" in item.nodeid.lower():
            item.add_marker(pytest.mark.auth)
        
        # Mark tests that require UUID validation bypass
        if "uuid" in item.nodeid.lower() or "id" in item.nodeid.lower():
            item.add_marker(pytest.mark.uuid)
        
        # Mark integration tests
        if "integration" in item.nodeid.lower():
            item.add_marker(pytest.mark.integration)
        
        # Mark unit tests
        if "unit" in item.nodeid.lower() or "test_" in item.nodeid.lower():
            item.add_marker(pytest.mark.unit)
