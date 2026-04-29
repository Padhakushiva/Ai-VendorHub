# 🏢 Ai-VendorHub - Complete Project Summary

**Project Status:** In Development  
**Last Updated:** April 28, 2026  
**Current Version:** 1.0.0

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [User Workflows & Flows](#user-workflows--flows)
4. [User Schema](#user-schema)
5. [Microservices](#microservices)
6. [API Documentation](#api-documentation)
   - [Authentication Service](#auth-service)
   - [Product Service](#product-service)
   - [Cart Service](#cart-service)
   - [Order Service](#order-service)
   - [Payment Service](#payment-service)
7. [Technology Stack](#technology-stack)
8. [Environment Configuration](#environment-configuration)

---

## 🎯 Project Overview

**Ai-VendorHub** is a full-stack e-commerce microservices application built with Node.js and Express.js. It provides a complete platform for:

- **User Management:** Registration, authentication, address management
- **Product Management:** Sellers can create and manage products; users can browse
- **Shopping Cart:** Add/remove items, manage quantities, view totals
- **Order Management:** Create orders, cancel orders, track order status
- **Payment Processing:** Process payments for orders

### Key Features

✅ Role-based access control (User, Seller, Admin)  
✅ JWT-based authentication  
✅ Real-time stock validation  
✅ Cart with dynamic pricing and shipping calculation  
✅ Order tracking and status management  
✅ Payment integration  
✅ RabbitMQ event publishing for inter-service communication  

---

## 🏗️ Architecture

### Microservices Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client Application                    │
└─────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   AUTH       │  │   PRODUCT    │  │    CART      │
│  Service     │  │   Service    │  │   Service    │
│  Port: 3001  │  │  Port: 3000  │  │  Port: 3002  │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                    ┌─────▼─────┐
                    │   ORDER    │
                    │  Service   │
                    │ Port: 3003 │
                    └─────┬─────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
              ▼           ▼           ▼
         ┌────────┐  ┌─────────┐  ┌─────────┐
         │MongoDB │  │RabbitMQ │  │ PAYMENT │
         │        │  │         │  │ Service │
         └────────┘  └─────────┘  └─────────┘
```

### Service Communication Flow

```
Client → Auth Service (Login) → JWT Token
Client + Token → Cart Service → Product Service (Stock Check)
Client + Token → Order Service → Cart Service (Fetch Items)
                              → Product Service (Validate Stock)
                              → RabbitMQ (Publish ORDER_CREATED)
Order Service → Payment Service → Process Payment
```

---

## � User Workflows & Flows

### 1️⃣ **Customer/User Journey - Shopping Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│                     NEW USER - REGISTRATION                     │
└─────────────────────────────────────────────────────────────────┘

Step 1: REGISTER
  POST /api/auth/register
  └─ Create account with username, email, password, name
  └─ Receive JWT token
  └─ Role assigned: 'user' (default)

Step 2: ADD SHIPPING ADDRESS (Optional but recommended before checkout)
  POST /api/auth/users/me/addresses
  └─ Add home/office address with pincode, phone
  └─ Can add multiple addresses
  └─ Mark one as default

Step 3: BROWSE PRODUCTS
  GET /api/product/
  └─ View all products with pagination
  └─ Filter by category, search by name
  └─ View product details (price, stock, seller, images)

Step 4: VIEW PRODUCT DETAILS
  GET /api/product/{productId}
  └─ See complete product info
  └─ Check stock availability
  └─ View seller information

Step 5: ADD TO CART
  POST /api/cart/items
  Headers: Authorization: Bearer {token}
  Body: { "productId": "...", "quantity": 5 }
  └─ System validates stock (Real-time check from Product Service)
  └─ Creates productSnapshot (stores product data at this moment)
  └─ Updates cart totals (subtotal + tax + shipping)

Step 6: VIEW CART
  GET /api/cart/
  Headers: Authorization: Bearer {token}
  └─ System re-validates stock for all items
  └─ Removes out-of-stock items
  └─ Shows updated totals:
     • Subtotal = sum of (price × quantity)
     • Tax = 10% of subtotal
     • Shipping = ₹100 if subtotal < ₹1000, else FREE
     • Total = subtotal + tax + shipping

Step 7: UPDATE CART QUANTITY (if needed)
  PATCH /api/cart/items/{productId}
  Headers: Authorization: Bearer {token}
  Body: { "quantity": 3 }
  └─ Update quantity
  └─ Set quantity=0 to remove item
  └─ Validates new stock availability
  └─ Updates totals

Step 8: CREATE ORDER
  POST /api/orders/
  Headers: Authorization: Bearer {token}
  Body: {
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "pincode": "100001",
      "country": "India"
    }
  }
  └─ Order fetches items from user's cart
  └─ Final stock validation on each item
  └─ Order created with status: PENDING
  └─ System publishes ORDER_CREATED event to RabbitMQ
  └─ Cart is cleared automatically
  └─ Returns order ID and order details

Step 9: PAY FOR ORDER (Coming Soon)
  POST /api/payment/create/{orderId}
  Headers: Authorization: Bearer {token}
  └─ Process payment for order
  └─ Update order status to CONFIRMED
  └─ Receive payment confirmation

Step 10: TRACK ORDER
  GET /api/orders/me
  Headers: Authorization: Bearer {token}
  └─ View all your orders with pagination
  └─ See order status, total, items, shipping address

Step 11: VIEW ORDER DETAILS
  GET /api/orders/{orderId}
  Headers: Authorization: Bearer {token}
  └─ See complete order information
  └─ Items with prices, status, shipping address

Step 12: CANCEL ORDER (If PENDING)
  POST /api/orders/{orderId}/cancel
  Headers: Authorization: Bearer {token}
  └─ Only works if order status is PENDING
  └─ Status changes to CANCELLED
  └─ Cannot cancel after order is confirmed/shipped

Step 13: UPDATE SHIPPING ADDRESS (If PENDING)
  PATCH /api/orders/{orderId}/address
  Headers: Authorization: Bearer {token}
  Body: {
    "shippingAddress": {
      "street": "456 Oak Ave",
      "city": "Los Angeles",
      "state": "CA",
      "pincode": "900001",
      "country": "India"
    }
  }
  └─ Change delivery address before order is confirmed
  └─ Only works for PENDING orders

Step 14: MANAGE ADDRESSES
  GET /api/auth/users/me/addresses
  └─ View all your addresses
  
  DELETE /api/auth/users/me/addresses/{addressId}
  └─ Delete an address you don't need

Step 15: LOGOUT
  GET /api/auth/logout
  Headers: Authorization: Bearer {token}
  └─ Sign out from platform
```

---

### 2️⃣ **Seller Journey - Product Management Flow**

```
┌─────────────────────────────────────────────────────────────────┐
│                   SELLER - PRODUCT MANAGEMENT                   │
└─────────────────────────────────────────────────────────────────┘

Step 1: REGISTER AS SELLER
  POST /api/auth/register
  Body: { ..., "role": "seller" }
  └─ Register with seller role (or admin can change role)
  └─ Receive JWT token

Step 2: CREATE PRODUCT
  POST /api/product/
  Headers: Authorization: Bearer {token}
  Content-Type: multipart/form-data
  Body: {
    "title": "iPhone 15",
    "description": "Latest iPhone",
    "price": { "amount": 79999, "currency": "INR" },
    "stock": 50,
    "category": "Electronics",
    "images": [file1, file2, ...] (max 5)
  }
  └─ Only sellers can create products
  └─ Product created with seller ID stored
  └─ Images uploaded and stored

Step 3: VIEW MY PRODUCTS
  GET /api/product/seller
  Headers: Authorization: Bearer {token}
  └─ See all products you created
  └─ Paginated view of your catalog

Step 4: UPDATE MY PRODUCT
  PATCH /api/product/{productId}
  Headers: Authorization: Bearer {token}
  Body: {
    "price": { "amount": 75999, "currency": "INR" },
    "stock": 45,
    "description": "Updated description"
  }
  └─ Update price, stock, description, etc.
  └─ Only can update own products (or admin can update any)
  └─ Changes reflected immediately in search/browse

Step 5: DELETE PRODUCT
  DELETE /api/product/{productId}
  Headers: Authorization: Bearer {token}
  └─ If product has no orders → hard delete (removed from DB)
  └─ If product has orders → soft delete (status='archived')
  └─ Archived products don't appear in search/browse

Step 6: MONITOR SALES
  RabbitMQ Event: ORDER_SELLER_DASHBOARD.ORDER_CREATED
  └─ When customer orders your product, event published
  └─ Seller system receives order notification
  └─ Contains: order ID, quantity, customer, total
```

---

### 3️⃣ **Admin Journey - Platform Management**

```
┌─────────────────────────────────────────────────────────────────┐
│                ADMIN - PLATFORM MANAGEMENT                      │
└─────────────────────────────────────────────────────────────────┘

Step 1: ADMIN LOGIN
  POST /api/auth/login
  Body: { "email": "admin@example.com", "password": "..." }
  └─ Login with admin credentials
  └─ Receive JWT token with admin role

Step 2: VIEW ALL PRODUCTS
  GET /api/product/
  Headers: Authorization: Bearer {token}
  └─ See all products from all sellers
  └─ Filter, search, paginate

Step 3: UPDATE ANY PRODUCT
  PATCH /api/product/{productId}
  Headers: Authorization: Bearer {token}
  └─ Can update any product (not just own)
  └─ Override prices, stock, details

Step 4: DELETE ANY PRODUCT
  DELETE /api/product/{productId}
  Headers: Authorization: Bearer {token}
  └─ Can delete any product

Step 5: VIEW ANY ORDER
  GET /api/orders/{orderId}
  Headers: Authorization: Bearer {token}
  └─ Access any customer's order
  └─ See order details, track status

Step 6: MANAGE USER ACCOUNTS
  (Future feature)
  └─ View all users
  └─ Manage user roles
  └─ Suspend/activate accounts
```

---

### 4️⃣ **Complete Purchase Workflow Timeline**

```
TIME    ACTION                          SERVICE          STATUS
────    ──────                          ───────          ──────
T0      User registers                  Auth             Account created
T1      User adds address               Auth             Address stored
T2      User browses products           Product          Viewing catalog
T3      User views product detail       Product          Stock: 15 units
T4      User adds 5 units to cart       Cart             Stock validated ✓
        ↓ Cart Service calls Product    Cart→Product     Real-time check
        ↓ System verifies: stock(15)    Product          Stock: 15 ≥ 5 ✓
        ↓ Cart saved with snapshot      Cart             Stored at T4
        ↓ Totals calculated             Cart             Subtotal: ₹14,995
                                                         Tax: ₹1,499.5
                                                         Shipping: ₹0
                                                         Total: ₹16,494.5
T5      User views cart                 Cart             All items valid ✓
        ↓ Re-validates stock            Cart→Product     Real-time check
        ↓ Recalculates totals           Cart             Same as before
T6      User creates order              Order            Status: PENDING
        ↓ Fetches cart items            Order→Cart       5 units confirmed
        ↓ Final stock check             Order→Product    Stock still ≥ 5 ✓
        ↓ Creates order record          Order            Order ID: #12345
        ↓ Publishes event               Order→RabbitMQ   ORDER_CREATED
        ↓ Clears cart                   Cart             Cart emptied
T7      Seller receives notification    RabbitMQ         New order alert
T8      User initiates payment          Payment          Processing...
T9      Order confirmed                 Order            Status: CONFIRMED
T10     Order shipped                   (Future)         Status: SHIPPED
T11     User receives package           (Future)         Status: DELIVERED
```

---

## �👤 User Schema

### User Model Structure

```javascript
User = {
  username: String (required, unique),
  email: String (required, unique),
  password: String (required, hashed),
  fullName: {
    firstName: String (required),
    lastName: String (required)
  },
  role: Enum ['user', 'seller'] (default: 'user'),
  addresses: [Address],
  createdAt: Date (auto),
  updatedAt: Date (auto)
}
```

### Address Schema Structure

```javascript
Address = {
  addressLine: String (required),
  city: String (required),
  state: String (required),
  pincode: String (required, 6 digits, validation: /^\d{6}$/),
  phone: String (required, 10 digits, validation: /^\d{10}$/),
  default: Boolean (default: false),
  createdAt: Date (auto)
}
```

### User Roles & Permissions

| Role | Capabilities |
|------|---|
| **user** | Browse products, manage cart, create orders, manage addresses |
| **seller** | Create/update/delete own products, view own product analytics |
| **admin** | Full platform access, manage all products, user management |

---

## 🔧 Microservices

### Service Ports & URLs

| Service | Port | Base URL | Status |
|---------|------|----------|--------|
| Auth | 3001 | `http://localhost:3001/api/auth` | ✅ Active |
| Product | 3000 | `http://localhost:3000/api/product` | ✅ Active |
| Cart | 3002 | `http://localhost:3002/api/cart` | ✅ Active |
| Order | 3003 | `http://localhost:3003/api/orders` | ✅ Active |
| Payment | 3004 | `http://localhost:3004/api/payment` | ⚠️ In Development |

---

## 📡 API Documentation

### 📖 Service Descriptions & Overview

#### 🔐 AUTH SERVICE - User Identity & Access Management
**Purpose:** Handles user registration, login, JWT token generation, and user profile management  
**Port:** 3001 | **Base URL:** `http://localhost:3001/api/auth`

- **Responsibility:** Authenticate users, manage credentials, issue JWT tokens
- **When Used:** First step in any user interaction; every request needs token from this service
- **Key Functions:**
  - Register new users (creates account with hashed password)
  - Login users (validates credentials, generates JWT token valid for session)
  - Get current user profile (retrieve authenticated user info)
  - Manage delivery addresses (add, view, delete addresses for future orders)
- **Returns:** JWT token valid for all subsequent API calls
- **Security:** Passwords hashed with bcrypt; JWT tokens signed with secret key; all sensitive operations require authentication

---

#### 🛍️ PRODUCT SERVICE - Product Catalog & Inventory Management
**Purpose:** Manage product listings, inventory, and product information  
**Port:** 3000 | **Base URL:** `http://localhost:3000/api/product`

- **Responsibility:** Store products, manage stock, handle product search/filter
- **When Used:** When browsing products, adding to cart, creating orders
- **Key Functions:**
  - Create products (sellers can list items for sale)
  - Browse products (customers view catalog with pagination, filters, search)
  - View product details (get full information including stock, price, seller, images)
  - Update products (sellers modify prices, stock, descriptions)
  - Delete products (remove outdated listings)
  - Real-time stock validation (other services call to verify availability)
- **Returns:** Product objects with complete details including price, stock level, seller info, images
- **Real-time Access:** Called by Cart & Order services for stock validation

---

#### 🛒 CART SERVICE - Shopping Cart Management
**Purpose:** Manage user shopping carts with dynamic pricing and stock validation  
**Port:** 3002 | **Base URL:** `http://localhost:3002/api/cart`

- **Responsibility:** Add/remove items, calculate totals, validate stock, store product snapshots
- **When Used:** After selecting products, before creating order
- **Key Functions:**
  - Add items to cart (validates stock immediately from Product Service)
  - Update quantities (real-time stock revalidation)
  - View cart (re-validates all items, removes out-of-stock)
  - Clear cart (removes all items)
  - Calculate totals (subtotal + 10% tax + shipping)
- **Returns:** Cart with items (including product snapshots), pricing breakdown
- **Stock Validation:** Calls Product Service to verify availability
- **Shipping:** Free if subtotal ≥ ₹1000, else ₹100
- **Product Snapshots:** Stores product state at time of add (prevents price tampering)

---

#### 📦 ORDER SERVICE - Order Management & Fulfillment
**Purpose:** Handle order creation, tracking, modification, and event publishing  
**Port:** 3003 | **Base URL:** `http://localhost:3003/api/orders`

- **Responsibility:** Create orders from cart, validate final stock, publish events, track order status
- **When Used:** When customer is ready to checkout
- **Key Functions:**
  - Create order (fetches cart items, validates stock, creates order record)
  - Get my orders (view all customer's orders with pagination)
  - Get order details (view complete order information)
  - Cancel order (only PENDING orders)
  - Update shipping address (only PENDING orders)
  - Publish events (notifies sellers of new orders)
- **Returns:** Order with items, status, total price, shipping address
- **Integration:** 
  - Calls Cart Service to fetch items
  - Calls Product Service for final stock validation
  - Publishes to RabbitMQ: ORDER_CREATED event (seller notifications)
- **Status Workflow:** PENDING → CONFIRMED → SHIPPED → DELIVERED (or CANCELLED)

---

#### 💳 PAYMENT SERVICE - Payment Processing
**Purpose:** Process payments for orders (Under Development)  
**Port:** 3004 | **Base URL:** `http://localhost:3004/api/payment`

- **Responsibility:** Handle payment transactions, update order status after payment
- **When Used:** After order creation, when user pays
- **Key Functions:**
  - Create payment (process payment for specific order)
  - Verify order ownership (prevent unauthorized payments)
  - Update order status (confirm order after successful payment)
- **Status:** 🚧 In Development (not yet fully implemented)
- **Integration:** Calls Order Service to verify order details
- **Future:** Will integrate with Razorpay/Stripe for actual payment processing

---

### 🔐 AUTH SERVICE (Port: 3001)

#### 📝 Service Overview
This service manages all user authentication and profile management. It's the first service users interact with - they must register/login here to get a JWT token, which is then used to access all other services.

**When to use:**
- ✅ New user registration
- ✅ User login to get JWT token
- ✅ Check current user profile
- ✅ Manage delivery addresses
- ✅ Logout

**After login, the JWT token from this service is used for all subsequent API calls to other services.**

---

#### 1️⃣ Register User
- **Endpoint:** `POST /api/auth/register`
- **Access:** Public (No authentication required)
- **Request Body:**
  ```json
  {
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securePassword123",
    "firstName": "John",
    "lastName": "Doe"
  }
  ```
- **Response (201):**
  ```json
  {
    "message": "User registered successfully",
    "user": {
      "_id": "user_id",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user",
      "fullName": {
        "firstName": "John",
        "lastName": "Doe"
      }
    },
    "token": "jwt_token_here"
  }
  ```
- **Error (400/409):** Validation error or user already exists

---

#### 2️⃣ Login User
- **Endpoint:** `POST /api/auth/login`
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "securePassword123"
  }
  ```
- **Response (200):**
  ```json
  {
    "message": "Login successful",
    "token": "jwt_token_here",
    "user": {
      "_id": "user_id",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user"
    }
  }
  ```
- **Error (401):** Invalid credentials

---

#### 3️⃣ Get Current User
- **Endpoint:** `GET /api/auth/me`
- **Access:** 🔒 Authenticated Users (user, seller, admin)
- **Headers:** `Authorization: Bearer {token}`
- **Response (200):**
  ```json
  {
    "message": "User profile retrieved successfully",
    "user": {
      "_id": "user_id",
      "username": "johndoe",
      "email": "john@example.com",
      "role": "user",
      "fullName": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "addresses": [...]
    }
  }
  ```

---

#### 4️⃣ Logout User
- **Endpoint:** `GET /api/auth/logout`
- **Access:** 🔒 Authenticated Users
- **Headers:** `Authorization: Bearer {token}`
- **Response (200):**
  ```json
  {
    "message": "Logout successful"
  }
  ```

---

#### 5️⃣ Get User Addresses
- **Endpoint:** `GET /api/auth/users/me/addresses`
- **Access:** 🔒 Authenticated Users
- **Headers:** `Authorization: Bearer {token}`
- **Response (200):**
  ```json
  {
    "message": "Addresses retrieved successfully",
    "addresses": [
      {
        "_id": "address_id",
        "addressLine": "123 Main St",
        "city": "New York",
        "state": "NY",
        "pincode": "100001",
        "phone": "9876543210",
        "default": true,
        "createdAt": "2026-04-01T10:00:00Z"
      }
    ]
  }
  ```

---

#### 6️⃣ Add Address
- **Endpoint:** `POST /api/auth/users/me/addresses`
- **Access:** 🔒 Authenticated Users
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
  ```json
  {
    "addressLine": "456 Oak Ave",
    "city": "Los Angeles",
    "state": "CA",
    "pincode": "900001",
    "phone": "9876543211"
  }
  ```
- **Response (201):**
  ```json
  {
    "message": "Address added successfully",
    "address": {
      "_id": "new_address_id",
      "addressLine": "456 Oak Ave",
      "city": "Los Angeles",
      "state": "CA",
      "pincode": "900001",
      "phone": "9876543211",
      "default": false
    }
  }
  ```

---

#### 7️⃣ Delete Address
- **Endpoint:** `DELETE /api/auth/users/me/addresses/:addressId`
- **Access:** 🔒 Authenticated Users
- **Headers:** `Authorization: Bearer {token}`
- **URL Params:** `addressId` (Address MongoDB ID)
- **Response (200):**
  ```json
  {
    "message": "Address deleted successfully"
  }
  ```

---

### 🛍️ PRODUCT SERVICE (Port: 3000)

#### 📝 Service Overview
This service is the product catalog. Customers browse products here (no login needed for browsing). Sellers create and manage their product listings. Other services call this service to validate stock in real-time.

**When to use:**
- ✅ Browse all products available on platform
- ✅ View product details
- ✅ Sellers: Create/update/delete their products
- ✅ Admins: Manage all products
- ✅ Called by Cart & Order services for stock validation

**Real-time stock check happens here:** When you add item to cart or create order, Cart/Order services call this service to verify "Is this product in stock?"

---

#### 1️⃣ Create Product
- **Endpoint:** `POST /api/product/`
- **Access:** 🔒 Sellers & Admins Only
- **Headers:** 
  - `Authorization: Bearer {token}`
  - `Content-Type: multipart/form-data`
- **Request (Form Data):**
  - `title` (String, required)
  - `description` (String, required)
  - `price` (Object JSON, required): `{"amount": 2999, "currency": "INR"}`
  - `stock` (Number, required)
  - `category` (String, required)
  - `images` (Files, max 5, required)
- **Response (201):**
  ```json
  {
    "message": "Product created successfully",
    "product": {
      "_id": "product_id",
      "title": "Product Title",
      "description": "Product description",
      "price": {
        "amount": 2999,
        "currency": "INR"
      },
      "stock": 50,
      "category": "Electronics",
      "seller": "seller_id",
      "images": ["url1", "url2"],
      "createdAt": "2026-04-01T10:00:00Z"
    }
  }
  ```
- **Error (400/401/403):** Validation error, unauthorized, or forbidden

---

#### 2️⃣ Get All Products
- **Endpoint:** `GET /api/product/`
- **Access:** Public
- **Query Parameters:**
  - `page` (Number, default: 1)
  - `limit` (Number, default: 10)
  - `category` (String, optional)
  - `search` (String, optional - searches in title/description)
  - `sortBy` (String, optional: 'price', 'newest')
- **Response (200):**
  ```json
  {
    "message": "Products retrieved successfully",
    "data": [
      {
        "_id": "product_id",
        "title": "Product Title",
        "price": {
          "amount": 2999,
          "currency": "INR"
        },
        "stock": 50,
        "images": ["url1"],
        "category": "Electronics",
        "seller": "seller_id"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "pages": 5
    }
  }
  ```

---

#### 3️⃣ Get Products by Seller
- **Endpoint:** `GET /api/product/seller`
- **Access:** 🔒 Sellers Only
- **Headers:** `Authorization: Bearer {token}`
- **Query Parameters:**
  - `page` (Number, default: 1)
  - `limit` (Number, default: 10)
- **Response (200):**
  ```json
  {
    "message": "Seller products retrieved successfully",
    "data": [
      {
        "_id": "product_id",
        "title": "My Product",
        "price": {"amount": 2999, "currency": "INR"},
        "stock": 50,
        "images": ["url1"],
        "seller": "your_seller_id"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 20,
      "pages": 2
    }
  }
  ```

---

#### 4️⃣ Get Product by ID
- **Endpoint:** `GET /api/product/:id`
- **Access:** Public
- **URL Params:** `id` (Product MongoDB ID)
- **Response (200):**
  ```json
  {
    "message": "Product retrieved successfully",
    "data": {
      "_id": "product_id",
      "title": "Product Title",
      "description": "Detailed description",
      "price": {
        "amount": 2999,
        "currency": "INR"
      },
      "stock": 50,
      "category": "Electronics",
      "seller": "seller_id",
      "images": ["url1", "url2", "url3"],
      "createdAt": "2026-04-01T10:00:00Z"
    }
  }
  ```

---

#### 5️⃣ Update Product
- **Endpoint:** `PATCH /api/product/:id`
- **Access:** 🔒 Product Owner (Seller) or Admin
- **Headers:** `Authorization: Bearer {token}`
- **URL Params:** `id` (Product MongoDB ID)
- **Request Body (any of):**
  ```json
  {
    "title": "Updated Title",
    "description": "Updated description",
    "price": {"amount": 3499, "currency": "INR"},
    "stock": 75,
    "category": "Electronics"
  }
  ```
- **Response (200):**
  ```json
  {
    "message": "Product updated successfully",
    "data": {
      "_id": "product_id",
      "title": "Updated Title",
      "price": {"amount": 3499, "currency": "INR"},
      "stock": 75,
      "description": "Updated description"
    }
  }
  ```
- **Error (403):** You can only edit your own products (Seller) / (404) Product not found

---

#### 6️⃣ Delete Product
- **Endpoint:** `DELETE /api/product/:id`
- **Access:** 🔒 Product Owner (Seller) or Admin
- **Headers:** `Authorization: Bearer {token}`
- **URL Params:** `id` (Product MongoDB ID)
- **Response (200):**
  ```json
  {
    "message": "Product deleted successfully"
  }
  ```
- **Note:** Soft delete if orders exist (status='archived'), hard delete otherwise

---

### 🛒 CART SERVICE (Port: 3002)

#### 📝 Service Overview
This is your shopping cart. Here you add products, adjust quantities, and see the final price with tax & shipping. When you're ready to buy, the cart sends all items to Order Service. The cart service validates stock with Product Service every time you view your cart.

**When to use:**
- ✅ Add products to your cart
- ✅ Change quantities in your cart
- ✅ View your cart with prices & totals
- ✅ Clear your cart
- ✅ See what you're about to pay (subtotal + tax + shipping)

**After cart is finalized, you move to Order Service to create the order.**

**Workflow:**
1. Add item → Stock validated immediately
2. View cart → All items re-validated, out-of-stock items removed
3. Totals calculated: Subtotal (product prices × quantity) + Tax (10%) + Shipping (₹100 or free)
4. Create order → Cart items transferred to order, cart cleared

---

#### 1️⃣ Add Item to Cart
- **Endpoint:** `POST /api/cart/items`
- **Access:** 🔒 Users Only
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
  ```json
  {
    "productId": "product_id",
    "quantity": 5
  }
  ```
- **Response (200/201):**
  ```json
  {
    "message": "Item added to cart successfully",
    "stock": 15,
    "cart": {
      "_id": "cart_id",
      "user": "user_id",
      "items": [
        {
          "productId": "product_id",
          "quantity": 5,
          "productSnapshot": {
            "title": "Product Title",
            "price": {
              "amount": 2999,
              "currency": "INR"
            },
            "seller": "seller_id",
            "stock": 15,
            "images": ["url1", "url2"]
          },
          "addedAt": "2026-04-01T10:00:00Z"
        }
      ],
      "totals": {
        "subtotal": 14995,
        "tax": 1499.5,
        "shipping": 0,
        "total": 16494.5,
        "currency": "INR"
      }
    }
  }
  ```
- **Error (409):** Insufficient stock - "Max available: X"

---

#### 2️⃣ Update Cart Item Quantity
- **Endpoint:** `PATCH /api/cart/items/:productId`
- **Access:** 🔒 Users Only
- **Headers:** `Authorization: Bearer {token}`
- **URL Params:** `productId` (Product MongoDB ID)
- **Request Body:**
  ```json
  {
    "quantity": 3
  }
  ```
- **Response (200):**
  ```json
  {
    "message": "Cart item updated successfully",
    "cart": {
      "items": [
        {
          "productId": "product_id",
          "quantity": 3,
          "productSnapshot": {
            "title": "Product Title",
            "price": {"amount": 2999, "currency": "INR"},
            "seller": "seller_id",
            "stock": 15,
            "images": ["url1", "url2"]
          }
        }
      ],
      "totals": {
        "subtotal": 8997,
        "tax": 899.7,
        "shipping": 0,
        "total": 9896.7,
        "currency": "INR"
      }
    }
  }
  ```
- **Note:** quantity = 0 removes item from cart
- **Error (409):** Insufficient stock

---

#### 3️⃣ Get Cart
- **Endpoint:** `GET /api/cart/`
- **Access:** 🔒 Users Only
- **Headers:** `Authorization: Bearer {token}`
- **Response (200):**
  ```json
  {
    "cart": {
      "_id": "cart_id",
      "user": "user_id",
      "items": [
        {
          "productId": "product_id",
          "quantity": 5,
          "productSnapshot": {
            "title": "Product Title",
            "price": {"amount": 2999, "currency": "INR"},
            "seller": "seller_id",
            "stock": 15,
            "images": ["url1"]
          }
        }
      ],
      "totals": {
        "subtotal": 14995,
        "tax": 1499.5,
        "shipping": 0,
        "total": 16494.5,
        "currency": "INR"
      }
    },
    "message": "Cart retrieved successfully"
  }
  ```
- **Note:** Automatically revalidates stock and removes unavailable items

---

#### 4️⃣ Clear Cart
- **Endpoint:** `DELETE /api/cart/`
- **Access:** 🔒 Users Only
- **Headers:** `Authorization: Bearer {token}`
- **Response (200):**
  ```json
  {
    "message": "Cart cleared successfully",
    "cart": {
      "_id": "cart_id",
      "user": "user_id",
      "items": [],
      "totals": {
        "subtotal": 0,
        "tax": 0,
        "shipping": 0,
        "total": 0,
        "currency": "INR"
      }
    }
  }
  ```

---

### 📦 ORDER SERVICE (Port: 3003)

#### 📝 Service Overview
This is where you finalize your purchase. When you create an order here, the system fetches your cart items, validates stock one final time, creates an order record with status PENDING, notifies sellers, and clears your cart. You can then pay, cancel, or modify the order until it's confirmed.

**When to use:**
- ✅ Create order from your cart
- ✅ View all your orders (track past purchases)
- ✅ View order details (see items, total, shipping address)
- ✅ Cancel order (only if PENDING status)
- ✅ Update shipping address (only if PENDING status)

**Workflow:**
1. Create order (cart items copied to order, stock validated)
2. Order status: PENDING
3. Seller notified via RabbitMQ event
4. You pay for order (payment service updates status to CONFIRMED)
5. Order ships (status → SHIPPED)
6. Order delivered (status → DELIVERED)

**Before confirming payment, you can:**
- Cancel order if status is PENDING
- Update shipping address if status is PENDING

---

#### 1️⃣ Create Order
- **Endpoint:** `POST /api/orders/`
- **Access:** 🔒 Users Only
- **Headers:** `Authorization: Bearer {token}`
- **Request Body:**
  ```json
  {
    "shippingAddress": {
      "street": "123 Main St",
      "city": "New York",
      "state": "NY",
      "pincode": "100001",
      "country": "India"
    }
  }
  ```
- **Response (201):**
  ```json
  {
    "message": "Order created successfully",
    "order": {
      "_id": "order_id",
      "user": "user_id",
      "items": [
        {
          "productId": "product_id",
          "quantity": 5,
          "price": {
            "amount": 2999,
            "currency": "INR"
          }
        }
      ],
      "status": "PENDING",
      "totalPrice": 16494.5,
      "shippingAddress": {
        "street": "123 Main St",
        "city": "New York",
        "state": "NY",
        "pincode": "100001",
        "country": "India"
      },
      "createdAt": "2026-04-01T10:00:00Z"
    }
  }
  ```
- **Error (400):** Missing shipping address / (409) Insufficient stock / (500) Cart or product service error
- **Side Effects:** 
  - Publishes `ORDER_SELLER_DASHBOARD.ORDER_CREATED` to RabbitMQ
  - Clears user's cart after successful order creation

---

#### 2️⃣ Get My Orders
- **Endpoint:** `GET /api/orders/me`
- **Access:** 🔒 Users Only
- **Headers:** `Authorization: Bearer {token}`
- **Query Parameters:**
  - `page` (Number, default: 1)
  - `limit` (Number, default: 10)
- **Response (200):**
  ```json
  {
    "message": "Orders retrieved successfully",
    "orders": [
      {
        "_id": "order_id",
        "user": "user_id",
        "items": [...],
        "status": "PENDING",
        "totalPrice": 16494.5,
        "shippingAddress": {...},
        "createdAt": "2026-04-01T10:00:00Z"
      }
    ],
    "pagination": {
      "total": 5,
      "page": 1,
      "limit": 10
    }
  }
  ```

---

#### 3️⃣ Get Order by ID
- **Endpoint:** `GET /api/orders/:id`
- **Access:** 🔒 Order Owner (User) or Admin
- **Headers:** `Authorization: Bearer {token}`
- **URL Params:** `id` (Order MongoDB ID)
- **Response (200):**
  ```json
  {
    "message": "Order retrieved successfully",
    "order": {
      "_id": "order_id",
      "user": "user_id",
      "items": [
        {
          "productId": "product_id",
          "quantity": 5,
          "price": {"amount": 2999, "currency": "INR"}
        }
      ],
      "status": "PENDING",
      "totalPrice": 16494.5,
      "shippingAddress": {...},
      "createdAt": "2026-04-01T10:00:00Z"
    }
  }
  ```
- **Error (403):** Unauthorized access / (404) Order not found

---

#### 4️⃣ Cancel Order
- **Endpoint:** `POST /api/orders/:id/cancel`
- **Access:** 🔒 Order Owner (User) or Admin
- **Headers:** `Authorization: Bearer {token}`
- **URL Params:** `id` (Order MongoDB ID)
- **Response (200):**
  ```json
  {
    "message": "Order cancelled successfully",
    "order": {
      "_id": "order_id",
      "status": "CANCELLED",
      "totalPrice": 16494.5
    }
  }
  ```
- **Error:** Can only cancel PENDING orders / (403) Unauthorized / (404) Order not found

---

#### 5️⃣ Update Order Address
- **Endpoint:** `PATCH /api/orders/:id/address`
- **Access:** 🔒 Order Owner (User) or Admin
- **Headers:** `Authorization: Bearer {token}`
- **URL Params:** `id` (Order MongoDB ID)
- **Request Body:**
  ```json
  {
    "shippingAddress": {
      "street": "456 Oak Ave",
      "city": "Los Angeles",
      "state": "CA",
      "pincode": "900001",
      "country": "India"
    }
  }
  ```
- **Response (200):**
  ```json
  {
    "message": "Order address updated successfully",
    "order": {
      "_id": "order_id",
      "status": "PENDING",
      "shippingAddress": {
        "street": "456 Oak Ave",
        "city": "Los Angeles",
        "state": "CA",
        "pincode": "900001",
        "country": "India"
      }
    }
  }
  ```
- **Error:** Can only update PENDING orders / (403) Unauthorized / (404) Order not found

---

### 💳 PAYMENT SERVICE (Port: 3004)

#### 📝 Service Overview
This service handles payment processing for orders (currently under development). After you create an order with PENDING status, you use this service to pay. Once payment is successful, the order status updates to CONFIRMED and moves forward in the fulfillment pipeline.

**When to use:**
- ✅ Process payment for a PENDING order
- ✅ Confirm payment details
- ✅ Receive payment confirmation (order becomes CONFIRMED)

**Status:** 🚧 Under Development
- Currently can create payment and fetch order details
- Full payment processing with Razorpay/Stripe integration coming soon

---

#### ⚠️ 1️⃣ Create Payment
- **Endpoint:** `POST /api/payment/create/:orderId`
- **Access:** 🔒 Users Only
- **Status:** 🚧 In Development (Not fully implemented)
- **Headers:** `Authorization: Bearer {token}`
- **URL Params:** `orderId` (Order MongoDB ID)
- **Request Body:** (To be defined)
- **Response:** (To be defined)
- **Note:** Currently fetches order data but payment processing not yet implemented

---

## 🛠️ Technology Stack

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | v18+ | Runtime environment |
| Express.js | v5.2.1 | Web framework |
| MongoDB | v8.18.1 | Database |
| Mongoose | v9.5.0 | ODM (Object Data Modeling) |
| JWT (jsonwebtoken) | v9.0.2 | Authentication |
| Axios | v1.6.2 | HTTP client for inter-service calls |
| bcrypt | v5.1.1 | Password hashing |
| express-validator | v7.2.1 | Request validation |
| amqplib | v0.10.9 | RabbitMQ client |
| Nodemon | v3.1.0 | Development auto-reload |
| Jest | v30.2.0 | Testing framework |
| Supertest | v7.1.4 | HTTP assertion library |

### Deployment & Infrastructure

| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Docker Compose | Multi-container orchestration |
| RabbitMQ | Message broker |
| PM2 | Process manager |
| Kubernetes | Container orchestration |

---

## ⚙️ Environment Configuration

### Environment Variables Required

#### Auth Service (.env)
```env
MONGO_URI=mongodb://localhost:27017/auth_db
JWT_SECRET=your_jwt_secret_key_here
PORT=3001
NODE_ENV=development
```

#### Product Service (.env)
```env
MONGO_URI=mongodb://localhost:27017/product_db
JWT_SECRET=your_jwt_secret_key_here
PORT=3000
NODE_ENV=development
```

#### Cart Service (.env)
```env
MONGO_URI=mongodb://localhost:27017/cart_db
JWT_SECRET=your_jwt_secret_key_here
PORT=3002
PRODUCT_SERVICE_URL=http://localhost:3000
NODE_ENV=development
```

#### Order Service (.env)
```env
MONGO_URI=mongodb://localhost:27017/order_db
JWT_SECRET=your_jwt_secret_key_here
PORT=3003
CART_SERVICE_URL=http://localhost:3002
PRODUCT_SERVICE_URL=http://localhost:3000
RABBIT_URL=amqp://guest:guest@localhost:5672
NODE_ENV=development
```

#### Payment Service (.env)
```env
MONGO_URI=mongodb://localhost:27017/payment_db
JWT_SECRET=your_jwt_secret_key_here
PORT=3004
ORDER_SERVICE_URL=http://localhost:3003
NODE_ENV=development
```

---

## 📊 Database Collections

### Users (Auth Service)
```
{
  _id: ObjectId,
  username: String,
  email: String,
  password: String (hashed),
  fullName: {
    firstName: String,
    lastName: String
  },
  role: String (user|seller|admin),
  addresses: [Address],
  createdAt: Date,
  updatedAt: Date
}
```

### Products (Product Service)
```
{
  _id: ObjectId,
  title: String,
  description: String,
  price: {
    amount: Number,
    currency: String
  },
  stock: Number,
  category: String,
  seller: ObjectId (ref: User),
  images: [String],
  createdAt: Date,
  updatedAt: Date
}
```

### Carts (Cart Service)
```
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  items: [{
    productId: ObjectId (ref: Product),
    quantity: Number,
    productSnapshot: {
      title: String,
      price: { amount: Number, currency: String },
      seller: ObjectId,
      stock: Number,
      images: [String]
    },
    addedAt: Date
  }],
  totals: {
    subtotal: Number,
    tax: Number,
    shipping: Number,
    total: Number,
    currency: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Orders (Order Service)
```
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  items: [{
    productId: ObjectId (ref: Product),
    quantity: Number,
    price: { amount: Number, currency: String }
  }],
  status: String (PENDING|CONFIRMED|SHIPPED|DELIVERED|CANCELLED),
  totalPrice: Number,
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    pincode: String,
    country: String
  },
  createdAt: Date,
  updatedAt: Date
}
```

### Payments (Payment Service)
```
{
  _id: ObjectId,
  order: ObjectId (ref: Order),
  user: ObjectId (ref: User),
  amount: Number,
  status: String,
  method: String,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- MongoDB running locally or remote URI
- RabbitMQ for event publishing
- npm or yarn

### Installation

1. **Clone and Install Dependencies**
   ```bash
   cd /path/to/Ai-VendorHub
   
   # Install for each service
   cd Auth && npm install
   cd ../product && npm install
   cd ../cart && npm install
   cd ../order && npm install
   cd ../Payment && npm install
   ```

2. **Configure Environment Variables**
   - Create `.env` file in each service directory
   - Add required environment variables (see Environment Configuration section)

3. **Start Services**
   ```bash
   # Terminal 1 - Auth Service
   cd Auth && npm run dev
   
   # Terminal 2 - Product Service
   cd product && npm run dev
   
   # Terminal 3 - Cart Service
   cd cart && npm run dev
   
   # Terminal 4 - Order Service
   cd order && npm run dev
   
   # Terminal 5 - Payment Service
   cd Payment && npm run dev
   ```

4. **Test API**
   - Use Postman, Insomnia, or curl to test endpoints
   - Start with registration → login → browse products → add to cart → create order

---

## ✅ API Access Control Summary

| Role | Auth APIs | Product APIs | Cart APIs | Order APIs |
|------|-----------|-------------|-----------|-----------|
| **Public** | Register, Login | GET (all, by ID) | ❌ | ❌ |
| **User** | All | GET (all, by ID) | All (manage own) | All (manage own) |
| **Seller** | All | Create/Update/Delete (own), GET (own) | ❌ | ❌ |
| **Admin** | All | All (all products) | ❌ | All (any order) |

---

## 📝 Notes

- All authenticated endpoints require JWT token in `Authorization: Bearer {token}` header
- Passwords are hashed using bcrypt before storage
- Stock validation happens at: Cart add/update → Order creation
- Cart items store product snapshots to prevent price tampering
- Orders publish events to RabbitMQ for seller notifications
- Shipping: Free if subtotal ≥ ₹1000, ₹100 otherwise
- Tax calculation: 10% on subtotal
- All timestamps in ISO 8601 format (UTC)

---

## 🔒 Security Features

✅ JWT-based authentication  
✅ Role-based access control  
✅ Password hashing with bcrypt  
✅ Input validation on all endpoints  
✅ Stock validation to prevent overselling  
✅ Product snapshots to prevent price tampering  
✅ Address validation (pincode, phone format)  
✅ Service-to-service communication with auth headers  

---

**Last Updated:** April 28, 2026  
**Project Status:** Active Development  
**Version:** 1.0.0

