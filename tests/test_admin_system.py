#!/usr/bin/env python3
"""
Test script for the admin system functionality.
Tests automatic first-user superuser promotion and admin user management.
"""

import requests
import json
import time
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

def test_admin_system():
    """Test the complete admin system functionality."""
    
    print_step("Testing Admin System")
    
    # Test data
    admin_user = {
        "username": "admin_test",
        "email": "admin@test.com",
        "password": "adminpass123"
    }
    
    regular_user = {
        "username": "user_test",
        "email": "user@test.com", 
        "password": "userpass123"
    }
    
    new_user = {
        "username": "newuser_test",
        "email": "newuser@test.com",
        "password": "newpass123"
    }
    
    admin_token = None
    regular_token = None
    admin_user_id = None
    regular_user_id = None
    new_user_id = None
    
    try:
        # Step 1: Register admin user (should become superuser automatically)
        print_step("1. Registering first user (should become superuser)")
        
        response = make_request("POST", f"{AUTH_BASE}/register", data=admin_user)
        if response.status_code == 201:
            print_success("Admin user registered successfully")
            admin_user_id = response.json().get("id")
            print_info(f"Admin user ID: {admin_user_id}")
        else:
            print_error(f"Failed to register admin user: {response.status_code} - {response.text}")
            return False
        
        # Step 2: Login as admin user
        print_step("2. Logging in as admin user")
        
        response = make_request("POST", f"{AUTH_BASE}/login", data={
            "username_or_email": admin_user["username"],
            "password": admin_user["password"]
        })
        
        if response.status_code == 200:
            admin_token = response.json().get("access_token")
            user_data = response.json().get("user", {})
            print_success("Admin user logged in successfully")
            print_info(f"Admin user is_superuser: {user_data.get('is_superuser')}")
            
            if not user_data.get("is_superuser"):
                print_error("Admin user was not automatically promoted to superuser!")
                return False
        else:
            print_error(f"Failed to login admin user: {response.status_code} - {response.text}")
            return False
        
        # Step 3: Check admin stats
        print_step("3. Checking admin statistics")
        
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
        
        # Step 4: Register regular user
        print_step("4. Registering regular user")
        
        response = make_request("POST", f"{AUTH_BASE}/register", data=regular_user)
        if response.status_code == 201:
            print_success("Regular user registered successfully")
            regular_user_id = response.json().get("id")
            print_info(f"Regular user ID: {regular_user_id}")
        else:
            print_error(f"Failed to register regular user: {response.status_code} - {response.text}")
            return False
        
        # Step 5: Login as regular user
        print_step("5. Logging in as regular user")
        
        response = make_request("POST", f"{AUTH_BASE}/login", data={
            "username_or_email": regular_user["username"],
            "password": regular_user["password"]
        })
        
        if response.status_code == 200:
            regular_token = response.json().get("access_token")
            user_data = response.json().get("user", {})
            print_success("Regular user logged in successfully")
            print_info(f"Regular user is_superuser: {user_data.get('is_superuser')}")
            
            if user_data.get("is_superuser"):
                print_error("Regular user was incorrectly promoted to superuser!")
                return False
        else:
            print_error(f"Failed to login regular user: {response.status_code} - {response.text}")
            return False
        
        # Step 6: Test admin user management (create user)
        print_step("6. Testing admin user creation")
        
        response = make_request("POST", f"{AUTH_BASE}/admin/users", 
                              data=new_user, headers=headers)
        
        if response.status_code == 200:
            print_success("Admin created new user successfully")
            new_user_id = response.json().get("user", {}).get("id")
            print_info(f"New user ID: {new_user_id}")
        else:
            print_error(f"Failed to create user via admin: {response.status_code} - {response.text}")
            return False
        
        # Step 7: Test admin user list
        print_step("7. Testing admin user list")
        
        response = make_request("GET", f"{AUTH_BASE}/admin/users", headers=headers)
        
        if response.status_code == 200:
            users_data = response.json()
            print_success("Admin user list retrieved successfully")
            print_info(f"Total users in list: {users_data.get('total')}")
            print_info(f"Superusers in list: {users_data.get('superusers')}")
            
            # Verify all users are present
            user_ids = [user.get("id") for user in users_data.get("users", [])]
            if admin_user_id in user_ids and regular_user_id in user_ids and new_user_id in user_ids:
                print_success("All expected users found in list")
            else:
                print_error("Not all expected users found in list")
                return False
        else:
            print_error(f"Failed to get admin user list: {response.status_code} - {response.text}")
            return False
        
        # Step 8: Test user promotion
        print_step("8. Testing user promotion")
        
        response = make_request("POST", f"{AUTH_BASE}/admin/users/{regular_user_id}/promote",
                              data={"reason": "Testing promotion"}, headers=headers)
        
        if response.status_code == 200:
            print_success("User promoted successfully")
            promoted_user = response.json().get("user", {})
            print_info(f"Promoted user is_superuser: {promoted_user.get('is_superuser')}")
        else:
            print_error(f"Failed to promote user: {response.status_code} - {response.text}")
            return False
        
        # Step 9: Test user demotion
        print_step("9. Testing user demotion")
        
        response = make_request("POST", f"{AUTH_BASE}/admin/users/{regular_user_id}/demote",
                              data={"reason": "Testing demotion"}, headers=headers)
        
        if response.status_code == 200:
            print_success("User demoted successfully")
            demoted_user = response.json().get("user", {})
            print_info(f"Demoted user is_superuser: {demoted_user.get('is_superuser')}")
        else:
            print_error(f"Failed to demote user: {response.status_code} - {response.text}")
            return False
        
        # Step 10: Test user update
        print_step("10. Testing user update")
        
        update_data = {
            "username": "updated_user_test",
            "is_active": True
        }
        
        response = make_request("PUT", f"{AUTH_BASE}/admin/users/{regular_user_id}",
                              data=update_data, headers=headers)
        
        if response.status_code == 200:
            print_success("User updated successfully")
            updated_user = response.json().get("user", {})
            print_info(f"Updated username: {updated_user.get('username')}")
        else:
            print_error(f"Failed to update user: {response.status_code} - {response.text}")
            return False
        
        # Step 11: Test non-admin access (should fail)
        print_step("11. Testing non-admin access (should fail)")
        
        regular_headers = {"Authorization": f"Bearer {regular_token}"}
        response = make_request("GET", f"{AUTH_BASE}/admin/users", headers=regular_headers)
        
        if response.status_code == 403:
            print_success("Non-admin access correctly denied")
        else:
            print_error(f"Non-admin access should have been denied: {response.status_code}")
            return False
        
        # Step 12: Test admin self-demotion prevention
        print_step("12. Testing admin self-demotion prevention")
        
        response = make_request("POST", f"{AUTH_BASE}/admin/users/{admin_user_id}/demote",
                              data={"reason": "Testing self-demotion"}, headers=headers)
        
        if response.status_code == 400:
            print_success("Admin self-demotion correctly prevented")
        else:
            print_error(f"Admin self-demotion should have been prevented: {response.status_code}")
            return False
        
        # Step 13: Test user deletion
        print_step("13. Testing user deletion")
        
        response = make_request("DELETE", f"{AUTH_BASE}/admin/users/{new_user_id}", headers=headers)
        
        if response.status_code == 200:
            print_success("User deleted successfully")
        else:
            print_error(f"Failed to delete user: {response.status_code} - {response.text}")
            return False
        
        # Step 14: Final stats check
        print_step("14. Final statistics check")
        
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
    print("Starting Admin System Test...")
    print("Make sure the backend server is running on http://localhost:8000")
    
    success = test_admin_system()
    
    if success:
        print("\n🎉 All tests passed! The admin system is working correctly.")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed. Please check the errors above.")
        sys.exit(1) 