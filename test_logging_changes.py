#!/usr/bin/env python3
"""
Test script to verify the logging changes work correctly.
Tests user-friendly messages and CUD-only logging.
"""

import sys
import os
sys.path.append('.')

from backend.core.logging_system import get_logger
from backend.core.activity_middleware import ActivityTrackingMiddleware

def test_user_friendly_messages():
    """Test that user-friendly messages are generated correctly"""
    print("Testing user-friendly message generation...")
    
    # Create a mock middleware instance
    middleware = ActivityTrackingMiddleware(None)
    
    # Test various API paths
    test_cases = [
        ("POST", "/api/ndf/users/123/graphs/456/nodes", "Created node"),
        ("PUT", "/api/ndf/users/123/graphs/456/nodes/789", "Updated node"),
        ("DELETE", "/api/ndf/users/123/graphs/456/nodes/789", "Deleted node"),
        ("POST", "/api/ndf/users/123/graphs/456/relations", "Added relation"),
        ("PUT", "/api/ndf/users/123/graphs/456/relations/789", "Updated relation"),
        ("DELETE", "/api/ndf/users/123/graphs/456/relations/789", "Deleted relation"),
        ("POST", "/api/ndf/users/123/graphs/456/attributes", "Added attribute"),
        ("PUT", "/api/ndf/users/123/graphs/456/attributes/789", "Updated attribute"),
        ("DELETE", "/api/ndf/users/123/graphs/456/attributes/789", "Deleted attribute"),
        ("POST", "/api/ndf/users/123/graphs/456/transitions", "Created transition"),
        ("PUT", "/api/ndf/users/123/graphs/456/transitions/789", "Updated transition"),
        ("DELETE", "/api/ndf/users/123/graphs/456/transitions/789", "Deleted transition"),
        ("POST", "/api/ndf/users/123/graphs/456/functions", "Created function"),
        ("PUT", "/api/ndf/users/123/graphs/456/functions/789", "Updated function"),
        ("DELETE", "/api/ndf/users/123/graphs/456/functions/789", "Deleted function"),
        ("POST", "/api/ndf/users/123/graphs/456/morphs", "Created morph"),
        ("PUT", "/api/ndf/users/123/graphs/456/morphs/789", "Updated morph"),
        ("DELETE", "/api/ndf/users/123/graphs/456/morphs/789", "Deleted morph"),
        ("POST", "/api/auth/login", "Logged in"),
        ("POST", "/api/auth/logout", "Logged out"),
        ("POST", "/api/auth/register", "Registered account"),
        ("PUT", "/api/ndf/users/123/preferences", "Updated preferences"),
        ("POST", "/api/ndf/users/123/graphs/456/cnl", "Updated CNL"),
        ("PUT", "/api/ndf/users/123/graphs/456/cnl", "Updated CNL"),
    ]
    
    passed = 0
    total = len(test_cases)
    
    for method, path, expected in test_cases:
        actual = middleware._get_user_friendly_message(method, path)
        if actual == expected:
            print(f"✅ {method} {path} -> '{actual}'")
            passed += 1
        else:
            print(f"❌ {method} {path} -> Expected: '{expected}', Got: '{actual}'")
    
    print(f"\nUser-friendly message tests: {passed}/{total} passed")
    return passed == total

def test_cud_filtering():
    """Test that only CUD operations are logged"""
    print("\nTesting CUD operation filtering...")
    
    middleware = ActivityTrackingMiddleware(None)
    
    # Test CUD operations (should be logged)
    cud_tests = [
        ("POST", "/api/ndf/users/123/graphs/456/nodes"),
        ("PUT", "/api/ndf/users/123/graphs/456/nodes/789"),
        ("PATCH", "/api/ndf/users/123/graphs/456/nodes/789"),
        ("DELETE", "/api/ndf/users/123/graphs/456/nodes/789"),
    ]
    
    # Test read operations (should NOT be logged)
    read_tests = [
        ("GET", "/api/ndf/users/123/graphs/456/nodes"),
        ("GET", "/api/ndf/users/123/graphs/456/nodes/789"),
        ("HEAD", "/api/ndf/users/123/graphs/456/nodes"),
        ("OPTIONS", "/api/ndf/users/123/graphs/456/nodes"),
    ]
    
    # Test excluded paths (should NOT be logged)
    excluded_tests = [
        ("POST", "/api/logs/recent"),
        ("GET", "/api/health"),
        ("GET", "/docs"),
        ("GET", "/redoc"),
        ("GET", "/openapi.json"),
        ("GET", "/static/style.css"),
        ("GET", "/favicon.ico"),
    ]
    
    passed = 0
    total = len(cud_tests) + len(read_tests) + len(excluded_tests)
    
    # Test CUD operations (should return True)
    for method, path in cud_tests:
        should_log = middleware._should_log_request(method, path)
        if should_log:
            print(f"✅ {method} {path} -> Should log (CUD operation)")
            passed += 1
        else:
            print(f"❌ {method} {path} -> Should log but didn't")
    
    # Test read operations (should return False)
    for method, path in read_tests:
        should_log = middleware._should_log_request(method, path)
        if not should_log:
            print(f"✅ {method} {path} -> Should NOT log (read operation)")
            passed += 1
        else:
            print(f"❌ {method} {path} -> Should NOT log but did")
    
    # Test excluded paths (should return False)
    for method, path in excluded_tests:
        should_log = middleware._should_log_request(method, path)
        if not should_log:
            print(f"✅ {method} {path} -> Should NOT log (excluded path)")
            passed += 1
        else:
            print(f"❌ {method} {path} -> Should NOT log but did")
    
    print(f"\nCUD filtering tests: {passed}/{total} passed")
    return passed == total

def test_logging_system():
    """Test the logging system with user-friendly messages"""
    print("\nTesting logging system...")
    
    logger = get_logger("test_user")
    
    # Test audit logging with user-friendly messages
    test_messages = [
        "Created node",
        "Updated graph", 
        "Added relation",
        "Deleted attribute",
        "Created transition",
        "Updated preferences"
    ]
    
    for message in test_messages:
        logger.audit(message, operation="test_operation", user_id="test_user")
        print(f"✅ Logged: {message}")
    
    print("Logging system tests passed")
    return True

if __name__ == "__main__":
    print("🧪 Testing Logging System Changes")
    print("=" * 50)
    
    tests = [
        test_user_friendly_messages,
        test_cud_filtering,
        test_logging_system
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Test failed with error: {e}")
    
    print("\n" + "=" * 50)
    print(f"🎯 Overall Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("✅ All tests passed! Logging system changes are working correctly.")
    else:
        print("❌ Some tests failed. Please check the implementation.")
    
    sys.exit(0 if passed == total else 1) 