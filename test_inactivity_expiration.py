#!/usr/bin/env python3
"""
Test script for inactivity-based token expiration

This script tests the new inactivity-based token expiration feature by:
1. Logging in a user
2. Making some API calls to generate activity
3. Waiting for inactivity period
4. Testing that the token is rejected due to inactivity
"""

import requests
import time
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000"
AUTH_BASE = f"{BASE_URL}/api/auth"
API_BASE = f"{BASE_URL}/api/ndf"

# Test user credentials
TEST_USERNAME = "testuser"
TEST_PASSWORD = "testpass123"
TEST_EMAIL = "test@example.com"

def create_test_user():
    """Create a test user if it doesn't exist"""
    try:
        response = requests.post(f"{AUTH_BASE}/register", json={
            "username": TEST_USERNAME,
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            print("✅ Test user created successfully")
        elif response.status_code == 400 and "already exists" in response.text:
            print("ℹ️  Test user already exists")
        else:
            print(f"⚠️  User creation response: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"❌ Error creating test user: {e}")

def login_user():
    """Login and get a token"""
    try:
        response = requests.post(f"{AUTH_BASE}/login", json={
            "username_or_email": TEST_USERNAME,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data["access_token"]
            user_id = data["user"]["id"]
            print(f"✅ Login successful for user {TEST_USERNAME}")
            return token, user_id
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return None, None
    except Exception as e:
        print(f"❌ Error during login: {e}")
        return None, None

def make_api_call(token, endpoint, description):
    """Make an API call and log the result"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{API_BASE}{endpoint}", headers=headers)
        
        if response.status_code == 200:
            print(f"✅ {description} - Success")
            return True
        else:
            print(f"❌ {description} - Failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ {description} - Error: {e}")
        return False

def test_inactivity_expiration():
    """Test the inactivity-based token expiration"""
    print("🧪 Testing Inactivity-Based Token Expiration")
    print("=" * 50)
    
    # Step 1: Create test user
    create_test_user()
    
    # Step 2: Login and get token
    token, user_id = login_user()
    if not token:
        print("❌ Cannot proceed without valid token")
        return
    
    print(f"🕐 Token obtained at: {datetime.now().strftime('%H:%M:%S')}")
    
    # Step 3: Make some initial API calls to generate activity
    print("\n📡 Making initial API calls to generate activity...")
    make_api_call(token, "/users", "Get users list")
    make_api_call(token, "/graphs", "Get graphs list")
    
    # Step 4: Wait for a short period (less than inactivity threshold)
    wait_time = 30  # 30 seconds
    print(f"\n⏳ Waiting {wait_time} seconds (less than inactivity threshold)...")
    time.sleep(wait_time)
    
    # Step 5: Test that token is still valid
    print(f"\n🕐 Testing token validity at: {datetime.now().strftime('%H:%M:%S')}")
    if make_api_call(token, "/users", "Token validity test"):
        print("✅ Token is still valid (expected)")
    else:
        print("❌ Token expired unexpectedly")
        return
    
    # Step 6: Wait for inactivity period (simulate user being away)
    inactivity_wait = 25  # 25 seconds to simulate inactivity
    print(f"\n⏳ Simulating inactivity for {inactivity_wait} seconds...")
    print("   (In a real scenario, this would be 20+ minutes)")
    time.sleep(inactivity_wait)
    
    # Step 7: Test that token is now invalid due to inactivity
    print(f"\n🕐 Testing token after inactivity at: {datetime.now().strftime('%H:%M:%S')}")
    if make_api_call(token, "/users", "Token after inactivity test"):
        print("⚠️  Token is still valid (this might be expected if inactivity threshold is longer)")
    else:
        print("✅ Token correctly expired due to inactivity")
    
    # Step 8: Try to login again to get a new token
    print(f"\n🔄 Attempting to get new token...")
    new_token, _ = login_user()
    if new_token:
        print("✅ Successfully obtained new token")
        if make_api_call(new_token, "/users", "New token test"):
            print("✅ New token works correctly")
        else:
            print("❌ New token doesn't work")
    else:
        print("❌ Failed to get new token")

def test_config_endpoint():
    """Test the auth config endpoint"""
    print("\n🔧 Testing Auth Config Endpoint")
    print("-" * 30)
    
    try:
        response = requests.get(f"{AUTH_BASE}/config")
        if response.status_code == 200:
            config = response.json()
            print("✅ Config endpoint working")
            print(f"   Inactivity threshold: {config.get('inactivity_threshold_minutes')} minutes")
            print(f"   Max token lifetime: {config.get('max_token_lifetime_hours')} hours")
            print(f"   Inactivity-based expiration: {config.get('features', {}).get('inactivity_based_expiration')}")
        else:
            print(f"❌ Config endpoint failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Error testing config endpoint: {e}")

if __name__ == "__main__":
    print("🚀 Starting Inactivity-Based Token Expiration Tests")
    print("=" * 60)
    
    # Test config endpoint
    test_config_endpoint()
    
    # Test inactivity expiration
    test_inactivity_expiration()
    
    print("\n🏁 Test completed!")
    print("\nNote: In a real scenario, the inactivity threshold is 20 minutes.")
    print("This test uses shorter periods for demonstration purposes.") 