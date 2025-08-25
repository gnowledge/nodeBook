# NodeBook API Reference

This document provides comprehensive documentation for the NodeBook backend API endpoints.

---

## 🔗 **Base URL**

- **Development**: `http://localhost:3000`
- **Production**: Configured via environment variables

---

## 🔐 **Authentication**

Most API endpoints require JWT authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

---

## 📚 **API Endpoints**

### **Authentication**

#### **POST /api/auth/register**
Register a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

**Response:**
```json
{
  "token": "jwt-token",
  "user": {
    "id": "number",
    "username": "string",
    "email": "string",
    "isAdmin": "boolean"
  }
}
```

#### **POST /api/auth/login**
Authenticate an existing user.

**Request Body:**
```json
{
  "username": "string",
  "password": "string"
}
```

**Response:** Same as register endpoint.

#### **GET /api/auth/me**
Get current user information.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
{
  "id": "number",
  "username": "string",
  "email": "string",
  "isAdmin": "boolean"
}
```

---

### **Graphs**

#### **GET /api/graphs**
List all graphs for the authenticated user.

**Headers:** `Authorization: Bearer <token>`

**Response:**
```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "author": "string",
    "email": "string",
    "publication_state": "string",
    "created_at": "string",
    "updated_at": "string"
  }
]
```

#### **POST /api/graphs**
Create a new graph.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "name": "string",
  "description": "string",
  "author": "string",
  "email": "string"
}
```

**Response:** Created graph object.

#### **GET /api/graphs/:id**
Get a specific graph by ID.

**Headers:** `Authorization: Bearer <token>`

**Response:** Graph object with nodes, relations, and attributes.

#### **PUT /api/graphs/:id**
Update a graph.

**Headers:** `Authorization: Bearer <token>`

**Request Body:** Graph update data.

**Response:** Updated graph object.

#### **DELETE /api/graphs/:id**
Delete a graph.

**Headers:** `Authorization: Bearer <token>`

**Response:** Success message.

---

### **Public Graphs**

#### **GET /api/public/graphs**
List all public graphs (no authentication required).

**Response:** Array of public graph summaries.

#### **GET /api/public/graphs/:id**
Get a public graph by ID (no authentication required).

**Response:** Public graph data.

---

### **Health Check**

#### **GET /api/health**
Check API health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "string"
}
```

---

## 📊 **Data Models**

### **Graph**
```json
{
  "id": "string",
  "name": "string",
  "description": "string",
  "author": "string",
  "email": "string",
  "publication_state": "Private|P2P|Public",
  "created_at": "string",
  "updated_at": "string"
}
```

### **Node**
```json
{
  "id": "string",
  "base_name": "string",
  "options": {
    "role": "string",
    "parent_types": ["string"],
    "adjective": "string"
  }
}
```

### **Relation**
```json
{
  "id": "string",
  "source": "string",
  "target": "string",
  "name": "string"
}
```

### **Attribute**
```json
{
  "id": "string",
  "source": "string",
  "name": "string",
  "value": "string|number",
  "isDerived": "boolean"
}
```

---

## 🚨 **Error Handling**

All endpoints return appropriate HTTP status codes:

- **200**: Success
- **201**: Created
- **400**: Bad Request
- **401**: Unauthorized
- **403**: Forbidden
- **404**: Not Found
- **500**: Internal Server Error

**Error Response Format:**
```json
{
  "error": "string",
  "message": "string",
  "details": "object"
}
```

---

## 🔧 **Development**

### **Running Locally**
```bash
cd nodebook-base
npm install
npm start
```

### **Environment Variables**
```bash
PORT=3000
JWT_SECRET=your-secret-key
DB_PATH=./data
```

---

## 📖 **Additional Resources**

- **[Developer Notes](./Developer-Notes.md)**: Technical implementation details
- **[Schema Guide](./Schema-Guide.md)**: Schema definition and validation
- **[CNL Help](./CNL-Help.md)**: Controlled Natural Language syntax
- **[Help Documentation](./Help.md)**: User guide and examples

---

## 🆘 **Support**

- **GitHub Issues**: [Report problems](https://github.com/gnowledge/nodeBook/issues)
- **Discussions**: [Ask questions](https://github.com/gnowledge/nodeBook/discussions)
- **Documentation**: [Browse guides](./Help.md)

---

**Ready to integrate?** Use these endpoints to build custom clients or integrate NodeBook with other systems!
