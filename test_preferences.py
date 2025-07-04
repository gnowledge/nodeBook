#!/usr/bin/env python3
"""
Test script to verify preferences system functionality
"""

import requests
import json
import time

# Test configuration
BASE_URL = "http://localhost:8000"
TEST_USER_ID = "testuser123"

def test_preferences_system():
    print("Testing Preferences System")
    print("=" * 50)
    
    # Test 1: Get default preferences (should not exist yet)
    print("\n1. Testing GET preferences (should return defaults)")
    try:
        response = requests.get(f"{BASE_URL}/api/ndf/preferences?user_id={TEST_USER_ID}")
        if response.status_code == 200:
            prefs = response.json()
            print(f"✅ Success: Got default preferences")
            print(f"   Difficulty: {prefs.get('difficulty', 'not set')}")
            print(f"   All preferences: {json.dumps(prefs, indent=2)}")
        else:
            print(f"❌ Failed: Status {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 2: Set custom preferences
    print("\n2. Testing POST preferences (should create preferences.json)")
    test_preferences = {
        "graphLayout": "dagre",
        "language": "en",
        "educationLevel": "graduate",
        "landingTab": "graphs",
        "difficulty": "advanced",
        "subjectOrder": "SVO",
        "theme": "system",
        "fontSize": "medium",
        "showTooltips": True,
        "autosave": False,
        "showScorecardOnSave": True,
        "showAdvanced": False,
        "accessibility": False,
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/ndf/preferences",
            headers={
                "Content-Type": "application/json",
                "x-user-id": TEST_USER_ID
            },
            json=test_preferences
        )
        if response.status_code == 200:
            print(f"✅ Success: Preferences saved")
            print(f"   Response: {response.json()}")
        else:
            print(f"❌ Failed: Status {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 3: Get preferences again (should return saved preferences)
    print("\n3. Testing GET preferences (should return saved preferences)")
    try:
        response = requests.get(f"{BASE_URL}/api/ndf/preferences?user_id={TEST_USER_ID}")
        if response.status_code == 200:
            prefs = response.json()
            print(f"✅ Success: Got saved preferences")
            print(f"   Difficulty: {prefs.get('difficulty', 'not set')}")
            print(f"   Education Level: {prefs.get('educationLevel', 'not set')}")
            print(f"   Landing Tab: {prefs.get('landingTab', 'not set')}")
            
            # Verify the preferences were saved correctly
            if prefs.get('difficulty') == 'advanced':
                print("✅ Difficulty level correctly saved as 'advanced'")
            else:
                print(f"❌ Difficulty level mismatch: expected 'advanced', got '{prefs.get('difficulty')}'")
        else:
            print(f"❌ Failed: Status {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 4: Update preferences
    print("\n4. Testing UPDATE preferences")
    updated_preferences = {
        "graphLayout": "dagre",
        "language": "en",
        "educationLevel": "research",
        "landingTab": "help",
        "difficulty": "expert",
        "subjectOrder": "SVO",
        "theme": "system",
        "fontSize": "medium",
        "showTooltips": True,
        "autosave": False,
        "showScorecardOnSave": True,
        "showAdvanced": False,
        "accessibility": False,
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/ndf/preferences",
            headers={
                "Content-Type": "application/json",
                "x-user-id": TEST_USER_ID
            },
            json=updated_preferences
        )
        if response.status_code == 200:
            print(f"✅ Success: Preferences updated")
        else:
            print(f"❌ Failed: Status {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 5: Verify updated preferences
    print("\n5. Testing GET preferences (should return updated preferences)")
    try:
        response = requests.get(f"{BASE_URL}/api/ndf/preferences?user_id={TEST_USER_ID}")
        if response.status_code == 200:
            prefs = response.json()
            print(f"✅ Success: Got updated preferences")
            print(f"   Difficulty: {prefs.get('difficulty', 'not set')}")
            print(f"   Education Level: {prefs.get('educationLevel', 'not set')}")
            
            # Verify the preferences were updated correctly
            if prefs.get('difficulty') == 'expert':
                print("✅ Difficulty level correctly updated to 'expert'")
            else:
                print(f"❌ Difficulty level mismatch: expected 'expert', got '{prefs.get('difficulty')}'")
        else:
            print(f"❌ Failed: Status {response.status_code}")
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("Preferences system test completed!")

if __name__ == "__main__":
    test_preferences_system() 