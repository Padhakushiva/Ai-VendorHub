# 🧪 Complete Testing Guide - AI Service

Complete guide on how to test the AI Service endpoints using **Postman** and **Socket.IO**

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Authentication Setup](#authentication-setup)
3. [REST API Testing (Recommended)](#rest-api-testing-recommended)
4. [Socket.IO Testing](#socketio-testing)
5. [Example Requests](#example-requests)
6. [Response Formats](#response-formats)
7. [Error Handling](#error-handling)
8. [Troubleshooting](#troubleshooting)

---

## 📌 Prerequisites

### Before Testing, Make Sure:

1. **AI Service is Running**
   ```bash
   cd AI
   npm install
   npm run dev
   ```
   Server should start on: `http://localhost:3005`

2. **Check .env Configuration**
   ```bash
   # Verify these exist in .env
   GOOGLE_API_KEY=your_api_key
   PORT=3005
   JWT_SECRET=your_secret_key
   PRODUCT_SERVICE_URL=http://localhost:3000
   ```

3. **Get a Valid JWT Token**
   - Login through your Auth service (http://localhost:3001)
   - Copy the JWT token from response
   - Token will be used for endpoints requiring authentication

4. **Product Service Running (Optional for some tests)**
   ```bash
   # For search-intent and review-summary features
   # Your product service should be running on http://localhost:3000
   ```

---

## 🔐 Authentication Setup in Postman

### Method 1: Bearer Token in Headers (Recommended)

1. **Get JWT Token**
   - Call your Auth service login endpoint
   - Copy the token from response

2. **In Postman, add to Headers:**
   ```
   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

3. **Example:**
   ```
   Key: Authorization
   Value: Bearer your_jwt_token_here
   ```

### Method 2: Set Global Variable in Postman

1. **Click "Settings" → "Variables"**
2. **Add new variable:**
   ```
   Name: token
   Initial Value: your_jwt_token_here
   Current Value: your_jwt_token_here
   ```
3. **Use in requests:**
   ```
   Authorization: Bearer {{token}}
   ```

### Method 3: Cookie Authentication (For Socket.IO)

Token is passed as a cookie in Socket.IO connections

---

## 🌐 REST API Testing (Recommended)

### ✅ Best Method for Quick Testing in Postman

REST endpoints are **easier to test** than Socket.IO in Postman.

---

### **1️⃣ AI Search Intent Endpoint**

#### 📍 Endpoint
```
POST http://localhost:3005/ai/search-intent
```

#### 🔐 Authentication
```
Required: YES (Bearer Token)
```

#### 📤 Request Headers
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 📥 Request Body
```json
{
  "query": "Show me shoes under 2000"
}
```

#### 📋 Query Examples
```json
// Search with price
{
  "query": "Find phones under 30000"
}

// Search with category
{
  "query": "Show me winter jackets"
}

// Search with features
{
  "query": "Wireless earbuds with noise cancellation under 5000"
}

// Simple search
{
  "query": "Show me laptops"
}

// Location and price
{
  "query": "Books under 500 rupees"
}
```

#### ✅ Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "parsedFilters": {
      "keywords": ["shoes"],
      "category": "Footwear",
      "priceRange": {
        "min": 0,
        "max": 2000
      }
    },
    "products": [
      {
        "id": "prod_123",
        "name": "Nike Running Shoes",
        "price": 1999,
        "category": "Footwear",
        "rating": 4.5
      },
      {
        "id": "prod_124",
        "name": "Adidas Sports Shoes",
        "price": 1799,
        "category": "Footwear",
        "rating": 4.3
      }
    ],
    "summary": "Found 2 shoes products under 2000. Popular brands include Nike and Adidas."
  },
  "timestamp": "2024-05-05T10:30:00.000Z"
}
```

#### ❌ Error Response (400/401)
```json
{
  "success": false,
  "error": "Missing required field: query",
  "timestamp": "2024-05-05T10:30:00.000Z"
}
```

---

### **2️⃣ Generate Description Endpoint**

#### 📍 Endpoint
```
POST http://localhost:3005/ai/generate-description
```

#### 🔐 Authentication
```
Required: NO (Public endpoint)
```

#### 📤 Request Headers
```
Content-Type: application/json
```

#### 📥 Request Body
```json
{
  "title": "Nike Air Max Running Shoes",
  "category": "Footwear",
  "basicDescription": "Professional running shoes with cushioning",
  "price": 5999
}
```

#### 📋 Full Body Examples

**Example 1: Electronics**
```json
{
  "title": "Sony Wireless Headphones WH-1000XM4",
  "category": "Electronics",
  "basicDescription": "Premium noise-cancelling wireless headphones",
  "price": 24999
}
```

**Example 2: Fashion**
```json
{
  "title": "Blue Denim Jeans for Men",
  "category": "Fashion",
  "basicDescription": "Comfortable casual jeans",
  "price": 1499
}
```

**Example 3: Minimal**
```json
{
  "title": "iPhone 15 Pro",
  "category": "Electronics",
  "price": 79999
}
```

#### ✅ Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "fullDescription": "Experience ultimate comfort with the Nike Air Max Running Shoes. Engineered for performance and style, these shoes feature advanced cushioning technology...",
    "bulletPoints": [
      "Advanced cushioning for maximum comfort",
      "Durable mesh and synthetic materials",
      "Lightweight design for speed",
      "Superior ankle support",
      "Breathable upper for ventilation",
      "Perfect for running and casual wear",
      "Stylish design in multiple colors"
    ],
    "tags": [
      "running-shoes",
      "nike",
      "sports-footwear",
      "comfortable",
      "cushioned",
      "athletic",
      "unisex"
    ],
    "seoKeywords": [
      "nike running shoes",
      "air max shoes",
      "professional sports footwear",
      "comfortable running shoes",
      "cushioned athletic shoes"
    ]
  },
  "timestamp": "2024-05-05T10:35:00.000Z"
}
```

#### ❌ Error Response (400)
```json
{
  "success": false,
  "error": "Missing required field: title",
  "timestamp": "2024-05-05T10:35:00.000Z"
}
```

---

### **3️⃣ Suggest Category & Tags Endpoint**

#### 📍 Endpoint
```
POST http://localhost:3005/ai/suggest-category-tags
```

#### 🔐 Authentication
```
Required: NO (Public endpoint)
```

#### 📤 Request Headers
```
Content-Type: application/json
```

#### 📥 Request Body
```json
{
  "title": "Sony Wireless Headphones",
  "description": "Premium noise-cancelling wireless headphones with 30-hour battery"
}
```

#### 📋 Full Body Examples

**Example 1: Electronics Product**
```json
{
  "title": "Sony Wireless Headphones with Noise Cancellation",
  "description": "Premium audio device featuring active noise cancelling technology, 30-hour battery life, comfortable fit for extended wear"
}
```

**Example 2: Fashion Product**
```json
{
  "title": "Premium Leather Wallet for Men",
  "description": "Genuine leather wallet with RFID protection, multiple card slots, coin pocket, slim design"
}
```

**Example 3: Minimal Input**
```json
{
  "title": "Gaming Mouse RGB"
}
```

#### ✅ Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "category": "Electronics",
    "subcategory": "Audio & Headphones",
    "tags": [
      "wireless-headphones",
      "noise-cancelling",
      "sony",
      "premium-audio",
      "bluetooth",
      "over-ear",
      "professional",
      "music",
      "studio-quality",
      "portable"
    ],
    "confidence": 92,
    "reasoning": "Based on keywords like 'wireless', 'headphones', 'noise-cancelling', and 'Sony' brand, this product fits best in Electronics > Audio & Headphones category"
  },
  "timestamp": "2024-05-05T10:40:00.000Z"
}
```

#### ❌ Error Response (400)
```json
{
  "success": false,
  "error": "Missing required field: title",
  "timestamp": "2024-05-05T10:40:00.000Z"
}
```

---

### **4️⃣ Review Summary Endpoint**

#### 📍 Endpoint
```
POST http://localhost:3005/ai/review-summary/:productId
```

#### 🔐 Authentication
```
Required: YES (Bearer Token)
```

#### 📤 Request Headers
```
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### 📥 URL Parameters
```
:productId = unique product ID from your database

Examples:
/ai/review-summary/507f1f77bcf86cd799439011
/ai/review-summary/prod_12345
/ai/review-summary/SKU-9876543
```

#### 📥 Request Body
```json
{}
```
(Empty body - product ID is in URL)

#### 📋 URL Examples
```
POST http://localhost:3005/ai/review-summary/507f1f77bcf86cd799439011
POST http://localhost:3005/ai/review-summary/prod_abc123
POST http://localhost:3005/ai/review-summary/12345
```

#### ✅ Success Response (200 OK)
```json
{
  "success": true,
  "data": {
    "pros": [
      "Excellent sound quality",
      "Very comfortable to wear",
      "Long battery life",
      "Effective noise cancellation",
      "Great build quality"
    ],
    "cons": [
      "Expensive price point",
      "Limited color options",
      "Bulky carrying case",
      "Takes time to charge fully",
      "Controls could be more intuitive"
    ],
    "sentiment": "positive",
    "sentimentScore": 0.82,
    "recommendationScore": 88,
    "averageRating": 4.4,
    "totalReviews": 45,
    "summary": "Customers highly recommend this product for its excellent sound quality and comfort. The main concern is the premium pricing, but most believe the quality justifies the cost."
  },
  "timestamp": "2024-05-05T10:45:00.000Z"
}
```

#### ❌ Error Responses

**Product Not Found (404)**
```json
{
  "success": false,
  "error": "Product not found",
  "statusCode": 404,
  "timestamp": "2024-05-05T10:45:00.000Z"
}
```

**Unauthorized (401)**
```json
{
  "success": false,
  "error": "Unauthorized - Invalid token",
  "statusCode": 401,
  "timestamp": "2024-05-05T10:45:00.000Z"
}
```

---

## 🔌 Socket.IO Testing

### Real-time Communication with Socket.IO

---

### **Method 1: Using Node.js Client (Recommended)**

#### 📄 Create `test-socket.js`

```javascript
const io = require('socket.io-client');

// ===================================
// Configuration
// ===================================
const SERVER_URL = 'http://localhost:3005';
const JWT_TOKEN = 'your_jwt_token_here'; // Get from Auth service

// ===================================
// Connect to Socket.IO Server
// ===================================
const socket = io(SERVER_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: 5,
  auth: {
    token: JWT_TOKEN
  }
});

// ===================================
// Connection Events
// ===================================
socket.on('connect', () => {
  console.log('✅ Connected to AI Service');
  console.log(`📍 Socket ID: ${socket.id}`);
  
  // Send message after connection
  testSearch();
});

socket.on('disconnect', () => {
  console.log('👋 Disconnected from server');
});

socket.on('error', (error) => {
  console.error('🔴 Connection error:', error);
});

// ===================================
// Test Functions
// ===================================

// Test 1: Search Intent
function testSearch() {
  console.log('\n🔍 Sending search query...');
  socket.emit('message', 'Show me shoes under 2000');
}

// Test 2: Description Generation (will work with agent if configured)
function testDescription() {
  console.log('\n📝 Sending description request...');
  socket.emit('message', 'Generate description for Nike Air Max shoes priced at 5999');
}

// Test 3: Category Suggestion
function testCategory() {
  console.log('\n🏷️ Sending category request...');
  socket.emit('message', 'Categorize Sony Wireless Headphones');
}

// ===================================
// Response Handlers
// ===================================

socket.on('response', (data) => {
  console.log('\n✅ Response received:');
  console.log('Message:', data.message);
  console.log('Timestamp:', data.timestamp);
  
  // Close connection after response
  setTimeout(() => {
    socket.disconnect();
  }, 1000);
});

socket.on('error', (error) => {
  console.error('❌ Error:', error);
  socket.disconnect();
});
```

#### ▶️ Run the Test

```bash
cd AI
node test-socket.js
```

#### 📊 Expected Output

```
✅ Connected to AI Service
📍 Socket ID: abc123def456...
🔍 Sending search query...
✅ Response received:
Message: Found 12 products matching your criteria. Nike and Adidas are popular brands...
Timestamp: 2024-05-05T10:50:00.000Z
👋 Disconnected from server
```

---

### **Method 2: Using Browser Console (Advanced)**

#### 📝 HTML Test Page

Create `socket-test.html` in the AI folder:

```html
<!DOCTYPE html>
<html>
<head>
  <title>AI Service Socket.IO Test</title>
  <style>
    body { font-family: Arial; padding: 20px; }
    #messages { 
      border: 1px solid #ccc; 
      padding: 10px; 
      height: 300px; 
      overflow-y: auto;
      margin-bottom: 20px;
      background: #f5f5f5;
    }
    input { width: 70%; padding: 8px; }
    button { padding: 8px 15px; cursor: pointer; }
    .message { padding: 8px; margin: 5px 0; background: white; border-left: 3px solid #007bff; }
    .error { border-left-color: #dc3545; }
  </style>
</head>
<body>
  <h1>🤖 AI Service Socket.IO Tester</h1>
  
  <div>
    <label>JWT Token:</label><br>
    <input type="text" id="tokenInput" placeholder="Paste your JWT token here">
  </div>
  
  <div style="margin-top: 10px;">
    <button onclick="connect()">🔌 Connect</button>
    <button onclick="disconnect()">🔌 Disconnect</button>
    <button onclick="sendMessage()">📤 Send Message</button>
  </div>
  
  <div style="margin-top: 10px;">
    <label>Message:</label><br>
    <input type="text" id="messageInput" placeholder="Enter your message..." value="Show me phones">
  </div>
  
  <div style="margin-top: 10px;">
    <h3>📨 Messages:</h3>
    <div id="messages"></div>
  </div>

  <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
  <script>
    let socket = null;

    function addMessage(text, isError = false) {
      const div = document.getElementById('messages');
      const msg = document.createElement('div');
      msg.className = `message ${isError ? 'error' : ''}`;
      msg.textContent = text;
      div.appendChild(msg);
      div.scrollTop = div.scrollHeight;
    }

    function connect() {
      const token = document.getElementById('tokenInput').value;
      if (!token) {
        addMessage('❌ Please enter JWT token', true);
        return;
      }

      socket = io('http://localhost:3005', {
        auth: { token: token }
      });

      socket.on('connect', () => {
        addMessage('✅ Connected to AI Service');
      });

      socket.on('response', (data) => {
        addMessage(`✅ ${data.message}`);
      });

      socket.on('error', (error) => {
        addMessage(`❌ ${error}`, true);
      });

      socket.on('disconnect', () => {
        addMessage('👋 Disconnected');
      });
    }

    function disconnect() {
      if (socket) {
        socket.disconnect();
      }
    }

    function sendMessage() {
      const message = document.getElementById('messageInput').value;
      if (!socket) {
        addMessage('❌ Not connected', true);
        return;
      }
      socket.emit('message', message);
      addMessage(`📤 Sent: ${message}`);
    }
  </script>
</body>
</html>
```

#### 🌐 Open in Browser

```bash
# In the AI folder, run:
python -m http.server 8000

# Then open:
http://localhost:8000/socket-test.html
```

---

## 📋 Example Requests Cheat Sheet

### Quick Copy-Paste for Postman

---

### **Search Intent**
```bash
POST http://localhost:3005/ai/search-intent
Authorization: Bearer {{token}}
Content-Type: application/json

{
  "query": "Show me shoes under 2000"
}
```

---

### **Generate Description**
```bash
POST http://localhost:3005/ai/generate-description
Content-Type: application/json

{
  "title": "Nike Air Max Running Shoes",
  "category": "Footwear",
  "basicDescription": "Professional running shoes",
  "price": 5999
}
```

---

### **Suggest Categories**
```bash
POST http://localhost:3005/ai/suggest-category-tags
Content-Type: application/json

{
  "title": "Sony Wireless Headphones",
  "description": "Premium noise-cancelling"
}
```

---

### **Review Summary**
```bash
POST http://localhost:3005/ai/review-summary/507f1f77bcf86cd799439011
Authorization: Bearer {{token}}
Content-Type: application/json

{}
```

---

## 📊 Response Formats

### Standard Success Response Format

```json
{
  "success": true,
  "data": {
    // Endpoint-specific data
  },
  "timestamp": "2024-05-05T10:30:00.000Z"
}
```

### Standard Error Response Format

```json
{
  "success": false,
  "error": "Error message here",
  "statusCode": 400,
  "timestamp": "2024-05-05T10:30:00.000Z"
}
```

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Request processed successfully |
| 400 | Bad Request | Missing required fields |
| 401 | Unauthorized | Invalid or missing token |
| 404 | Not Found | Product ID doesn't exist |
| 500 | Server Error | Internal error in AI processing |

---

## ❌ Error Handling

### Common Errors and Solutions

---

### **Error 1: Missing Authentication Token**

**Error Message:**
```json
{
  "success": false,
  "error": "Authentication failed: No token provided",
  "statusCode": 401
}
```

**Solution:**
- Add `Authorization: Bearer your_token_here` header
- Get token from Auth service login endpoint
- Make sure token hasn't expired

---

### **Error 2: Invalid Query Format**

**Error Message:**
```json
{
  "success": false,
  "error": "Missing required field: query",
  "statusCode": 400
}
```

**Solution:**
```json
// ✅ CORRECT
{
  "query": "Show me phones"
}

// ❌ WRONG
{
  "search": "Show me phones"
}
```

---

### **Error 3: Product Service Not Available**

**Error Message:**
```json
{
  "success": false,
  "error": "Unable to fetch products. Product service may be unavailable.",
  "statusCode": 503
}
```

**Solution:**
- Make sure product service is running on `http://localhost:3000`
- Check `PRODUCT_SERVICE_URL` in `.env`
- Restart product service

---

### **Error 4: Invalid Token**

**Error Message:**
```
Connection error: Authentication error
```

**Solution:**
- Get a fresh token from Auth service
- Verify token format: `Bearer eyJhbGc...`
- Check token expiration

---

### **Error 5: Google API Key Invalid**

**Error Message:**
```json
{
  "success": false,
  "error": "Failed to process with AI model",
  "statusCode": 500
}
```

**Solution:**
- Verify `GOOGLE_API_KEY` in `.env`
- Get new key from: https://aistudio.google.com/app/apikey
- Restart AI service after updating key

---

## 🔧 Troubleshooting

### Checklist Before Testing

- [ ] AI Service running? (`npm run dev` in AI folder)
- [ ] Server on port 3005? (check terminal output)
- [ ] `.env` configured? (GOOGLE_API_KEY present)
- [ ] JWT token valid? (not expired)
- [ ] Product service running? (for search/review features)
- [ ] Network connectivity OK?

### Debug Mode

Enable debug logging in `.env`:
```
LOG_LEVEL=debug
NODE_ENV=development
```

Then restart server:
```bash
npm run dev
```

Check terminal for detailed logs.

### Test Endpoints in Order

1. **First test:** Generate Description (no auth needed)
   ```
   POST /ai/generate-description
   ```

2. **Second test:** Suggest Categories (no auth needed)
   ```
   POST /ai/suggest-category-tags
   ```

3. **Third test:** Search Intent (needs auth)
   ```
   POST /ai/search-intent + Bearer token
   ```

4. **Fourth test:** Review Summary (needs auth)
   ```
   POST /ai/review-summary/:id + Bearer token
   ```

### Common Issues

**Issue: "Port 3005 already in use"**
```bash
# Kill process on port 3005
lsof -ti:3005 | xargs kill -9

# Then restart
npm run dev
```

**Issue: "ENOTFOUND localhost:3000"**
```bash
# Product service not running
# Start product service on port 3000
# Check PRODUCT_SERVICE_URL in .env
```

**Issue: "Cannot find module 'socket.io'"**
```bash
# In AI folder:
npm install
npm run dev
```

---

## 📝 Testing Workflow

### Step-by-Step Testing

```
1. Start AI Service
   └─ npm run dev

2. Get JWT Token
   └─ Call Auth service login
   └─ Copy token

3. Test REST Endpoints (Easiest)
   ├─ Test Generate Description (no auth)
   ├─ Test Suggest Categories (no auth)
   ├─ Test Search Intent (with auth)
   └─ Test Review Summary (with auth)

4. Test Socket.IO (Advanced)
   ├─ Run test-socket.js
   ├─ Or use HTML test page
   └─ Send real-time messages

5. Verify All Working ✅
   └─ Check response formats
   └─ Check timestamps
   └─ Check error handling
```

---

## 🎯 Quick Reference

### All Endpoints

| Feature | Method | URL | Auth | Public? |
|---------|--------|-----|------|---------|
| Search | POST | `/ai/search-intent` | ✅ Yes | ❌ No |
| Description | POST | `/ai/generate-description` | ❌ No | ✅ Yes |
| Categories | POST | `/ai/suggest-category-tags` | ❌ No | ✅ Yes |
| Reviews | POST | `/ai/review-summary/:id` | ✅ Yes | ❌ No |

### Bearer Token Template

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjEyMzQ1Njc4OTAiLCJuYW1lIjoiSm9obiBEb2UiLCJpYXQiOjE1MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

### Example Queries

```
"Show me shoes under 2000"
"Find laptops for gaming"
"Wireless earbuds with noise cancellation"
"Professional leather bag"
"Affordable winter jackets"
```

---

## 📞 Need Help?

1. Check the error message carefully
2. Verify all prerequisites are met
3. Check terminal logs for detailed errors
4. Restart services one by one
5. Test endpoints in the order suggested

Happy Testing! 🚀
