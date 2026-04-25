# User Management API - Bruno Collection

This directory contains the Bruno API documentation and test collection for the User Management API.

## Overview

The User Management API is a RESTful service built with Go and Gin framework that provides endpoints for managing user data.

**Base URL**: `http://localhost:8080`  
**API Version**: `v1`  
**Full API URL**: `http://localhost:8080/api/v1`

## Getting Started

### Prerequisites

- [Bruno](https://www.usebruno.com/) - API testing and documentation tool
- Go application running on `localhost:8080`

### Installation

1. Open Bruno application
2. Click "Open Collection"
3. Navigate to `docs/bruno/User Management API`
4. Select the collection folder

### Environment Variables

The collection uses the following environment variables (configured in `environment.bru`):

| Variable | Default | Description |
|----------|---------|-------------|
| `base_url` | `http://localhost:8080` | Server base URL |
| `api_version` | `v1` | API version |
| `api_url` | `http://localhost:8080/api/v1` | Full API endpoint |

You can override these in Bruno's environment settings.

## API Endpoints

### Users Management

#### 1. Create User
- **Method**: `POST`
- **Endpoint**: `/api/v1/users`
- **File**: `Users/Create User.bru`

Create a new user with name, email, and password.

**Request Body**:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securePassword123"
}
```

**Response** (201 Created):
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com"
}
```

#### 2. List All Users
- **Method**: `GET`
- **Endpoint**: `/api/v1/users`
- **File**: `Users/List All Users.bru`

Retrieves all users in the system.

**Response** (200 OK):
```json
{
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com"
    }
  ]
}
```

#### 3. Get User by ID
- **Method**: `GET`
- **Endpoint**: `/api/v1/users/:id`
- **File**: `Users/Get User by ID.bru`

Retrieves a specific user by their ID.

**URL Parameters**:
- `id` (integer, required): User's unique identifier

**Response** (200 OK):
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com"
}
```

#### 4. Update User
- **Method**: `PUT`
- **Endpoint**: `/api/v1/users/:id`
- **File**: `Users/Update User.bru`

Updates an existing user. All fields are optional.

**URL Parameters**:
- `id` (integer, required): User's unique identifier

**Request Body** (all fields optional):
```json
{
  "name": "John Smith",
  "email": "john.smith@example.com",
  "password": "newSecurePassword123"
}
```

**Response** (200 OK):
```json
{
  "id": 1,
  "name": "John Smith",
  "email": "john.smith@example.com"
}
```

#### 5. Delete User
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/users/:id`
- **File**: `Users/Delete User.bru`

Deletes a user from the system.

**URL Parameters**:
- `id` (integer, required): User's unique identifier

**Response** (204 No Content)

---

### System Endpoints

#### 1. Health Check
- **Method**: `GET`
- **Endpoint**: `/api/v1/health`
- **File**: `System/Health Check.bru`

Checks if the API server is running and healthy.

**Response** (200 OK):
```json
{
  "status": "healthy"
}
```

#### 2. Ready Check
- **Method**: `GET`
- **Endpoint**: `/api/v1/ready`
- **File**: `System/Ready Check.bru`

Checks if the API is ready to serve requests. Verifies database connection.

**Response** (200 OK):
```json
{
  "status": "ready"
}
```

**Response** (503 Service Unavailable):
```json
{
  "status": "not ready"
}
```

---

## Validation Rules

### User Creation & Update

| Field | Rules |
|-------|-------|
| `name` | Required, string |
| `email` | Required, must be valid email format |
| `password` | Required on creation, minimum 6 characters |

### Error Codes

| Code | Meaning |
|------|---------|
| `400` | Bad Request - Invalid input or validation errors |
| `404` | Not Found - User does not exist |
| `409` | Conflict - Email already exists |
| `500` | Internal Server Error - Server error |
| `503` | Service Unavailable - Database connection failed |

---

## Testing Workflow

### Basic User CRUD Flow

1. **Create a User** - Use "Create User" request
2. **List All Users** - Use "List All Users" to verify creation
3. **Get User by ID** - Use the ID from creation response
4. **Update User** - Modify user details
5. **Verify Update** - Get user again to confirm changes
6. **Delete User** - Remove the user
7. **Verify Deletion** - Try to get the deleted user (should return 404)

### Health Checks

1. Before testing: Run "Health Check" to confirm server is running
2. Before database operations: Run "Ready Check" to ensure database is connected

---

## Tips & Best Practices

- Always verify the server is running before testing
- Use "Ready Check" before running database-dependent operations
- Store API responses in Bruno variables for use in subsequent requests
- The IDs in example requests (like `/users/1`) should be replaced with actual user IDs from your API
- Email addresses must be unique; attempting to create or update with a duplicate will return 409 Conflict

---

## Support

For issues with:
- **Bruno usage**: See [Bruno Documentation](https://docs.usebruno.com/)
- **API implementation**: Check the source code in the main project directory

