# Order Service - API Reference

## Quick Reference

**Base URL:** `http://localhost:3003/api/orders`

All requests require JWT authentication token.

---

## Endpoints Summary

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/` | Create new order | user |
| GET | `/me` | Get user's orders | user |
| GET | `/:id` | Get order details | user, admin |
| POST | `/:id/cancel` | Cancel order | user |
| PATCH | `/:id/address` | Update address | user |

---

## Request/Response Examples

### 1. POST / Create Order

**Request:**
```bash
curl -X POST http://localhost:3003/api/orders/ \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "address": {
      "addressLine": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "pincode": "10001",
      "country": "USA"
    }
  }'
```

**Alternative format (direct shippingAddress):**
```bash
curl -X POST http://localhost:3003/api/orders/ \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "street": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "country": "USA"
    }
  }'
```

**Note:** You can pass either `address` (as saved in user profile) or `shippingAddress` (direct format). The system will automatically convert `address` format to `shippingAddress` format. Default country is "India" if not provided.

**Success Response (201):**
```json
{
  "order": {
    "_id": "65a3b4c2d1e2f3g4h5i6j7k8",
    "user": "60a1b2c3d4e5f6g7h8i9j0k1",
    "items": [
      {
        "_id": "65a3b4c2d1e2f3g4h5i6j7k9",
        "product": "60a1b2c3d4e5f6g7h8i9j0k2",
        "quantity": 2,
        "price": {
          "amount": 1500,
          "currency": "INR"
        }
      }
    ],
    "status": "PENDING",
    "totalPrice": {
      "amount": 3000,
      "currency": "INR"
    },
    "shippingAddress": {
      "_id": "65a3b4c2d1e2f3g4h5i6j7ka",
      "street": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "country": "USA"
    },
    "createdAt": "2024-01-15T10:30:45.123Z",
    "updatedAt": "2024-01-15T10:30:45.123Z",
    "__v": 0
  }
}
```

**Error Response (400 - Validation Error):**
```json
{
  "errors": [
    {
      "type": "field",
      "value": "",
      "msg": "Street/AddressLine is required",
      "path": "shippingAddress.street",
      "location": "body"
    }
  ]
}
```

---

### 2. GET /me Get My Orders

**Request:**
```bash
curl -X GET "http://localhost:3003/api/orders/me?page=1&limit=10" \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

**Success Response (200):**
```json
{
  "orders": [
    {
      "_id": "65a3b4c2d1e2f3g4h5i6j7k8",
      "user": "60a1b2c3d4e5f6g7h8i9j0k1",
      "items": [...],
      "status": "PENDING",
      "totalPrice": {
        "amount": 3000,
        "currency": "INR"
      },
      "shippingAddress": {...},
      "createdAt": "2024-01-15T10:30:45.123Z",
      "updatedAt": "2024-01-15T10:30:45.123Z"
    }
  ],
  "meta": {
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

---

### 3. GET /:id Get Order by ID

**Request:**
```bash
curl -X GET http://localhost:3003/api/orders/65a3b4c2d1e2f3g4h5i6j7k8 \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

**Success Response (200):**
```json
{
  "order": {
    "_id": "65a3b4c2d1e2f3g4h5i6j7k8",
    "user": "60a1b2c3d4e5f6g7h8i9j0k1",
    "items": [...],
    "status": "PENDING",
    "totalPrice": {...},
    "shippingAddress": {...},
    "createdAt": "2024-01-15T10:30:45.123Z",
    "updatedAt": "2024-01-15T10:30:45.123Z"
  }
}
```

**Error Response (404):**
```json
{
  "message": "Order not found"
}
```

**Error Response (403):**
```json
{
  "message": "Forbidden: You do not have access to this order"
}
```

---

### 4. POST /:id/cancel Cancel Order

**Request:**
```bash
curl -X POST http://localhost:3003/api/orders/65a3b4c2d1e2f3g4h5i6j7k8/cancel \
  -H "Authorization: Bearer {JWT_TOKEN}"
```

**Success Response (200):**
```json
{
  "order": {
    "_id": "65a3b4c2d1e2f3g4h5i6j7k8",
    "user": "60a1b2c3d4e5f6g7h8i9j0k1",
    "items": [...],
    "status": "CANCELLED",
    "totalPrice": {...},
    "shippingAddress": {...},
    "createdAt": "2024-01-15T10:30:45.123Z",
    "updatedAt": "2024-01-15T10:35:20.456Z"
  }
}
```

**Error Response (409):**
```json
{
  "message": "Order cannot be cancelled at this stage"
}
```

---

### 5. PATCH /:id/address Update Address

**Request:**
```bash
curl -X PATCH http://localhost:3003/api/orders/65a3b4c2d1e2f3g4h5i6j7k8/address \
  -H "Authorization: Bearer {JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "street": "456 Oak Avenue",
      "city": "Boston",
      "state": "MA",
      "pincode": "02101",
      "country": "USA"
    }
  }'
```

**Success Response (200):**
```json
{
  "order": {
    "_id": "65a3b4c2d1e2f3g4h5i6j7k8",
    "user": "60a1b2c3d4e5f6g7h8i9j0k1",
    "items": [...],
    "status": "PENDING",
    "totalPrice": {...},
    "shippingAddress": {
      "_id": "65a3b4c2d1e2f3g4h5i6j7ka",
      "street": "456 Oak Avenue",
      "city": "Boston",
      "state": "MA",
      "zip": "02101",
      "country": "USA"
    },
    "createdAt": "2024-01-15T10:30:45.123Z",
    "updatedAt": "2024-01-15T10:40:15.789Z"
  }
}
```

---

## HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | GET request successful |
| 201 | Created | Order created successfully |
| 400 | Bad Request | Validation error in request |
| 401 | Unauthorized | Invalid or missing token |
| 403 | Forbidden | User not authorized |
| 404 | Not Found | Order not found |
| 409 | Conflict | Cannot cancel non-PENDING order |
| 500 | Server Error | Internal server error |

---

## Authentication

### Token Format
```
Authorization: Bearer {JWT_TOKEN}
```

### Cookie Alternative
```
Cookie: token={JWT_TOKEN}
```

### Token Generation
Tokens are provided by the Auth Service. Include them in all requests.

---

## Query Parameters

### Pagination (GET /me)
```
page    - Page number (default: 1)
limit   - Items per page (default: 10)
```

Example:
```
GET /api/orders/me?page=2&limit=20
```

---

## Validation Rules

### Shipping Address
```
street    - Required, string, non-empty
city      - Required, string, non-empty
state     - Required, string, non-empty
pincode   - Required, string, min 4 digits
country   - Required, string, non-empty
```

### Example Valid Address
```json
{
  "street": "123 Main Street",
  "city": "New York",
  "state": "NY",
  "pincode": "10001",
  "country": "USA"
}
```

---

## Order Status Flow

```
┌─────────┐
│ PENDING │ ← New order created
└────┬────┘
     │
     ├─→ CONFIRMED → SHIPPED → DELIVERED
     │
     └─→ CANCELLED
```

**Status Descriptions:**
- **PENDING:** Order created, awaiting confirmation
- **CONFIRMED:** Order confirmed, preparing for shipment
- **SHIPPED:** Order dispatched to customer
- **DELIVERED:** Order received by customer
- **CANCELLED:** Order cancelled by user (only from PENDING)

---

## Common Errors

### Missing Authentication Token
```json
{
  "message": "Unauthorized: No token provided"
}
```
**Fix:** Add `Authorization: Bearer {token}` header

### Invalid Token
```json
{
  "message": "Unauthorized: Invalid token"
}
```
**Fix:** Ensure token is valid and not expired

### Order Not Found
```json
{
  "message": "Order not found"
}
```
**Fix:** Verify order ID is correct

### Insufficient Stock
```json
{
  "message": "Internal server error",
  "error": "Product {name} is out of stock or insufficient stock"
}
```
**Fix:** Reduce quantity in cart

### Cannot Cancel Non-PENDING Order
```json
{
  "message": "Order cannot be cancelled at this stage"
}
```
**Fix:** Only PENDING orders can be cancelled

---

## Testing with cURL

### Get auth token from Auth Service first
```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq .token
```

### Save token as environment variable
```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r .token)
```

### Use token in requests
```bash
curl -X GET http://localhost:3003/api/orders/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## Rate Limiting

Currently no rate limiting implemented. Consider adding for production:

Recommended approach:
- 100 requests per minute per user
- 1000 requests per minute per IP

---

## Pagination Guide

### Request Multiple Pages
```bash
# Get first page
GET /api/orders/me?page=1&limit=10

# Get second page
GET /api/orders/me?page=2&limit=10

# Get all with smaller limit
GET /api/orders/me?page=1&limit=100
```

### Response Structure
```json
{
  "orders": [...],
  "meta": {
    "total": 25,      // Total number of orders
    "page": 1,        // Current page
    "limit": 10       // Items per page
  }
}
```

### Calculate Total Pages
```
totalPages = Math.ceil(meta.total / meta.limit)
```

---

## Best Practices

1. **Always include Authorization header**
2. **Use pagination for GET /me to handle large datasets**
3. **Validate input before sending to API**
4. **Handle all error codes in client application**
5. **Use meaningful error messages in UI**
6. **Cache frequently accessed orders**
7. **Implement retry logic for network failures**
8. **Log API calls for debugging**

---

## Version History

- **v1.0.0** (Jan 2024) - Initial release with 5 main endpoints

---

Generated: April 2026
