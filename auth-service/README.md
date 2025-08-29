# 🔐 NodeBook Authentication Microservice

This is a dedicated authentication microservice for NodeBook, handling all user authentication, authorization, and user management functions.

## 🏗️ **Architecture**

The authentication service is designed as a standalone microservice that:

- **Handles user authentication** independently from other services
- **Manages JWT tokens** for secure API access
- **Stores user data** in SQLite database
- **Provides RESTful API** for authentication operations
- **Integrates seamlessly** with other NodeBook microservices

## 🚀 **Features**

### **Core Authentication**
- User registration and login
- JWT token generation and validation
- Password hashing with bcrypt
- Session management

### **User Management**
- User profile management
- Password change functionality
- Admin user creation
- User data directory management

### **Security**
- Secure password hashing
- JWT token expiration
- CORS configuration
- Input validation

## 📡 **API Endpoints**

### **Health Check**
- `GET /api/health` - Service health status

### **Authentication**
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify` - JWT token verification

### **User Management**
- `GET /api/auth/profile/:username` - Get user profile
- `POST /api/auth/change-password` - Change user password

### **Admin Functions**
- `GET /api/admin/users` - List all users (admin only)

## 🔧 **Configuration**

### **Environment Variables**
```bash
NODE_ENV=development          # Environment mode
PORT=3005                     # Service port
JWT_SECRET=your-secret-key   # JWT signing secret
JWT_EXPIRES_IN=7d           # Token expiration time
ADMIN_PASSWORD=admin123      # Default admin password
```

### **Database Schema**
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    is_admin BOOLEAN DEFAULT 0,
    email_verified BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    data_directory TEXT NOT NULL
);
```

## 🐳 **Docker Deployment**

### **Build and Run**
```bash
# Build the image
docker build -t nodebook-auth-service .

# Run the container
docker run -d \
  --name nodebook-auth \
  -p 3005:3005 \
  -e JWT_SECRET=your-secret-key \
  -e ADMIN_PASSWORD=admin123 \
  nodebook-auth-service
```

### **Docker Compose Integration**
The service is integrated into the NodeBook P2P development environment:

```yaml
auth-service:
  build:
    context: ./auth-service
    dockerfile: Dockerfile
  ports:
    - "3005:3005"
  environment:
    - JWT_SECRET=dev-jwt-secret
    - ADMIN_PASSWORD=admin123
```

## 🧪 **Testing**

### **Run Tests**
```bash
# Install dependencies
npm install

# Run test suite
npm test

# Or run directly
node test-auth-service.js
```

### **Test Coverage**
The test suite covers:
- Health check functionality
- User registration and login
- JWT token verification
- User profile management
- Password change operations
- Admin functionality

## 🔗 **Integration with NodeBook**

### **Service Communication**
Other NodeBook services communicate with the authentication service via HTTP:

```javascript
// Example: Verify JWT token
const response = await fetch('http://auth-service:3005/api/auth/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ token: userToken })
});

if (response.data.success) {
  // Token is valid, proceed with request
  const user = response.data.user;
}
```

### **Data Directory Management**
The authentication service manages user data directories that are shared with other services:

```
nodebook-base/
├── user_data/
│   ├── admin/          # Admin user data
│   ├── user1/          # User 1 data
│   └── user2/          # User 2 data
```

## 🔒 **Security Considerations**

### **Password Security**
- Passwords are hashed using bcrypt with salt rounds
- Never store plain text passwords
- Support for password complexity requirements

### **JWT Security**
- Configurable token expiration
- Secure secret key management
- Token verification on each request

### **Data Privacy**
- User data is isolated by username
- No cross-user data access
- Secure data directory permissions

## 🚀 **Development**

### **Local Development**
```bash
# Clone the repository
git clone <repository-url>
cd auth-service

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

### **API Testing**
```bash
# Test health endpoint
curl http://localhost:3005/api/health

# Test user registration
curl -X POST http://localhost:3005/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'

# Test user login
curl -X POST http://localhost:3005/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"testpass"}'
```

## 📊 **Monitoring and Logging**

### **Health Checks**
- Built-in health check endpoint
- Docker health check integration
- Service status monitoring

### **Logging**
- Structured logging with Fastify
- Request/response logging
- Error tracking and debugging

## 🔄 **Future Enhancements**

### **Planned Features**
- Email verification system
- Password reset functionality
- Multi-factor authentication
- OAuth integration
- User roles and permissions

### **Scalability**
- Database connection pooling
- Redis session storage
- Load balancing support
- Horizontal scaling

---

**🎯 The authentication microservice provides a solid foundation for secure user management in the NodeBook ecosystem, enabling clean separation of concerns and scalable authentication architecture.**
