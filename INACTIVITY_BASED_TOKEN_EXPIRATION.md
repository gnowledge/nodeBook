# Inactivity-Based Token Expiration

## Overview

This document describes the implementation of inactivity-based token expiration for NDF Studio. Instead of using a fixed time-based expiration, tokens now expire based on user activity, providing a better user experience while maintaining security.

## Problem Statement

Previously, JWT tokens had a fixed expiration time (1 hour), which meant that:
- Users working actively would be logged out after 1 hour regardless of their activity
- Users who were inactive for a short time would still have valid tokens
- This created a poor user experience for active users

## Solution

The new system implements inactivity-based token expiration where:
- Tokens expire if the user has been inactive for more than 20 minutes
- Active users can continue working without interruption
- Inactive users are automatically logged out for security
- The system tracks user activity through API calls and logs

## Architecture

### Backend Components

#### 1. Custom JWT Strategy (`backend/core/inactivity_jwt_strategy.py`)
- Extends FastAPI Users' JWT strategy
- Checks user activity from logs during token validation
- Rejects tokens if user has been inactive for too long
- Configurable inactivity threshold (default: 20 minutes)

#### 2. Activity Tracking Middleware (`backend/core/activity_middleware.py`)
- Logs all authenticated API requests
- Tracks user activity for inactivity detection
- Excludes certain paths from activity tracking (docs, logs, etc.)
- Provides detailed activity logs with timestamps

#### 3. Updated Authentication Configuration (`backend/routes/users.py`)
- Uses the new `InactivityJWTStrategy` instead of standard JWT strategy
- Provides configuration endpoint for frontend
- Configurable inactivity threshold and token lifetime

### Frontend Components

#### 1. Enhanced Auth Utilities (`frontend/src/utils/authUtils.js`)
- Better error handling for inactivity-based expiration
- Fetches configuration from server
- Provides inactivity-specific error messages
- Activity checking utilities

#### 2. Updated Auth Status Component (`frontend/src/components/AuthStatus.jsx`)
- Shows inactivity warnings
- Displays last activity timestamp
- Provides refresh functionality
- Different UI for inactivity vs. time-based expiration

## Configuration

### Backend Configuration

The inactivity threshold is configured in `backend/routes/users.py`:

```python
def get_jwt_strategy() -> InactivityJWTStrategy:
    return InactivityJWTStrategy(
        secret=SECRET, 
        lifetime_seconds=3600,  # 1 hour max lifetime
        inactivity_threshold_minutes=20  # 20 minutes inactivity threshold
    )
```

### Frontend Configuration

The frontend fetches configuration from `/api/auth/config`:

```javascript
const config = await fetch('/api/auth/config').then(r => r.json());
const inactivityThreshold = config.inactivity_threshold_minutes; // 20
```

## How It Works

### 1. Token Generation
When a user logs in, a JWT token is generated with:
- Standard JWT claims (sub, aud, iat, exp)
- Additional `issued_at` timestamp for inactivity tracking
- Maximum lifetime of 1 hour (fallback security)

### 2. Activity Tracking
Every authenticated API request is logged with:
- User ID
- Timestamp
- Operation type
- Request details
- Response status

### 3. Token Validation
When validating a token, the system:
1. Validates standard JWT claims
2. Checks user activity from recent logs
3. Rejects token if user has been inactive for > 20 minutes
4. Logs security events for rejected tokens

### 4. Frontend Monitoring
The frontend:
- Checks token validity every 30 seconds
- Checks user activity every 2 minutes
- Shows warnings for impending expiration
- Provides clear feedback for inactivity expiration

## API Endpoints

### Authentication Configuration
```
GET /api/auth/config
```

Response:
```json
{
  "inactivity_threshold_minutes": 20,
  "max_token_lifetime_hours": 1,
  "features": {
    "inactivity_based_expiration": true
  }
}
```

### Activity Logs
```
GET /api/logs/recent?category=AUDIT&user_id={user_id}
```

## Security Considerations

### 1. Activity Logging
- All authenticated requests are logged
- Logs include user ID, timestamp, and operation details
- Logs are used for inactivity detection only
- No sensitive data is logged

### 2. Token Security
- Tokens still have a maximum lifetime (1 hour)
- Inactivity check is additional security layer
- Failed token validations are logged
- Conservative approach: errors result in token rejection

### 3. Privacy
- Activity logs are stored locally
- No external tracking or analytics
- Users can view their own activity logs
- Logs are rotated and cleaned up automatically

## User Experience

### Active Users
- No interruption during active work
- Tokens remain valid as long as user is active
- Clear warnings before expiration
- Easy refresh functionality

### Inactive Users
- Automatic logout after 20 minutes of inactivity
- Clear explanation of why session expired
- Simple re-authentication process
- Security benefit of automatic logout

### Error Handling
- Clear error messages for inactivity expiration
- Graceful handling of network errors
- Fallback to time-based expiration if needed
- User-friendly recovery options

## Testing

### Manual Testing
1. Login to the application
2. Make some API calls (create nodes, graphs, etc.)
3. Wait for 20+ minutes without activity
4. Try to make an API call - should be rejected
5. Login again - should work normally

### Automated Testing
Run the test script:
```bash
python test_inactivity_expiration.py
```

This script:
- Creates a test user
- Makes API calls to generate activity
- Simulates inactivity periods
- Verifies token expiration behavior

## Monitoring and Debugging

### Log Categories
- `AUDIT`: User activity logs
- `SECURITY`: Token validation events
- `ERROR`: Token validation errors

### Key Log Messages
- "Token rejected due to user inactivity"
- "User {user_id} inactive for X minutes"
- "API request: {method} {path}"

### Debugging Commands
```bash
# View recent activity logs
curl "http://localhost:8000/api/logs/recent?category=AUDIT&limit=50"

# Check auth configuration
curl "http://localhost:8000/api/auth/config"

# View security events
curl "http://localhost:8000/api/logs/recent?category=SECURITY&limit=20"
```

## Migration Notes

### From Fixed Expiration
- Existing tokens will continue to work
- New tokens will use inactivity-based expiration
- No data migration required
- Backward compatible

### Configuration Changes
- Update `backend/routes/users.py` to use `InactivityJWTStrategy`
- Add activity tracking middleware to `backend/main.py`
- Update frontend auth utilities
- Test thoroughly before deployment

## Future Enhancements

### Potential Improvements
1. **Configurable Thresholds**: Allow users to set their own inactivity threshold
2. **Activity Types**: Different thresholds for different types of activity
3. **Grace Period**: Warning before automatic logout
4. **Session Recovery**: Ability to extend session with password
5. **Analytics**: Activity patterns and usage statistics

### Performance Optimizations
1. **Caching**: Cache recent activity for faster checks
2. **Batch Processing**: Process activity logs in batches
3. **Indexing**: Optimize log queries for inactivity checks
4. **Cleanup**: Automatic cleanup of old activity logs

## Troubleshooting

### Common Issues

#### 1. Tokens Expiring Too Quickly
- Check inactivity threshold configuration
- Verify activity logging is working
- Check for network issues affecting API calls

#### 2. Tokens Not Expiring
- Verify inactivity check is enabled
- Check log rotation settings
- Ensure activity tracking middleware is active

#### 3. Performance Issues
- Monitor log file sizes
- Check activity log query performance
- Consider reducing log retention period

### Debug Steps
1. Check authentication configuration
2. Verify activity logs are being created
3. Test token validation manually
4. Review security event logs
5. Check frontend error handling

## Conclusion

The inactivity-based token expiration system provides a better user experience while maintaining security. Active users can work without interruption, while inactive users are automatically logged out for security. The system is configurable, monitorable, and provides clear feedback to users. 