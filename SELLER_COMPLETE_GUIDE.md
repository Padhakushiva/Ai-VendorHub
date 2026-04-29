# 🛍️ Complete Seller Guide - All Features & Walkthrough

**Welcome to Ai-VendorHub Seller Platform!** 🎉  
This guide walks you through EVERYTHING a seller can do on this platform.

---

## 📋 Seller Features Overview

As a **Seller**, you can:

| Feature | Action | Status |
|---------|--------|--------|
| **Authentication** | Register, Login, Logout | ✅ Full Access |
| **Profile** | View profile, Manage addresses | ✅ Full Access |
| **Products** | Create, Browse own, Update, Delete | ✅ Full Access |
| **Orders** | View orders containing your products | ✅ Via RabbitMQ Events |
| **Analytics** | View sales from your products | 🚧 Coming Soon |
| **Payments** | Receive payments for sales | 🚧 Coming Soon |

---

## 🚀 Complete Step-by-Step Walkthrough

### **STEP 1: REGISTER AS SELLER (Create Your Account)**

**Endpoint:** `POST http://localhost:3001/api/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "johnseller",
  "email": "johnseller@example.com",
  "password": "MySecurePassword123",
  "fullName": {
    "firstName": "John",
    "lastName": "Smith"
  },
  "role": "seller"
}
```

**Expected Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "seller_123",
    "username": "johnseller",
    "email": "johnseller@example.com",
    "role": "seller",
    "fullName": {
      "firstName": "John",
      "lastName": "Smith"
    }
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**💾 Save this token!** You'll use it for ALL next steps.

---

### **STEP 2: LOGIN (If Already Registered)**

**Endpoint:** `POST http://localhost:3001/api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "email": "johnseller@example.com",
  "password": "MySecurePassword123"
}
```

**Expected Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "seller_123",
    "username": "johnseller",
    "email": "johnseller@example.com",
    "role": "seller"
  }
}
```

**💾 Copy your token!** Use in all next requests in the Authorization header.

---

### **STEP 3: VIEW YOUR SELLER PROFILE**

**Endpoint:** `GET http://localhost:3001/api/auth/me`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Request Body:** (None - just GET)

**Expected Response (200):**
```json
{
  "message": "User profile retrieved successfully",
  "user": {
    "_id": "seller_123",
    "username": "johnseller",
    "email": "johnseller@example.com",
    "role": "seller",
    "fullName": {
      "firstName": "John",
      "lastName": "Smith"
    },
    "addresses": [],
    "createdAt": "2026-04-28T10:00:00Z",
    "updatedAt": "2026-04-28T10:00:00Z"
  }
}
```

---

### **STEP 4: ADD BUSINESS ADDRESS (Optional)**

You can add an address for your business location or for correspondence.

**Endpoint:** `POST http://localhost:3001/api/auth/users/me/addresses`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Request Body:**
```json
{
  "addressLine": "456 Business Plaza, Suite 200",
  "city": "New York",
  "state": "NY",
  "pincode": "100002",
  "phone": "9876543210"
}
```

**Expected Response (201):**
```json
{
  "message": "Address added successfully",
  "address": {
    "_id": "address_123",
    "addressLine": "456 Business Plaza, Suite 200",
    "city": "New York",
    "state": "NY",
    "pincode": "100002",
    "phone": "9876543210",
    "default": false,
    "createdAt": "2026-04-28T10:05:00Z"
  }
}
```

---

### **STEP 5: VIEW YOUR ADDRESSES**

**Endpoint:** `GET http://localhost:3001/api/auth/users/me/addresses`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Expected Response (200):**
```json
{
  "message": "Addresses retrieved successfully",
  "addresses": [
    {
      "_id": "address_123",
      "addressLine": "456 Business Plaza, Suite 200",
      "city": "New York",
      "state": "NY",
      "pincode": "100002",
      "phone": "9876543210",
      "default": false,
      "createdAt": "2026-04-28T10:05:00Z"
    }
  ]
}
```

---

### **STEP 6: DELETE AN ADDRESS (Optional)**

**Endpoint:** `DELETE http://localhost:3001/api/auth/users/me/addresses/ADDRESS_ID`

Replace `ADDRESS_ID` with the actual address ID.

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Expected Response (200):**
```json
{
  "message": "Address deleted successfully"
}
```

---

## 🛒 PRODUCT MANAGEMENT

### **STEP 7: CREATE A PRODUCT**

**Endpoint:** `POST http://localhost:3000/api/product/`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: multipart/form-data
```

**Form Data (Body):**
```
title: "iPhone 15 Pro"
description: "Latest iPhone 15 Pro with A17 Pro chip, 6.1-inch display, amazing camera"
price: {"amount": 99999, "currency": "INR"}
stock: 50
category: "Electronics"
images: [file1.jpg, file2.jpg, file3.jpg] (up to 5 images)
```

**How to send in Postman:**
1. Set method to **POST**
2. URL: `http://localhost:3000/api/product/`
3. Go to **Body** tab
4. Select **form-data**
5. Add fields:
   - `title` (Text): iPhone 15 Pro
   - `description` (Text): Latest iPhone 15 Pro...
   - `price` (Text): {"amount": 99999, "currency": "INR"}
   - `stock` (Text): 50
   - `category` (Text): Electronics
   - `images` (File): Select multiple image files (up to 5)
6. Add header: `Authorization: Bearer YOUR_TOKEN`

**Expected Response (201):**
```json
{
  "message": "Product created successfully",
  "product": {
    "_id": "prod_123",
    "title": "iPhone 15 Pro",
    "description": "Latest iPhone 15 Pro with A17 Pro chip...",
    "price": {
      "amount": 99999,
      "currency": "INR"
    },
    "stock": 50,
    "category": "Electronics",
    "seller": "seller_123",
    "images": [
      "uploads/1714305600000-iphone1.jpg",
      "uploads/1714305600001-iphone2.jpg",
      "uploads/1714305600002-iphone3.jpg"
    ],
    "createdAt": "2026-04-28T10:15:00Z",
    "updatedAt": "2026-04-28T10:15:00Z"
  }
}
```

**💾 Save Product ID!** You'll use it to update/delete products.

---

### **STEP 8: VIEW ALL YOUR PRODUCTS**

**Endpoint:** `GET http://localhost:3000/api/product/seller`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Query Parameters (Optional):**
```
?page=1&limit=10
```

**Expected Response (200):**
```json
{
  "message": "Seller products retrieved successfully",
  "data": [
    {
      "_id": "prod_123",
      "title": "iPhone 15 Pro",
      "description": "Latest iPhone 15 Pro with A17 Pro chip...",
      "price": {
        "amount": 99999,
        "currency": "INR"
      },
      "stock": 50,
      "category": "Electronics",
      "seller": "seller_123",
      "images": ["url1.jpg", "url2.jpg"],
      "createdAt": "2026-04-28T10:15:00Z",
      "updatedAt": "2026-04-28T10:15:00Z"
    },
    {
      "_id": "prod_124",
      "title": "Samsung Galaxy S24",
      "price": {
        "amount": 74999,
        "currency": "INR"
      },
      "stock": 35,
      "category": "Electronics",
      "seller": "seller_123",
      "images": ["url3.jpg"],
      "createdAt": "2026-04-28T10:20:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 2,
    "pages": 1
  }
}
```

---

### **STEP 9: VIEW PRODUCT DETAILS**

**Endpoint:** `GET http://localhost:3000/api/product/PRODUCT_ID`

Replace `PRODUCT_ID` with your product ID.

**Headers:**
```
Content-Type: application/json
```

**Example:** `GET http://localhost:3000/api/product/prod_123`

**Expected Response (200):**
```json
{
  "message": "Product retrieved successfully",
  "data": {
    "_id": "prod_123",
    "title": "iPhone 15 Pro",
    "description": "Latest iPhone 15 Pro with A17 Pro chip...",
    "price": {
      "amount": 99999,
      "currency": "INR"
    },
    "stock": 50,
    "category": "Electronics",
    "seller": "seller_123",
    "images": [
      "uploads/1714305600000-iphone1.jpg",
      "uploads/1714305600001-iphone2.jpg",
      "uploads/1714305600002-iphone3.jpg"
    ],
    "createdAt": "2026-04-28T10:15:00Z",
    "updatedAt": "2026-04-28T10:15:00Z"
  }
}
```

---

### **STEP 10: UPDATE YOUR PRODUCT**

You can update price, stock, description, category, etc.

**Endpoint:** `PATCH http://localhost:3000/api/product/PRODUCT_ID`

Replace `PRODUCT_ID` with your product ID.

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Request Body (Update any of these):**
```json
{
  "title": "iPhone 15 Pro Max",
  "description": "Updated description with new features",
  "price": {
    "amount": 109999,
    "currency": "INR"
  },
  "stock": 45,
  "category": "Electronics"
}
```

**Expected Response (200):**
```json
{
  "message": "Product updated successfully",
  "data": {
    "_id": "prod_123",
    "title": "iPhone 15 Pro Max",
    "description": "Updated description with new features",
    "price": {
      "amount": 109999,
      "currency": "INR"
    },
    "stock": 45,
    "category": "Electronics",
    "seller": "seller_123",
    "images": ["url1.jpg", "url2.jpg"],
    "createdAt": "2026-04-28T10:15:00Z",
    "updatedAt": "2026-04-28T10:30:00Z"
  }
}
```

---

### **STEP 11: DELETE YOUR PRODUCT**

**Endpoint:** `DELETE http://localhost:3000/api/product/PRODUCT_ID`

Replace `PRODUCT_ID` with your product ID.

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Expected Response (200):**
```json
{
  "message": "Product deleted successfully"
}
```

**Note:**
- If product has NO orders → Hard delete (removed from database)
- If product has orders → Soft delete (status = 'archived', hidden from search)

---

## 📊 SALES & ORDERS

### **STEP 12: MONITOR YOUR SALES (RabbitMQ Events)**

When a customer orders one of your products, you receive a notification via **RabbitMQ**.

**Event Details:**
- **Event Name:** `ORDER_SELLER_DASHBOARD.ORDER_CREATED`
- **Contains:** Order ID, Customer info, Product details, Quantity, Total price
- **When:** Immediately after customer creates order

**Example Event Received:**
```json
{
  "orderId": "order_789",
  "sellerId": "seller_123",
  "customerEmail": "john@example.com",
  "products": [
    {
      "productId": "prod_123",
      "title": "iPhone 15 Pro",
      "quantity": 2,
      "price": 99999,
      "totalPrice": 199998
    }
  ],
  "orderTotal": 219997.8,
  "shippingAddress": {
    "street": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "pincode": "100001"
  },
  "timestamp": "2026-04-28T10:35:00Z"
}
```

**Action:** You should:
1. Package the items
2. Prepare for shipment
3. Update order status (future feature)
4. Contact customer if needed

---

### **STEP 13: LOGOUT**

**Endpoint:** `GET http://localhost:3001/api/auth/logout`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Expected Response (200):**
```json
{
  "message": "Logout successful"
}
```

---

## 📊 Complete Seller Features Summary

| # | Feature | HTTP Method | Endpoint | Auth | Status |
|----|---------|------------|----------|------|--------|
| 1 | Register as Seller | POST | /api/auth/register | ❌ No | ✅ |
| 2 | Login | POST | /api/auth/login | ❌ No | ✅ |
| 3 | View Profile | GET | /api/auth/me | ✅ Yes | ✅ |
| 4 | Add Business Address | POST | /api/auth/users/me/addresses | ✅ Yes | ✅ |
| 5 | View Addresses | GET | /api/auth/users/me/addresses | ✅ Yes | ✅ |
| 6 | Delete Address | DELETE | /api/auth/users/me/addresses/{id} | ✅ Yes | ✅ |
| 7 | Create Product | POST | /api/product/ | ✅ Yes | ✅ |
| 8 | View My Products | GET | /api/product/seller | ✅ Yes | ✅ |
| 9 | View Product Detail | GET | /api/product/{id} | ❌ No | ✅ |
| 10 | Update Product | PATCH | /api/product/{id} | ✅ Yes | ✅ |
| 11 | Delete Product | DELETE | /api/product/{id} | ✅ Yes | ✅ |
| 12 | Receive Sales Notifications | RabbitMQ Event | - | ✅ Yes | ✅ |
| 13 | Logout | GET | /api/auth/logout | ✅ Yes | ✅ |

---

## 🔑 Quick Reference: Where Each Service Runs

```
Authentication & Addresses:
  Port: 3001
  Base URL: http://localhost:3001/api/auth

Products Management:
  Port: 3000
  Base URL: http://localhost:3000/api/product

Sales Notifications:
  Message Broker: RabbitMQ
  Queue: ORDER_SELLER_DASHBOARD
```

---

## 💡 Complete Seller Workflow

```
┌─────────────────────────────────────────────────────────────┐
│                    SELLER WORKFLOW                          │
└─────────────────────────────────────────────────────────────┘

STEP 1: REGISTER & LOGIN
  ├─ Register as seller (Port 3001)
  └─ Get JWT token

STEP 2: SETUP PROFILE
  ├─ View seller profile
  └─ Add business address (optional)

STEP 3: CREATE PRODUCTS
  ├─ Create product with images (Port 3000)
  ├─ Set price, stock, category
  ├─ Add product description
  └─ Get product ID

STEP 4: MANAGE INVENTORY
  ├─ View all your products
  ├─ Update product details
  │  ├─ Change price
  │  ├─ Update stock
  │  └─ Modify description
  └─ Delete products when needed

STEP 5: MONITOR SALES
  ├─ Receive order notifications (RabbitMQ)
  ├─ Customer orders your product
  ├─ Get:
  │  ├─ Order ID
  │  ├─ Customer details
  │  ├─ Quantity ordered
  │  └─ Total payment
  └─ Package & ship items

STEP 6: GET PAID (Coming Soon)
  ├─ Collect payments
  ├─ Settlement to bank account
  └─ View transaction history
```

---

## 📊 Product Information Required

When creating a product, you need:

| Field | Type | Required | Example |
|-------|------|----------|---------|
| **title** | String | ✅ Yes | iPhone 15 Pro |
| **description** | String | ✅ Yes | Latest model with A17 Pro chip |
| **price.amount** | Number | ✅ Yes | 99999 |
| **price.currency** | String | ✅ Yes | INR |
| **stock** | Number | ✅ Yes | 50 |
| **category** | String | ✅ Yes | Electronics |
| **images** | File Array | ✅ Yes | Up to 5 images |

---

## 🏪 Product Categories (Examples)

```
Electronics
Clothing
Books
Home & Kitchen
Sports
Beauty
Jewelry
Toys
Furniture
Automotive
```

---

## 💡 Tips for Sellers

1. **Use Clear Product Titles** - Make titles descriptive and searchable
2. **Add Good Descriptions** - Include specifications, features, warranty info
3. **Upload Quality Images** - Show product from multiple angles
4. **Keep Stock Updated** - Update stock after each sale
5. **Competitive Pricing** - Check market rates before pricing
6. **Monitor Orders** - Respond quickly to customer orders
7. **Professional Profile** - Keep your seller profile complete and updated

---

## ⚠️ Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| **401 Unauthorized** | Missing or invalid token | Login again, copy token |
| **403 Forbidden** | Trying to edit another seller's product | You can only edit your own products |
| **404 Not Found** | Wrong product ID or URL | Check the product ID, use correct port (3000) |
| **400 Bad Request** | Missing required fields | Make sure all fields (title, price, stock, images) are present |
| **413 Payload Too Large** | Images too large | Compress images or reduce image count |

---

## 🎯 Example: Complete Product Creation Flow

**Use Case:** You want to sell iPhone 15 Pro

### Step 1: Login & Get Token
```
POST http://localhost:3001/api/auth/login
Email: johnseller@example.com
Password: MyPassword123
→ Save token: abc123def456...
```

### Step 2: Create Product
```
POST http://localhost:3000/api/product/
Headers: Authorization: Bearer abc123def456...

Form Data:
  title: iPhone 15 Pro
  description: Latest 6.1" display, A17 Pro chip, great camera
  price.amount: 99999
  price.currency: INR
  stock: 50
  images: [iphone1.jpg, iphone2.jpg, iphone3.jpg]

→ Get product ID: prod_123
```

### Step 3: Verify Product Created
```
GET http://localhost:3000/api/product/seller
Headers: Authorization: Bearer abc123def456...

→ See your new product in the list
```

### Step 4: Monitor Sales
```
Customer orders your product
→ RabbitMQ sends: ORDER_SELLER_DASHBOARD.ORDER_CREATED
→ You receive order notification
→ Package and ship the order
```

### Step 5: Update Stock
```
PATCH http://localhost:3000/api/product/prod_123
Headers: Authorization: Bearer abc123def456...

Body: { "stock": 45 }
→ Stock updated to 45 after customer order
```

---

## 🚀 Next Steps

1. **Register** as a seller (STEP 1)
2. **Login** to get your token (STEP 2)
3. **Create your first product** (STEP 7)
4. **Verify it appears** in your products list (STEP 8)
5. **Update product details** as needed (STEP 10)
6. **Monitor orders** when customers buy (STEP 12)

---

**Now you're ready to start selling!** 💼  
Start with STEP 1 (Register) and follow through!

Have questions about any step? Let me know! 🤝

