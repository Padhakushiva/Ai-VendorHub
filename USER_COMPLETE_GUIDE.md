# 👤 Complete User Guide - All Features & Walkthrough

**Welcome to Ai-VendorHub!** 🎉  
This guide walks you through EVERYTHING a user can do on this platform.

---

## 📋 User Features Overview

As a **User** (not seller, not admin), you can:

| Feature | Action | Status |
|---------|--------|--------|
| **Authentication** | Register, Login, Logout | ✅ Full Access |
| **Profile** | View profile, Manage addresses | ✅ Full Access |
| **Shopping** | Browse products, View product details | ✅ Full Access |
| **Cart** | Add items, Update quantity, View cart, Clear cart | ✅ Full Access |
| **Orders** | Create order, View orders, Cancel order, Update address | ✅ Full Access |
| **Payment** | Process payment | 🚧 Coming Soon |

---

## 🚀 Complete Step-by-Step Walkthrough

### **STEP 1: REGISTER (Create Your Account)**

**Endpoint:** `POST http://localhost:3001/api/auth/register`

**Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "username": "johnuser",
  "email": "john@example.com",
  "password": "MySecurePassword123",
  "fullName": {
    "firstName": "John",
    "lastName": "Doe"
  },
  "address": {
    "addressLine": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "pincode": "100001",
    "phone": "9876543210"
  }
}
```

**Expected Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "_id": "user_123",
    "username": "johnuser",
    "email": "john@example.com",
    "role": "user",
    "fullName": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "addresses": [
      {
        "_id": "address_123",
        "addressLine": "123 Main Street",
        "city": "New York",
        "state": "NY",
        "pincode": "100001",
        "phone": "9876543210",
        "default": true
      }
    ]
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
  "email": "john@example.com",
  "password": "MySecurePassword123"
}
```

**Expected Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "_id": "user_123",
    "username": "johnuser",
    "email": "john@example.com",
    "role": "user",
    "addresses": [
      {
        "_id": "address_123",
        "addressLine": "123 Main Street",
        "city": "New York",
        "state": "NY",
        "pincode": "100001",
        "phone": "9876543210",
        "default": true
      }
    ]
  }
}
```

**💾 Copy your token!** Use in all next requests in the Authorization header.

---

### **STEP 3: VIEW YOUR PROFILE**

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
    "_id": "user_123",
    "username": "johnuser",
    "email": "john@example.com",
    "role": "user",
    "fullName": {
      "firstName": "John",
      "lastName": "Doe"
    },
    "addresses": [
      {
        "_id": "address_123",
        "addressLine": "123 Main Street",
        "city": "New York",
        "state": "NY",
        "pincode": "100001",
        "phone": "9876543210",
        "default": true,
        "createdAt": "2026-04-28T10:05:00Z"
      }
    ],
    "createdAt": "2026-04-28T10:00:00Z",
    "updatedAt": "2026-04-28T10:00:00Z"
  }
}
```

---

### **STEP 4: ADD SHIPPING ADDRESS (Required Before Checkout)**

**Endpoint:** `POST http://localhost:3001/api/auth/users/me/addresses`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Request Body:**
```json
{
  "addressLine": "123 Main Street",
  "city": "New York",
  "state": "NY",
  "pincode": "100001",
  "phone": "9876543210"
}
```

**Expected Response (201):**
```json
{
  "message": "Address added successfully",
  "address": {
    "_id": "address_123",
    "addressLine": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "pincode": "100001",
    "phone": "9876543210",
    "default": false,
    "createdAt": "2026-04-28T10:05:00Z"
  }
}
```

**Note:** You can add multiple addresses. Save the address ID for later use if needed.

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
      "addressLine": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "pincode": "100001",
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

Replace `ADDRESS_ID` with the actual address ID from your addresses list.

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

### **STEP 7: BROWSE ALL PRODUCTS**

**Endpoint:** `GET http://localhost:3000/api/product/`

**Headers:**
```
Content-Type: application/json
```

**Query Parameters (Optional):**
```
?page=1&limit=10&category=Electronics&search=phone
```

**Expected Response (200):**
```json
{
  "message": "Products retrieved successfully",
  "data": [
    {
      "_id": "prod_123",
      "title": "iPhone 15",
      "description": "Latest iPhone with amazing features",
      "price": {
        "amount": 79999,
        "currency": "INR"
      },
      "stock": 50,
      "category": "Electronics",
      "seller": "seller_456",
      "images": ["url1.jpg", "url2.jpg"],
      "createdAt": "2026-04-20T08:00:00Z"
    },
    {
      "_id": "prod_124",
      "title": "Samsung Galaxy S24",
      "description": "Flagship Android phone",
      "price": {
        "amount": 74999,
        "currency": "INR"
      },
      "stock": 35,
      "category": "Electronics",
      "seller": "seller_789",
      "images": ["url3.jpg"],
      "createdAt": "2026-04-21T09:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "pages": 15
  }
}
```

**💾 Save Product IDs** you want to buy!

---

### **STEP 8: VIEW PRODUCT DETAILS**

**Endpoint:** `GET http://localhost:3000/api/product/PRODUCT_ID`

Replace `PRODUCT_ID` with actual product ID from Step 7.

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
    "title": "iPhone 15",
    "description": "Latest iPhone with amazing features",
    "price": {
      "amount": 79999,
      "currency": "INR"
    },
    "stock": 50,
    "category": "Electronics",
    "seller": "seller_456",
    "images": ["url1.jpg", "url2.jpg", "url3.jpg"],
    "createdAt": "2026-04-20T08:00:00Z",
    "updatedAt": "2026-04-20T08:00:00Z"
  }
}
```

**Check stock before adding to cart!**
 
Note: Cart totals are recalculated after each add/update. Tax and shipping rules used by the platform:
- Tax: 18% GST applied on the subtotal (rounded to 2 decimals).
- Shipping: Free when subtotal > ₹500, otherwise ₹50.
---

### **STEP 9: ADD ITEM TO CART**

**Endpoint:** `POST http://localhost:3002/api/cart/items`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

Use the exact product `_id` from STEP 7 or STEP 8 response as `productId`.

**Request Body:**
```json
{
  "productId": "69f08853005c6e17788a1406",
  "quantity": 2
}
```

**Expected Response (200/201):**
```json
{
  "message": "Item added to cart successfully",
  "stock": 50,
  "cart": {
    "_id": "cart_123",
    "user": "user_123",
    "items": [
      {
        "productId": "prod_123",
        "quantity": 2,
        "productSnapshot": {
          "title": "iPhone 15",
          "price": {
            "amount": 79999,
            "currency": "INR"
          },
          "seller": "seller_456",
          "stock": 50,
          "images": ["url1.jpg"]
        },
        "addedAt": "2026-04-28T10:15:00Z"
      }
    ],
    "totals": {
      "subtotal": 159998,
      "tax": 28799.64,
      "shipping": 0,
      "total": 188797.64,
      "currency": "INR"
    }
  }
}
```

---

### **STEP 10: VIEW YOUR CART**

**Endpoint:** `GET http://localhost:3002/api/cart/`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Expected Response (200):**
```json
{
  "cart": {
    "_id": "cart_123",
    "user": "user_123",
    "items": [
      {
        "productId": "prod_123",
        "quantity": 2,
        "productSnapshot": {
          "title": "iPhone 15",
          "price": {
            "amount": 79999,
            "currency": "INR"
          },
          "seller": "seller_456",
          "stock": 50,
          "images": ["url1.jpg"]
        }
      }
    ],
    "totals": {
      "subtotal": 159998,
      "tax": 15999.8,
      "shipping": 0,
      "total": 175997.8,
      "currency": "INR"
    }
  },
  "message": "Cart retrieved successfully"
}
```

---

### **STEP 11: UPDATE ITEM QUANTITY IN CART**

**Endpoint:** `PATCH http://localhost:3002/api/cart/items/PRODUCT_ID`

Replace `PRODUCT_ID` with the product you want to update.

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Request Body:**
```json
{
  "quantity": 5
}
```

**Expected Response (200):**
```json
{
  "message": "Cart item updated successfully",
  "cart": {
    "_id": "cart_123",
    "user": "user_123",
    "items": [
      {
        "productId": "prod_123",
        "quantity": 5,
        "productSnapshot": {
          "title": "iPhone 15",
          "price": {
            "amount": 79999,
            "currency": "INR"
          },
          "seller": "seller_456",
          "stock": 50,
          "images": ["url1.jpg"]
        }
      }
    ],
    "totals": {
      "subtotal": 399995,
      "tax": 39999.5,
      "shipping": 0,
      "total": 439994.5,
      "currency": "INR"
    }
  }
}
```

**Tip:** Set quantity to 0 to remove item from cart.

---

### **STEP 12: REMOVE ITEM FROM CART**

**Endpoint:** `PATCH http://localhost:3002/api/cart/items/PRODUCT_ID`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Request Body:**
```json
{
  "quantity": 0
}
```

**Expected Response (200):**
```json
{
  "message": "Cart item updated successfully",
  "cart": {
    "_id": "cart_123",
    "user": "user_123",
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

### **STEP 13: CREATE ORDER**

**Endpoint:** `POST http://localhost:3003/api/orders/`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Request Body:**
```json
{
  "shippingAddress": {
    "street": "123 Main Street",
    "city": "New York",
    "state": "NY",
    "pincode": "100001",
    "country": "India"
  }
}
```

**Expected Response (201):**
```json
{
  "message": "Order created successfully",
  "order": {
    "_id": "order_123",
    "user": "user_123",
    "items": [
      {
        "productId": "prod_123",
        "quantity": 2,
        "price": {
          "amount": 79999,
          "currency": "INR"
        }
      }
    ],
    "status": "PENDING",
    "totalPrice": 175997.8,
    "shippingAddress": {
      "street": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "pincode": "100001",
      "country": "India"
    },
    "createdAt": "2026-04-28T10:30:00Z"
  }
}
```

**💾 Save Order ID!** You'll use it in next steps.  
**Status:** PENDING (waiting for payment)

---

### **STEP 14: VIEW YOUR ORDERS**

**Endpoint:** `GET http://localhost:3003/api/orders/me`

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
  "message": "Orders retrieved successfully",
  "orders": [
    {
      "_id": "order_123",
      "user": "user_123",
      "items": [
        {
          "productId": "prod_123",
          "quantity": 2,
          "price": {
            "amount": 79999,
            "currency": "INR"
          }
        }
      ],
      "status": "PENDING",
      "totalPrice": 175997.8,
      "shippingAddress": {
        "street": "123 Main Street",
        "city": "New York",
        "state": "NY",
        "pincode": "100001",
        "country": "India"
      },
      "createdAt": "2026-04-28T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

---

### **STEP 15: VIEW ORDER DETAILS**

**Endpoint:** `GET http://localhost:3003/api/orders/ORDER_ID`

Replace `ORDER_ID` with your actual order ID.

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Expected Response (200):**
```json
{
  "message": "Order retrieved successfully",
  "order": {
    "_id": "order_123",
    "user": "user_123",
    "items": [
      {
        "productId": "prod_123",
        "quantity": 2,
        "price": {
          "amount": 79999,
          "currency": "INR"
        }
      }
    ],
    "status": "PENDING",
    "totalPrice": 175997.8,
    "shippingAddress": {
      "street": "123 Main Street",
      "city": "New York",
      "state": "NY",
      "pincode": "100001",
      "country": "India"
    },
    "createdAt": "2026-04-28T10:30:00Z"
  }
}
```

---

### **STEP 16: UPDATE ORDER SHIPPING ADDRESS (Only if PENDING)**

**Endpoint:** `PATCH http://localhost:3003/api/orders/ORDER_ID/address`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Request Body:**
```json
{
  "shippingAddress": {
    "street": "456 Oak Avenue",
    "city": "Los Angeles",
    "state": "CA",
    "pincode": "900001",
    "country": "India"
  }
}
```

**Expected Response (200):**
```json
{
  "message": "Order address updated successfully",
  "order": {
    "_id": "order_123",
    "status": "PENDING",
    "shippingAddress": {
      "street": "456 Oak Avenue",
      "city": "Los Angeles",
      "state": "CA",
      "pincode": "900001",
      "country": "India"
    }
  }
}
```

---

### **STEP 17: CANCEL ORDER (Only if PENDING)**

**Endpoint:** `POST http://localhost:3003/api/orders/ORDER_ID/cancel`

**Headers:**
```
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json
```

**Expected Response (200):**
```json
{
  "message": "Order cancelled successfully",
  "order": {
    "_id": "order_123",
    "status": "CANCELLED",
    "totalPrice": 175997.8
  }
}
```

---

### **STEP 18: PROCESS PAYMENT (Coming Soon)**

**Endpoint:** `POST http://localhost:3004/api/payment/create/ORDER_ID`

**Status:** 🚧 Under Development

Once payment processing is implemented, you'll:
1. Submit payment details
2. Payment processed
3. Order status updates to CONFIRMED
4. Seller gets notified
5. Order moves to shipment

---

### **STEP 19: LOGOUT**

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

## 📊 Complete User Features Summary

| # | Feature | HTTP Method | Endpoint | Auth | Status |
|----|---------|------------|----------|------|--------|
| 1 | Register | POST | /api/auth/register | ❌ No | ✅ |
| 2 | Login | POST | /api/auth/login | ❌ No | ✅ |
| 3 | View Profile | GET | /api/auth/me | ✅ Yes | ✅ |
| 4 | Add Address | POST | /api/auth/users/me/addresses | ✅ Yes | ✅ |
| 5 | View Addresses | GET | /api/auth/users/me/addresses | ✅ Yes | ✅ |
| 6 | Delete Address | DELETE | /api/auth/users/me/addresses/{id} | ✅ Yes | ✅ |
| 7 | Browse Products | GET | /api/product/ | ❌ No | ✅ |
| 8 | View Product Detail | GET | /api/product/{id} | ❌ No | ✅ |
| 9 | Add to Cart | POST | /api/cart/items | ✅ Yes | ✅ |
| 10 | View Cart | GET | /api/cart/ | ✅ Yes | ✅ |
| 11 | Update Cart Item | PATCH | /api/cart/items/{id} | ✅ Yes | ✅ |
| 12 | Clear Cart | DELETE | /api/cart/ | ✅ Yes | ✅ |
| 13 | Create Order | POST | /api/orders/ | ✅ Yes | ✅ |
| 14 | View My Orders | GET | /api/orders/me | ✅ Yes | ✅ |
| 15 | View Order Detail | GET | /api/orders/{id} | ✅ Yes | ✅ |
| 16 | Update Order Address | PATCH | /api/orders/{id}/address | ✅ Yes | ✅ |
| 17 | Cancel Order | POST | /api/orders/{id}/cancel | ✅ Yes | ✅ |
| 18 | Process Payment | POST | /api/payment/create/{id} | ✅ Yes | 🚧 |
| 19 | Logout | GET | /api/auth/logout | ✅ Yes | ✅ |

---

## 🔑 Quick Reference: Where Each Service Runs

```
Authentication & Addresses:
  Port: 3001
  Base URL: http://localhost:3001/api/auth

Products:
  Port: 3000
  Base URL: http://localhost:3000/api/product

Shopping Cart:
  Port: 3002
  Base URL: http://localhost:3002/api/cart

Orders:
  Port: 3003
  Base URL: http://localhost:3003/api/orders

Payments:
  Port: 3004
  Base URL: http://localhost:3004/api/payment
```

---

## 💡 Tips for Testing

1. **Use Postman or Insomnia** to test these APIs
2. **Follow the step-by-step order** (Register → Login → Browse → Cart → Order)
3. **Always add Authorization header** with your JWT token
4. **Check responses** for error messages if something fails
5. **Save important IDs** (token, product ID, order ID, address ID)

---

## ⚠️ Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| **401 Unauthorized** | Missing or invalid token | Login again, copy token |
| **404 Not Found** | Wrong URL or port | Check the service port (3001/3000/3002/3003) |
| **409 Conflict** | Insufficient stock | Product has less stock than requested |
| **400 Bad Request** | Missing required fields | Check request body, make sure all fields present |
| **403 Forbidden** | Can't update/delete others' data | Only modify your own orders/addresses |

---

**Now you're ready to explore all user features!** 🚀  
Start with Step 1 (Register) and follow through!

