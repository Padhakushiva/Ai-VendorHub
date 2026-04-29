# Order Service Documentation

## Overview

The **Order Service** is a microservice responsible for managing orders in the AI Vendor Hub platform. It handles order creation, retrieval, cancellation, and address updates. This service integrates with the Cart Service and Product Service to create and manage orders.

**Service Port:** 3003  
**Base URL:** `http://localhost:3003`

---

## Table of Contents

1. [Architecture](#architecture)
2. [Technology Stack](#technology-stack)
3. [Installation & Setup](#installation--setup)
4. [Environment Variables](#environment-variables)
5. [API Endpoints](#api-endpoints)
6. [Database Models](#database-models)
7. [Middleware](#middleware)
8. [Broker Integration](#broker-integration)
9. [Error Handling](#error-handling)
10. [Testing](#testing)
11. [Docker Deployment](#docker-deployment)

---

## Architecture

### Folder Structure

```
order/
├── src/
│   ├── app.js                 # Express app configuration
│   ├── server.js              # Server entry point
│   ├── controllers/           # Business logic
│   │   └── order.controller.js
│   ├── routes/                # API route definitions
│   │   └── order.routes.js
│   ├── models/                # Database schemas
│   │   └── order.model.js
│   ├── middlewares/           # Custom middleware
│   │   ├── auth.middleware.js
│   │   └── validation.middleware.js
│   ├── db/                    # Database connection
│   │   └── db.js
│   └── broker/                # Message broker integration
│       └── broker.js
├── tests/                     # Test suite
│   ├── orders/
│   ├── setup/
│   └── jest.config.js
├── package.json
├── dockerfile
├── .env
└── README.md
```

---

## Technology Stack

| Technology | Purpose |
|------------|---------|
| **Express.js** | Web framework for building REST APIs |
| **MongoDB** | NoSQL database for storing orders |
| **Mongoose** | MongoDB object modeling |
| **JWT** | Authentication & authorization |
| **express-validator** | Request validation |
| **RabbitMQ** (amqplib) | Message broker for event publishing |
| **Axios** | HTTP client for inter-service communication |
| **Jest** | Testing framework |
| **Nodemon** | Development server with auto-reload |

---

## Installation & Setup

### Prerequisites
- Node.js (v18+)
- MongoDB database
- RabbitMQ server
- Cart Service (running on port 3002)
- Product Service (running on port 3000)

### Steps

1. **Navigate to the order folder:**
   ```bash
   cd order
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file** with required environment variables (see below)

4. **Start the service:**
   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

The service will start on `http://localhost:3003`

---

## Environment Variables

Create a `.env` file in the root of the order folder with these variables:

```env
# MongoDB Connection
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name

# JWT Secret
JWT_SECRET=your-jwt-secret-key

# Redis (optional)
REDIS_HOST=redis-host.redislabs.com
REDIS_PORT=10730
REDIS_PASSWORD=your-redis-password

# ImageKit (for file uploads)
IMAGEKIT_PUBLIC_KEY=your-public-key
IMAGEKIT_PRIVATE_KEY=your-private-key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your-endpoint

# RabbitMQ (if using message broker)
RABBIT_URL=amqp://username:password@rabbitmq-host:5672
```

---

## API Endpoints

### Base URL: `/api/orders`

All endpoints require authentication (JWT token in Authorization header or cookies).

---

### 1. **Create Order**

**POST** `/api/orders/`

Create a new order from the user's cart.

**Authentication:** Required (user role)

**Request Body:**
```json
{
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "pincode": "10001",
    "country": "USA"
  }
}
```

**Validation Rules:**
- `shippingAddress.street` - Required, string
- `shippingAddress.city` - Required, string
- `shippingAddress.state` - Required, string
- `shippingAddress.pincode` - Required, string, min 4 digits
- `shippingAddress.country` - Required, string

**Response (201 Created):**
```json
{
  "order": {
    "_id": "order-id",
    "user": "user-id",
    "items": [
      {
        "product": "product-id",
        "quantity": 2,
        "price": {
          "amount": 100,
          "currency": "INR"
        }
      }
    ],
    "status": "PENDING",
    "totalPrice": {
      "amount": 200,
      "currency": "INR"
    },
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "zip": "10001",
      "country": "USA"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses:**
- `400` - Validation error
- `500` - Product not found, insufficient stock, or cart service unavailable

---

### 2. **Get My Orders**

**GET** `/api/orders/me`

Retrieve all orders for the authenticated user with pagination.

**Authentication:** Required (user role)

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 10)

**Response (200 OK):**
```json
{
  "orders": [
    {
      "_id": "order-id",
      "user": "user-id",
      "items": [...],
      "status": "PENDING",
      "totalPrice": {...},
      "shippingAddress": {...},
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T10:30:00Z"
    }
  ],
  "meta": {
    "total": 5,
    "page": 1,
    "limit": 10
  }
}
```

**Example Request:**
```
GET /api/orders/me?page=1&limit=10
Authorization: Bearer {token}
```

---

### 3. **Get Order by ID**

**GET** `/api/orders/:id`

Retrieve details of a specific order.

**Authentication:** Required (user or admin role)

**Authorization:**
- Users can only view their own orders
- Admins can view any order

**Response (200 OK):**
```json
{
  "order": {
    "_id": "order-id",
    "user": "user-id",
    "items": [...],
    "status": "PENDING",
    "totalPrice": {...},
    "shippingAddress": {...},
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:30:00Z"
  }
}
```

**Error Responses:**
- `404` - Order not found
- `403` - Forbidden (no access to this order)

---

### 4. **Cancel Order**

**POST** `/api/orders/:id/cancel`

Cancel a pending order.

**Authentication:** Required (user role)

**Authorization:** User must be the order owner

**Restrictions:**
- Only orders with status `PENDING` can be cancelled

**Response (200 OK):**
```json
{
  "order": {
    "_id": "order-id",
    "user": "user-id",
    "items": [...],
    "status": "CANCELLED",
    "totalPrice": {...},
    "shippingAddress": {...},
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:35:00Z"
  }
}
```

**Error Responses:**
- `404` - Order not found
- `403` - Forbidden (not the order owner)
- `409` - Conflict (cannot cancel order at this stage)

---

### 5. **Update Order Address**

**PATCH** `/api/orders/:id/address`

Update the shipping address of a pending order.

**Authentication:** Required (user role)

**Authorization:** User must be the order owner

**Request Body:**
```json
{
  "shippingAddress": {
    "street": "456 Oak Ave",
    "city": "Boston",
    "state": "MA",
    "pincode": "02101",
    "country": "USA"
  }
}
```

**Validation Rules:**
- Same as Create Order validation

**Restrictions:**
- Only orders with status `PENDING` can have address updated

**Response (200 OK):**
```json
{
  "order": {
    "_id": "order-id",
    "user": "user-id",
    "items": [...],
    "status": "PENDING",
    "totalPrice": {...},
    "shippingAddress": {
      "street": "456 Oak Ave",
      "city": "Boston",
      "state": "MA",
      "zip": "02101",
      "country": "USA"
    },
    "createdAt": "2024-01-15T10:30:00Z",
    "updatedAt": "2024-01-15T10:40:00Z"
  }
}
```

**Error Responses:**
- `400` - Validation error
- `404` - Order not found
- `403` - Forbidden (not the order owner)
- `409` - Conflict (cannot update address at this stage)

---

## Database Models

### Order Schema

**Collection Name:** `orders`

```javascript
{
  user: ObjectId (required) // Reference to User
  items: [
    {
      product: ObjectId (required) // Reference to Product
      quantity: Number (min: 1, default: 1)
      price: {
        amount: Number (required)
        currency: String (enum: ["USD", "INR"], required)
      }
    }
  ]
  status: String (enum: ["PENDING", "CONFIRMED", "CANCELLED", "SHIPPED", "DELIVERED"])
  totalPrice: {
    amount: Number (required)
    currency: String (enum: ["USD", "INR"], required)
  }
  shippingAddress: {
    street: String
    city: String
    state: String
    zip: String
    country: String
  }
  createdAt: Timestamp (auto-generated)
  updatedAt: Timestamp (auto-generated)
}
```

**Order Status Flow:**
```
PENDING → CONFIRMED → SHIPPED → DELIVERED
   ↓
CANCELLED
```

---

## Middleware

### 1. Authentication Middleware
**File:** `src/middlewares/auth.middleware.js`

- Extracts JWT token from cookies or Authorization header
- Verifies token using JWT_SECRET
- Validates user role
- Attaches decoded user data to `req.user`

**Usage:**
```javascript
router.post("/", createAuthMiddleware(["user"]), controller.action)
router.get("/:id", createAuthMiddleware(["user", "admin"]), controller.action)
```

### 2. Validation Middleware
**File:** `src/middlewares/validation.middleware.js`

Validates request body using express-validator:

**Validators:**
- `createOrderValidation` - Validates shipping address for order creation
- `updateAddressValidation` - Validates shipping address for updates

**Validation Rules:**
- All address fields are required and must be strings
- Pincode must be at least 4 digits

---

## Broker Integration

### RabbitMQ Message Queue

**File:** `src/broker/broker.js`

The order service publishes events to RabbitMQ for other services to consume.

**Published Events:**

1. **ORDER_SELLER_DASHBOARD.ORDER_CREATED**
   - Published when an order is successfully created
   - Contains full order object

**Example:**
```javascript
await publishToQueue("ORDER_SELLER_DASHBOARD.ORDER_CREATED", {
  _id: "order-id",
  user: "user-id",
  items: [...],
  status: "PENDING",
  ...
})
```

---

## Error Handling

### HTTP Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success (GET, PATCH) |
| 201 | Created (POST) |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (no token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (business logic violation) |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "message": "Error description",
  "error": "Detailed error message"
}
```

### Validation Error Response

```json
{
  "errors": [
    {
      "type": "field",
      "value": "",
      "msg": "Street is required",
      "path": "shippingAddress.street",
      "location": "body"
    }
  ]
}
```

---

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm test -- --coverage
```

### Test Structure

```
tests/
├── setup/
│   ├── auth.js           # Mock authentication setup
│   ├── env.js            # Environment setup
│   └── mongodb.js        # MongoDB memory server setup
└── orders/
    ├── createOrder.test.js
    ├── getMyOrders.test.js
    ├── getOrderById.test.js
    ├── cancelOrder.test.js
    └── updateAddress.test.js
```

### Test Setup

- Uses Jest as the testing framework
- MongoDB Memory Server for isolated database testing
- Supertest for HTTP endpoint testing
- Mocks authentication using JWT tokens

### Example Test

```javascript
describe('Create Order', () => {
  it('should create order successfully', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        shippingAddress: {
          street: '123 Main St',
          city: 'New York',
          state: 'NY',
          pincode: '10001',
          country: 'USA'
        }
      })
    
    expect(response.status).toBe(201)
    expect(response.body.order).toBeDefined()
  })
})
```

---

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3003

CMD ["npm", "start"]
```

### Building Docker Image

```bash
docker build -t order-service:latest .
```

### Running Docker Container

```bash
docker run -p 3003:3003 \
  -e MONGO_URI=mongodb+srv://... \
  -e JWT_SECRET=... \
  order-service:latest
```

### Docker Compose Integration

```yaml
order-service:
  build: ./order
  ports:
    - "3003:3003"
  environment:
    - MONGO_URI=mongodb+srv://...
    - JWT_SECRET=...
  depends_on:
    - mongo
    - rabbitmq
```

---

## Integration with Other Services

### Cart Service
- **Endpoint:** `http://localhost:3002/api/cart`
- **Used in:** Create Order
- **Purpose:** Fetch user's cart items and clear after order

### Product Service
- **Endpoint:** `http://localhost:3000/api/product/:productId`
- **Used in:** Create Order
- **Purpose:** Validate product existence and check stock

---

## Troubleshooting

### Issue: "Unauthorized: No token provided"
- **Cause:** Missing JWT token in request
- **Solution:** Add Authorization header or cookie with valid JWT token

### Issue: "Product not found"
- **Cause:** Product ID doesn't exist or Product service is unavailable
- **Solution:** Verify product ID and ensure Product service is running

### Issue: "Insufficient stock"
- **Cause:** Requested quantity exceeds available stock
- **Solution:** Reduce quantity in cart and try again

### Issue: "RabbitMQ connection failed"
- **Cause:** RabbitMQ server is not running or RABBIT_URL is incorrect
- **Solution:** Ensure RabbitMQ is running and environment variable is set

### Issue: "MongoDB connection failed"
- **Cause:** Database is unavailable or MONGO_URI is incorrect
- **Solution:** Check MongoDB connection string and ensure database is accessible

---

## Development Workflow

1. **Start the service:**
   ```bash
   npm run dev
   ```

2. **Make changes** to the code

3. **Test your changes:**
   ```bash
   npm test
   ```

4. **Build Docker image:**
   ```bash
   docker build -t order-service:latest .
   ```

5. **Commit changes:**
   ```bash
   git add .
   git commit -m "Description of changes"
   git push origin branch-name
   ```

---

## Performance Optimization

- **Pagination:** Use `page` and `limit` query parameters to paginate large result sets
- **Indexes:** MongoDB indexes are automatically created on `user` field for faster queries
- **Caching:** Consider caching frequently accessed orders in Redis
- **Async Operations:** All database operations use async/await for non-blocking I/O

---

## Security Considerations

1. **JWT Authentication:** All endpoints require valid JWT token
2. **Role-Based Access Control:** Endpoints validate user roles
3. **Authorization Checks:** Users can only access their own orders (except admins)
4. **Input Validation:** All request data is validated using express-validator
5. **Environment Variables:** Sensitive data stored in `.env` file (not in code)
6. **CORS:** Configure CORS settings if calling from different domain

---

## Future Enhancements

- [ ] Add payment integration
- [ ] Implement order status notifications (email/SMS)
- [ ] Add order tracking functionality
- [ ] Implement refund system
- [ ] Add order analytics and reporting
- [ ] Implement rate limiting
- [ ] Add comprehensive logging
- [ ] Implement caching layer

---

## Contact & Support

For issues or questions about the Order Service, please reach out to the development team.

**Service Status:** Ready for production  
**Last Updated:** April 2026  
**Version:** 1.0.0
