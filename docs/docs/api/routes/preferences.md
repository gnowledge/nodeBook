# Preferences Routes

Preferences routes manage user and system preferences for the NDF Studio application.

## Overview

The preferences routes module handles the storage, retrieval, and management of user preferences, system settings, and configuration options that customize the behavior of the NDF Studio application.

## Key Endpoints

### User Preferences
- `GET /preferences` - Get current user preferences
- `POST /preferences` - Create or update user preferences
- `PUT /preferences/{preference_id}` - Update specific preference
- `DELETE /preferences/{preference_id}` - Delete specific preference

### System Preferences
- `GET /preferences/system` - Get system-wide preferences
- `POST /preferences/system` - Update system preferences (admin only)
- `GET /preferences/defaults` - Get default preference values

### Preference Categories
- `GET /preferences/categories` - List available preference categories
- `GET /preferences/category/{category}` - Get preferences by category

## Usage Examples

### Getting User Preferences
```python
import requests

response = requests.get("http://localhost:8000/preferences")
preferences = response.json()
print(f"Theme: {preferences.get('theme', 'default')}")
print(f"Language: {preferences.get('language', 'en')}")
```

### Updating User Preferences
```python
new_preferences = {
    "theme": "dark",
    "language": "en",
    "auto_save": True,
    "notifications": {
        "email": True,
        "browser": False
    }
}

response = requests.post("http://localhost:8000/preferences", json=new_preferences)
```

### Getting System Preferences
```python
response = requests.get("http://localhost:8000/preferences/system")
system_prefs = response.json()
print(f"Max file size: {system_prefs['max_file_size']}")
```

## Preference Categories

Preferences are organized into categories:
- **Interface**: UI theme, language, layout
- **Behavior**: Auto-save, notifications, confirmations
- **Performance**: Cache settings, timeout values
- **Security**: Session timeout, authentication settings
- **Custom**: User-defined preferences

## Preference Schema

Preferences follow a structured schema:
```json
{
    "category": "interface",
    "key": "theme",
    "value": "dark",
    "type": "string",
    "description": "UI theme preference",
    "default": "light",
    "options": ["light", "dark", "auto"]
}
```

## Error Handling

- `200` - Success
- `400` - Invalid preference data
- `401` - Unauthorized (for system preferences)
- `404` - Preference not found
- `500` - Internal server error

## Dependencies

- User authentication system
- Preference storage backend
- Configuration management
- Validation utilities 