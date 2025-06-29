#!/usr/bin/env python3
"""
Simple test script for the admin system functionality using existing superuser.
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# Configuration
BASE_URL = "http://localhost:8000"
AUTH_BASE = f"{BASE_URL}/api/auth"

def print_step(step: str):
    """Print a formatted step message."""
    print(f"\n{'='*60}")
    print(f"STEP: {step}")
    print(f"{'='*60}")

def print_success(message: str):
    """Print a success message."""
    print(f"✅ {message}")

def print_error(message: str):
    """Print an error message."""
    print(f"❌ {message}")

def print_info(message: str):
    """Print an info message."""
    print(f"ℹ️  {message}")

def make_request(method: str, url: str, data: Optional[Dict[str, Any]] = None, headers: Optional[Dict[str, str]] = None) -> requests.Response:
    """Make an HTTP request with error handling."""
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers or {})
        elif method.upper() == "POST":
            response = requests.post(url, json=data or {}, headers=headers or {})
        elif method.upper() == "PUT":
            response = requests.put(url, json=data or {}, headers=headers or {})
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers or {})
        else:
            raise ValueError(f"Unsupported method: {method}")
        
        return response
    except requests.exceptions.RequestException as e:
        print_error(f"Request failed: {e}")
        raise

def test_admin_system_simple():
    """Test the admin system functionality using existing superuser."""
    
    print_step("Testing Admin System (Simple)")
    
    # Test data
    new_user = {
        "username": "test_admin_user",
        "email": "testadmin@example.com",
        "password": "testpass123"
    }
    
    admin_credentials = {
        "username_or_email": "testadmin",
        "password": "adminpass123"
    }
    
    admin_token = None
    new_user_id = None
    
    try:
        # Step 1: Login as existing superuser
        print_step("1. Logging in as existing superuser")
        
        response = make_request("POST", f"{AUTH_BASE}/login", data=admin_credentials)
        
        if response.status_code == 200:
            admin_token = response.json().get("access_token")
            user_data = response.json().get("user", {})
            print_success("Superuser logged in successfully")
            print_info(f"User is_superuser: {user_data.get('is_superuser')}")
            
            if not user_data.get("is_superuser"):
                print_error("User is not a superuser!")
                return False
        else:
            print_error(f"Failed to login superuser: {response.status_code} - {response.text}")
            return False
        
        # Step 2: Check admin stats
        print_step("2. Checking admin statistics")
        
        headers = {"Authorization": f"Bearer {admin_token}"}
        response = make_request("GET", f"{AUTH_BASE}/admin/stats", headers=headers)
        
        if response.status_code == 200:
            stats = response.json()
            print_success("Admin stats retrieved successfully")
            print_info(f"Total users: {stats.get('total_users')}")
            print_info(f"Superusers: {stats.get('superusers')}")
            print_info(f"Active users: {stats.get('active_users')}")
        else:
            print_error(f"Failed to get admin stats: {response.status_code} - {response.text}")
            return False
        
        # Step 3: Test admin user list
        print_step("3. Testing admin user list")
        
        response = make_request("GET", f"{AUTH_BASE}/admin/users", headers=headers)
        
        if response.status_code == 200:
            users_data = response.json()
            print_success("Admin user list retrieved successfully")
            print_info(f"Total users in list: {users_data.get('total')}")
            print_info(f"Superusers in list: {users_data.get('superusers')}")
        else:
            print_error(f"Failed to get admin user list: {response.status_code} - {response.text}")
            return False
        
        # Step 4: Test admin user creation
        print_step("4. Testing admin user creation")
        
        response = make_request("POST", f"{AUTH_BASE}/admin/users", 
                              data=new_user, headers=headers)
        
        if response.status_code == 200:
            print_success("Admin created new user successfully")
            new_user_id = response.json().get("user", {}).get("id")
            print_info(f"New user ID: {new_user_id}")
        else:
            print_error(f"Failed to create user via admin: {response.status_code} - {response.text}")
            return False
        
        # Step 5: Test user promotion
        print_step("5. Testing user promotion")
        
        response = make_request("POST", f"{AUTH_BASE}/admin/users/{new_user_id}/promote",
                              data={"reason": "Testing promotion"}, headers=headers)
        
        if response.status_code == 200:
            print_success("User promoted successfully")
            promoted_user = response.json().get("user", {})
            print_info(f"Promoted user is_superuser: {promoted_user.get('is_superuser')}")
        else:
            print_error(f"Failed to promote user: {response.status_code} - {response.text}")
            return False
        
        # Step 6: Test user demotion
        print_step("6. Testing user demotion")
        
        response = make_request("POST", f"{AUTH_BASE}/admin/users/{new_user_id}/demote",
                              data={"reason": "Testing demotion"}, headers=headers)
        
        if response.status_code == 200:
            print_success("User demoted successfully")
            demoted_user = response.json().get("user", {})
            print_info(f"Demoted user is_superuser: {demoted_user.get('is_superuser')}")
        else:
            print_error(f"Failed to demote user: {response.status_code} - {response.text}")
            return False
        
        # Step 7: Test user update
        print_step("7. Testing user update")
        
        update_data = {
            "username": "updated_test_user",
            "is_active": True
        }
        
        response = make_request("PUT", f"{AUTH_BASE}/admin/users/{new_user_id}",
                              data=update_data, headers=headers)
        
        if response.status_code == 200:
            print_success("User updated successfully")
            updated_user = response.json().get("user", {})
            print_info(f"Updated username: {updated_user.get('username')}")
        else:
            print_error(f"Failed to update user: {response.status_code} - {response.text}")
            return False
        
        # Step 8: Test user deletion
        print_step("8. Testing user deletion")
        
        response = make_request("DELETE", f"{AUTH_BASE}/admin/users/{new_user_id}", headers=headers)
        
        if response.status_code == 200:
            print_success("User deleted successfully")
        else:
            print_error(f"Failed to delete user: {response.status_code} - {response.text}")
            return False
        
        # Step 9: Final stats check
        print_step("9. Final statistics check")
        
        response = make_request("GET", f"{AUTH_BASE}/admin/stats", headers=headers)
        
        if response.status_code == 200:
            final_stats = response.json()
            print_success("Final stats retrieved successfully")
            print_info(f"Final total users: {final_stats.get('total_users')}")
            print_info(f"Final superusers: {final_stats.get('superusers')}")
            print_info(f"Final active users: {final_stats.get('active_users')}")
        else:
            print_error(f"Failed to get final stats: {response.status_code} - {response.text}")
            return False
        
        print_step("ADMIN SYSTEM TEST COMPLETED SUCCESSFULLY")
        print_success("All admin system features are working correctly!")
        return True
        
    except Exception as e:
        print_error(f"Test failed with exception: {e}")
        return False

if __name__ == "__main__":
    print("Starting Simple Admin System Test...")
    print("Make sure the backend server is running on http://localhost:8000")
    print("Using existing superuser 'gns' for testing")
    
    success = test_admin_system_simple()
    
    if success:
        print("\n🎉 All tests passed! The admin system is working correctly.")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed. Please check the errors above.")
        sys.exit(1) 