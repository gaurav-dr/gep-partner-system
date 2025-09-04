# GEP Partner System - API Documentation

## API Overview

The GEP Partner System provides a comprehensive RESTful API for managing healthcare partner assignments, customer requests, and optimization workflows. The API follows standard REST conventions with JSON request/response format.

**Base URL**: `http://localhost:3001` (development) or `https://yourdomain.com/api` (production)

## Authentication

All API endpoints (except authentication endpoints) require JWT authentication via the `Authorization` header:

```http
Authorization: Bearer <jwt_token>
```

### Rate Limiting

- **General API**: 100 requests per 15 minutes per IP
- **Authentication endpoints**: 10 requests per 15 minutes per IP  
- **Password reset**: 3 requests per hour per IP

## API Endpoints

### Authentication (`/api/auth`)

#### Register User
```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "partner"
}
```

**Validation Rules:**
- Password minimum 8 characters
- Valid roles: `partner`, `manager`, `admin`, `client`
- Email must be valid format

**Response:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "partner"
  },
  "token": "jwt_token_here"
}
```

#### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

#### Other Auth Endpoints
- `POST /api/auth/refresh` - Refresh JWT token
- `GET /api/auth/me` - Get current user profile
- `PUT /api/auth/change-password` - Change user password
- `POST /api/auth/request-password-reset` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/users` - List users (admin only)

### Customer Requests (`/api/customer-requests`)

#### Create Customer Request
```http
POST /api/customer-requests
```

**Request Body:**
```json
{
  "client_name": "Acme Corporation",
  "installation_address": "123 Business St, Athens, Greece",
  "service_type": "occupational_doctor",
  "employee_count": 150,
  "installation_category": "B",
  "work_hours": "08:00-17:00",
  "start_date": "2024-01-15T00:00:00.000Z",
  "end_date": "2024-12-31T00:00:00.000Z",
  "special_requirements": "Medical equipment needed",
  "estimated_hours": 40,
  "max_budget": 5000,
  "preferred_partner_id": "R12345"
}
```

**Validation:**
- `service_type`: `occupational_doctor` or `safety_engineer`
- `installation_category`: A, B, or C
- `preferred_partner_id`: Format R##### (optional)
- `employee_count`: 1-10,000
- `estimated_hours`: 1-1,000

#### Get All Requests
```http
GET /api/customer-requests?page=1&limit=20&status=pending
```

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `status`: Filter by status
- `service_type`: Filter by service type
- `client_name`: Search by client name

#### Other Customer Request Endpoints
- `GET /api/customer-requests/:id` - Get specific request
- `PUT /api/customer-requests/:id` - Update request
- `DELETE /api/customer-requests/:id` - Delete request

### Partners (`/api/partners`)

#### Create Partner
```http
POST /api/partners
```

**Request Body:**
```json
{
  "id": "R12345",
  "name": "Dr. Maria Papadopoulos",
  "specialty": "Occupational Medicine",
  "city": "Athens",
  "hourly_rate": 85,
  "max_hours_per_week": 40,
  "email": "maria@example.com",
  "phone": "+30 210 1234567",
  "is_active": true
}
```

#### Get Partners with Filtering
```http
GET /api/partners?is_active=true&specialty=medicine&city=Athens&page=1&limit=20
```

#### Other Partner Endpoints
- `GET /api/partners/:id` - Get specific partner
- `PUT /api/partners/:id` - Update partner
- `DELETE /api/partners/:id` - Deactivate partner

### Assignments (`/api/assignments`)

#### Get Assignments
```http
GET /api/assignments?status=pending&partner_id=R12345&page=1&limit=20
```

#### Get Pending Assignments
```http
GET /api/assignments/pending
```

#### Respond to Assignment
```http
PUT /api/assignments/:id/response
```

**Request Body:**
```json
{
  "response": "accepted",
  "message": "Available for this assignment"
}
```

**Response Values:**
- `accepted` - Partner accepts assignment
- `rejected` - Partner rejects assignment
- `counter_proposal` - Partner proposes changes

### Optimization (`/api/optimization`)

#### Run Partner Assignment Optimization
```http
POST /api/optimization/assign
```

**Request Body:**
```json
{
  "requestId": 123,
  "forceReassign": false,
  "constraints": {
    "maxDistance": 50,
    "preferredPartners": ["R12345"],
    "excludedPartners": ["R67890"],
    "maxHourlyRate": 100
  }
}
```

**Response:**
```json
{
  "success": true,
  "assignment": {
    "partnerId": "R12345",
    "requestId": 123,
    "score": 0.92,
    "reasons": ["Geographic proximity", "Cost efficiency", "Availability"]
  },
  "alternatives": [
    {
      "partnerId": "R23456",
      "score": 0.87,
      "reasons": ["Specialization match", "Availability"]
    }
  ],
  "processingTime": 450
}
```

### Analytics (`/api/analytics`)

#### Dashboard Statistics
```http
GET /api/analytics/dashboard
```

**Response:**
```json
{
  "totalRequests": 245,
  "activePartners": 18,
  "pendingAssignments": 12,
  "avgResponseTime": "4.2 hours",
  "recentActivity": [
    {
      "type": "assignment_created",
      "timestamp": "2024-01-15T10:30:00Z",
      "description": "New assignment for R12345"
    }
  ]
}
```

#### Partner Utilization
```http
GET /api/analytics/utilization?startDate=2024-01-01&endDate=2024-01-31
```

#### Cost Analysis
```http
GET /api/analytics/costs?period=month&groupBy=service_type
```

#### Performance Metrics
```http
GET /api/analytics/performance?metric=response_time&period=week
```

### Admin Operations (`/api/admin`)

#### Reset System Data
```http
POST /api/admin/reset-to-excel-data
```

**Authorization:** Admin role required

## AI Integration Endpoints

### Anthropic AI Integration

The system integrates with Anthropic's Claude AI for intelligent scheduling and optimization recommendations.

#### AI-Powered Scheduling Suggestions
```http
POST /api/optimization/ai-schedule
```

**Request Body:**
```json
{
  "requestId": 123,
  "context": {
    "urgency": "high",
    "constraints": ["geographic", "cost"],
    "preferences": ["experienced_partner"]
  }
}
```

**Response:**
```json
{
  "suggestions": [
    {
      "partnerId": "R12345",
      "confidence": 0.95,
      "reasoning": "Best match based on proximity and expertise",
      "schedule": {
        "start": "2024-01-20T09:00:00Z",
        "duration": 240
      }
    }
  ],
  "aiInsights": {
    "summary": "Optimal assignment considering all factors",
    "considerations": [
      "Partner R12345 has highest success rate with similar cases",
      "Geographic proximity reduces travel costs by 30%"
    ]
  }
}
```

## Error Responses

### Standard Error Format
```json
{
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {
    "field": "validation_error_details"
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (authentication required)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate resource)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

### Error Codes

#### Authentication Errors
- `INVALID_CREDENTIALS` - Login failed
- `TOKEN_EXPIRED` - JWT token expired
- `INSUFFICIENT_PERMISSIONS` - Access denied
- `RATE_LIMIT_EXCEEDED` - Too many requests

#### Validation Errors
- `MISSING_REQUIRED_FIELDS` - Required fields missing
- `INVALID_EMAIL_FORMAT` - Email format invalid
- `WEAK_PASSWORD` - Password doesn't meet requirements
- `INVALID_PARTNER_ID` - Partner ID format incorrect

#### Business Logic Errors
- `PARTNER_NOT_AVAILABLE` - Partner unavailable for assignment
- `REQUEST_ALREADY_ASSIGNED` - Request already has assignment
- `OPTIMIZATION_FAILED` - Assignment optimization failed

## Request/Response Headers

### Required Headers
```http
Content-Type: application/json
Authorization: Bearer <jwt_token>
```

### Response Headers
```http
Content-Type: application/json
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
```

## WebSocket Events

For real-time updates, the system supports WebSocket connections:

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:3001/ws');

// Listen for events
ws.on('assignment_created', (data) => {
  console.log('New assignment:', data);
});

ws.on('request_status_changed', (data) => {
  console.log('Request status updated:', data);
});
```

### WebSocket Event Types
- `assignment_created` - New assignment created
- `assignment_responded` - Partner responded to assignment
- `request_status_changed` - Request status updated
- `partner_availability_changed` - Partner availability updated

## SDK Example (JavaScript)

```javascript
class GEPApiClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async createRequest(requestData) {
    const response = await fetch(`${this.baseUrl}/api/customer-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify(requestData)
    });
    return response.json();
  }

  async optimizeAssignment(requestId, constraints = {}) {
    const response = await fetch(`${this.baseUrl}/api/optimization/assign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ requestId, constraints })
    });
    return response.json();
  }
}

// Usage
const client = new GEPApiClient('http://localhost:3001', 'your_jwt_token');
const result = await client.optimizeAssignment(123, { maxDistance: 30 });
```

---

*This API documentation provides comprehensive coverage of all endpoints, parameters, and response formats for the GEP Partner Assignment System.*