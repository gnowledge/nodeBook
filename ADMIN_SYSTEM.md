# Admin System Documentation

## Overview

The NDF Studio admin system provides comprehensive user management capabilities with automatic first-user superuser promotion and a complete admin interface for user management.

## Features

### 1. Automatic First-User Superuser Promotion

- **Mechanism**: The first user to register in the system is automatically promoted to superuser status
- **Implementation**: Handled in `UserManager._make_first_user_superuser()` method
- **Logging**: All superuser promotions are logged with SECURITY level events
- **Safety**: Only applies to the very first user in the system

### 2. Admin User Management Interface

#### Backend API Endpoints

All admin endpoints require superuser privileges and are prefixed with `/auth/admin/`:

- `GET /auth/admin/users` - List all users with statistics
- `POST /auth/admin/users` - Create new user
- `PUT /auth/admin/users/{user_id}` - Update user details
- `POST /auth/admin/users/{user_id}/promote` - Promote user to superuser
- `POST /auth/admin/users/{user_id}/demote` - Demote superuser to regular user
- `DELETE /auth/admin/users/{user_id}` - Delete user
- `GET /auth/admin/stats` - Get system statistics

#### Frontend Admin Panel

- **Location**: Accessible via the "Admin" tab in the Knowledge Base panel
- **Access Control**: Only visible to superusers
- **Features**:
  - User listing with status indicators
  - Create new users
  - Edit existing users
  - Promote/demote users
  - Delete users
  - System statistics dashboard

## Security Features

### 1. Access Control

- All admin endpoints require superuser authentication
- Non-superusers receive 403 Forbidden responses
- Frontend hides admin panel from non-superusers

### 2. Self-Protection Mechanisms

- **Self-Demotion Prevention**: Admins cannot demote themselves
- **Self-Deletion Prevention**: Admins cannot delete themselves
- **Superuser Deletion Prevention**: Superusers cannot be deleted (configurable)

### 3. Audit Logging

All admin actions are logged with SECURITY level events:

```python
logger.security(
    f"Admin '{current_user.username}' promoted user '{user.username}' to superuser",
    event_type="admin_user_promotion",
    admin_user_id=str(current_user.id),
    promoted_user_id=str(user.id),
    promoted_username=user.username,
    reason=request.reason
)
```

## API Reference

### User Management Models

```python
class UserPromoteRequest(BaseModel):
    user_id: str
    reason: Optional[str] = None

class UserDemoteRequest(BaseModel):
    user_id: str
    reason: Optional[str] = None

class AdminUserCreate(BaseModel):
    username: str
    email: str
    password: str
    is_superuser: bool = False
    is_active: bool = True

class UserUpdateRequest(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None
```

### Endpoint Details

#### GET /auth/admin/users

**Response:**
```json
{
  "users": [
    {
      "id": "uuid",
      "username": "string",
      "email": "string",
      "is_active": true,
      "is_superuser": false,
      "is_verified": true,
      "created_at": "timestamp"
    }
  ],
  "total": 5,
  "superusers": 1,
  "active_users": 4
}
```

#### POST /auth/admin/users

**Request:**
```json
{
  "username": "newuser",
  "email": "newuser@example.com",
  "password": "securepassword",
  "is_superuser": false,
  "is_active": true
}
```

**Response:**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "username": "newuser",
    "email": "newuser@example.com",
    "is_active": true,
    "is_superuser": false
  }
}
```

#### PUT /auth/admin/users/{user_id}

**Request:**
```json
{
  "username": "updated_username",
  "email": "updated@example.com",
  "is_active": true,
  "is_superuser": false
}
```

#### POST /auth/admin/users/{user_id}/promote

**Request:**
```json
{
  "reason": "User needs admin access for project management"
}
```

#### POST /auth/admin/users/{user_id}/demote

**Request:**
```json
{
  "reason": "User no longer needs admin access"
}
```

#### DELETE /auth/admin/users/{user_id}

**Response:**
```json
{
  "message": "User 'username' deleted successfully"
}
```

#### GET /auth/admin/stats

**Response:**
```json
{
  "total_users": 10,
  "active_users": 8,
  "inactive_users": 2,
  "superusers": 2,
  "regular_users": 8,
  "system_info": {
    "first_user_created": true,
    "has_superusers": true
  }
}
```

## Frontend Integration

### Admin Panel Component

The `AdminPanel` component provides a complete user management interface:

- **User List**: Table view with user details and status indicators
- **Create User**: Modal form for creating new users
- **Edit User**: Modal form for updating user details
- **Actions**: Promote, demote, and delete buttons for each user
- **Statistics**: Dashboard showing system statistics

### Access Control

```jsx
{activeTab === "admin" && userInfo?.is_superuser && (
  <div className="p-4">
    <AdminPanel />
  </div>
)}
{activeTab === "admin" && !userInfo?.is_superuser && (
  <div className="p-4 text-center">
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      <strong>Access Denied:</strong> Admin privileges required to access this panel.
    </div>
  </div>
)}
```

## Testing

### Test Script

Run the comprehensive admin system test:

```bash
python test_admin_system.py
```

The test script verifies:

1. Automatic first-user superuser promotion
2. Admin user management operations
3. Access control and security measures
4. User promotion and demotion
5. User creation and deletion
6. System statistics
7. Self-protection mechanisms

### Manual Testing

1. **First User Registration**:
   - Register the first user in a fresh system
   - Verify they become superuser automatically
   - Check logs for promotion event

2. **Admin Panel Access**:
   - Login as superuser
   - Navigate to Knowledge Base → Admin tab
   - Verify admin panel is visible and functional

3. **User Management**:
   - Create new users via admin panel
   - Promote regular users to superuser
   - Demote superusers to regular users
   - Update user details
   - Delete users

4. **Access Control**:
   - Login as regular user
   - Verify admin panel is not accessible
   - Verify admin API endpoints return 403

## Configuration

### Environment Variables

No additional environment variables are required. The admin system uses existing authentication configuration.

### Database Schema

The admin system uses the existing User model with the `is_superuser` field:

```python
class User(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(nullable=False, unique=True, index=True)
    hashed_password: str = Field(nullable=False)
    is_active: bool = Field(default=True, nullable=False)
    is_superuser: bool = Field(default=False, nullable=False)
    is_verified: bool = Field(default=True, nullable=False)
    username: str = Field(nullable=False, unique=True, index=True)
```

## Troubleshooting

### Common Issues

1. **First user not promoted to superuser**:
   - Check if there are existing users in the database
   - Verify the `_make_first_user_superuser` method is called
   - Check logs for any errors

2. **Admin panel not visible**:
   - Verify user has `is_superuser: true`
   - Check browser console for errors
   - Verify the admin tab is added to DEV_PANEL_TABS

3. **Admin API endpoints returning 403**:
   - Verify user authentication
   - Check if user has superuser privileges
   - Verify token is valid and not expired

4. **User creation/deletion failing**:
   - Check database permissions
   - Verify user directory creation
   - Check logs for specific error messages

### Log Analysis

Admin actions are logged with specific event types:

- `first_user_superuser_promotion`
- `admin_user_creation`
- `admin_user_update`
- `admin_user_promotion`
- `admin_user_demotion`
- `admin_user_deletion`

Search logs for these event types to track admin activities.

## Security Considerations

1. **Token Security**: Admin operations require valid JWT tokens
2. **Audit Trail**: All admin actions are logged with detailed information
3. **Self-Protection**: Admins cannot accidentally remove their own privileges
4. **Access Control**: Non-superusers cannot access admin functionality
5. **Input Validation**: All user inputs are validated and sanitized

## Future Enhancements

1. **Role-Based Access Control**: Support for multiple admin roles
2. **Bulk Operations**: Batch user management operations
3. **User Activity Monitoring**: Track user login patterns and activity
4. **Advanced Statistics**: More detailed system usage analytics
5. **Email Notifications**: Notify users of role changes
6. **Two-Factor Authentication**: Enhanced security for admin accounts 