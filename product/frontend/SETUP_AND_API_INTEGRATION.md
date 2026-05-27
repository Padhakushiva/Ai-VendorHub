# Product Service - Complete Setup & API Integration Guide

## 🎯 Complete Project Overview

The Product Service is a **full-stack e-commerce system** with:

- **Backend**: Node.js/Express API that manages products, inventory, and data
- **Frontend**: React app that displays products, allows filtering, and enables browsing
- **Database**: MongoDB storing all product information
- **Communication**: REST API with JSON data exchange

```
┌──────────────────────────────────────────────────────────────┐
│                     PRODUCT SERVICE                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  FRONTEND (React Vite)              BACKEND (Node.js)       │
│  ├─ Home Page                        ├─ API Routes          │
│  ├─ Product Grid                     ├─ Controllers         │
│  ├─ Product Detail                   ├─ Models (MongoDB)    │
│  ├─ Filters & Search                 ├─ Business Logic      │
│  └─ Responsive UI                    └─ Error Handling      │
│                                                               │
│        ↓ HTTPS/REST API ↓                                   │
│        GET /api/products                                    │
│        GET /api/products/:id                                │
│        POST /api/products (admin)                           │
│        etc...                                               │
│                                                               │
│                    ↓                                          │
│              MONGODB DATABASE                               │
│              ├─ Products Collection                         │
│              ├─ Categories Collection                       │
│              ├─ Reviews Collection                          │
│              └─ User Wishlists                              │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 📦 Project Structure

```
Ai-VendorHub/
├── product/
│   ├── backend (Express.js)
│   │   ├── src/
│   │   │   ├── app.js              # Express app setup
│   │   │   ├── server.js           # Server entry
│   │   │   ├── controllers/        # Request handlers
│   │   │   ├── models/             # MongoDB schemas
│   │   │   ├── routes/             # API endpoints
│   │   │   ├── middleware/         # Auth, validation
│   │   │   ├── services/           # Business logic
│   │   │   └── DB/                 # Database connection
│   │   ├── package.json
│   │   └── server.js
│   │
│   └── frontend (React Vite)       ← YOU ARE HERE
│       ├── src/
│       │   ├── components/         # Navbar, ProductCard, etc.
│       │   ├── pages/              # Home, ProductDetail
│       │   ├── context/            # ProductContext (state)
│       │   ├── App.jsx             # Main component
│       │   └── main.jsx            # Entry point
│       ├── package.json
│       ├── vite.config.js
│       ├── tailwind.config.js
│       ├── index.html
│       ├── README.md
│       ├── UI_DESIGN_SPECIFICATION.md     ← Overview
│       ├── FEATURES_IMPLEMENTATION.md     ← How features work
│       └── BEST_PRACTICES.md              ← Code standards
```

---

## 🚀 Installation & Setup

### Step 1: Backend Setup

```bash
# Navigate to backend
cd product

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
PORT=5000
MONGODB_URI=mongodb://localhost:27017/product_service
NODE_ENV=development
JWT_SECRET=your-secret-key
EOF

# Start MongoDB (if not running)
mongod

# Start backend server
npm run dev

# Check if running
curl http://localhost:5000/api/products
```

### Step 2: Frontend Setup

```bash
# Navigate to frontend
cd product/frontend

# Install dependencies
npm install

# Create .env file
cat > .env << EOF
VITE_API_URL=http://localhost:5000/api
EOF

# Start frontend dev server
npm run dev

# Open browser
open http://localhost:5174
```

### Step 3: Verify Both Running

```
Frontend:  http://localhost:5174
Backend:   http://localhost:5000
API:       http://localhost:5000/api
```

---

## 🔌 API Integration

### Expected Backend API Endpoints

Your backend should provide these endpoints for the frontend to work:

#### 1. Get All Products

**Endpoint**: `GET /api/products`

**Query Parameters**:
```
?search=       // Search in product name/description
?category=     // Filter by category
?minPrice=     // Minimum price
?maxPrice=     // Maximum price
?sort=         // Sort option (newest, price-asc, etc.)
?page=         // Page number for pagination
?limit=        // Items per page
```

**Example Request**:
```javascript
GET http://localhost:5000/api/products?search=phone&category=Electronics&minPrice=500&maxPrice=2000

// In React:
axios.get('http://localhost:5000/api/products?search=phone&category=Electronics&minPrice=500&maxPrice=2000')
```

**Expected Response**:
```javascript
{
  "data": [
    {
      "_id": "product-id-1",
      "title": "iPhone 15 Pro",
      "description": "Latest Apple flagship...",
      "price": 999,
      "originalPrice": 1099,
      "category": "Electronics",
      "image": "https://...",
      "images": ["https://...", "https://..."],
      "rating": 4.8,
      "reviews": 256,
      "inStock": true,
      "discount": 10,
      "sku": "IPH-15-PRO"
    },
    // ... more products
  ],
  "total": 45,        // Total products matching filter
  "page": 1,
  "limit": 12
}
```

#### 2. Get Single Product

**Endpoint**: `GET /api/products/:id`

**Example Request**:
```javascript
GET http://localhost:5000/api/products/product-id-1

// In React:
axios.get(`http://localhost:5000/api/products/${productId}`)
```

**Expected Response**:
```javascript
{
  "data": {
    "_id": "product-id-1",
    "title": "iPhone 15 Pro",
    "description": "Full detailed description...",
    "price": 999,
    "originalPrice": 1099,
    "category": "Electronics",
    "subcategory": "Smartphones",
    "brand": "Apple",
    "image": "https://...",
    "images": [
      "https://...",
      "https://...",
      "https://..."
    ],
    "rating": 4.8,
    "reviews": 256,
    "inStock": true,
    "stockCount": 45,
    "discount": 10,
    "sku": "IPH-15-PRO",
    "tags": ["phone", "premium", "5G"],
    "specifications": {
      "storage": "256GB",
      "color": "Space Black",
      "screen": "6.1 inch",
      "processor": "A17 Pro"
    },
    "features": [
      "Advanced camera system",
      "All-day battery",
      "5G connectivity",
      "Titanium design"
    ],
    "shippingInfo": {
      "freeShipping": true,
      "deliveryDays": "2-3 days"
    },
    "returnPolicy": "30 days money back"
  }
}
```

#### 3. Get Product Reviews (Future)

**Endpoint**: `GET /api/products/:id/reviews`

**Expected Response**:
```javascript
{
  "data": [
    {
      "_id": "review-1",
      "userId": "user-123",
      "username": "john_doe",
      "userAvatar": "https://...",
      "rating": 5,
      "title": "Amazing product!",
      "text": "Best purchase I've made...",
      "images": ["https://..."],
      "verified": true,
      "helpful": 234,
      "unhelpful": 12,
      "createdAt": "2024-05-20"
    }
  ],
  "average": 4.8,
  "total": 256
}
```

#### 4. Get Recommendations (Future)

**Endpoint**: `GET /api/products/:id/recommendations`

**Expected Response**:
```javascript
{
  "data": [
    { /* Similar products */ },
    { /* Similar products */ }
  ]
}
```

---

## 🔄 API Flow Diagram

```
USER ACTION
    ↓
REACT COMPONENT
    ↓
UPDATE FILTER / SEARCH
    ↓
PRODUCTCONTEXT.updateFilters()
    ↓
useEffect detects change
    ↓
AXIOS.GET request with query params
    ↓
HTTP GET /api/products?...
    ↓
BACKEND PROCESSES REQUEST
    ├─ Parse query parameters
    ├─ Build MongoDB query
    ├─ Execute database query
    └─ Return matching products
    ↓
AXIOS receives response
    ↓
UPDATE products STATE
    ↓
REACT RE-RENDERS
    ↓
USER SEES NEW PRODUCTS
```

---

## 🔧 Connecting Frontend to Backend

### 1. Configure API URL

**File**: `product/frontend/.env`

```env
# Development
VITE_API_URL=http://localhost:5000/api

# Production (change when deploying)
# VITE_API_URL=https://api.producthub.com/api
```

### 2. Update ProductContext

**File**: `product/frontend/src/context/ProductContext.jsx`

```javascript
// Already configured!
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:5000/api';

// Example API call:
const response = await axios.get(`${API_BASE_URL}/products?${params}`);
```

### 3. CORS Configuration

Your backend needs to allow requests from frontend:

**Backend**: `product/src/app.js`

```javascript
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:5174',        // Frontend dev
    'http://localhost:3000',         // Alternative port
    'https://producthub.com'         // Production
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## 📊 Sample Backend Implementation

### Backend Route Example

```javascript
// product/src/routes/productRoutes.js

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// Get all products with filters
router.get('/', productController.getAllProducts);

// Get single product
router.get('/:id', productController.getProductById);

// Create product (admin only)
router.post('/', auth, admin, productController.createProduct);

// Update product (admin only)
router.put('/:id', auth, admin, productController.updateProduct);

// Delete product (admin only)
router.delete('/:id', auth, admin, productController.deleteProduct);

module.exports = router;
```

### Backend Controller Example

```javascript
// product/src/controllers/productController.js

exports.getAllProducts = async (req, res) => {
  try {
    const { search, category, minPrice, maxPrice, sort, page = 1, limit = 12 } = req.query;

    // Build query
    let query = {};

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    if (category) {
      query.category = category;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = minPrice;
      if (maxPrice) query.price.$lte = maxPrice;
    }

    // Execute query
    const products = await Product.find(query)
      .sort(getSortOption(sort))
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Product.countDocuments(query);

    res.json({
      data: products,
      total,
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json({ data: product });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
```

---

## 🧪 Testing the Integration

### 1. Test Backend API with cURL

```bash
# Test getting all products
curl http://localhost:5000/api/products

# Test with filters
curl "http://localhost:5000/api/products?search=phone&category=Electronics&minPrice=500&maxPrice=2000"

# Test getting single product
curl http://localhost:5000/api/products/product-id-1
```

### 2. Test Frontend API Call

Add this to `src/pages/Home.jsx` to test:

```javascript
useEffect(() => {
  console.log('Fetching products...');
  console.log('API URL:', process.env.VITE_API_URL);
  console.log('Filters:', filters);
}, [filters]);
```

Open browser console (F12) and check logs.

### 3. Network Inspection

```
1. Open DevTools (F12)
2. Go to Network tab
3. Make a filter action
4. See request to API
5. Check response data
```

---

## 📝 Sample Data for Testing

### Insert Test Products

**Backend MongoDB Command**:

```javascript
db.products.insertMany([
  {
    title: "iPhone 15 Pro",
    description: "Latest Apple smartphone with A17 Pro chip",
    price: 999,
    originalPrice: 1099,
    category: "Electronics",
    image: "https://via.placeholder.com/300x300?text=iPhone+15+Pro",
    images: [],
    rating: 4.8,
    reviews: 256,
    inStock: true,
    stockCount: 50,
    discount: 10,
    sku: "IPH-15-PRO"
  },
  {
    title: "Samsung Galaxy S24",
    description: "Premium Android smartphone with latest features",
    price: 899,
    originalPrice: 999,
    category: "Electronics",
    image: "https://via.placeholder.com/300x300?text=Galaxy+S24",
    images: [],
    rating: 4.6,
    reviews: 189,
    inStock: true,
    stockCount: 45,
    discount: 10,
    sku: "SGS-24"
  },
  {
    title: "MacBook Pro M3",
    description: "Professional laptop for developers and designers",
    price: 1999,
    originalPrice: 2299,
    category: "Electronics",
    image: "https://via.placeholder.com/300x300?text=MacBook+Pro",
    images: [],
    rating: 4.9,
    reviews: 412,
    inStock: true,
    stockCount: 30,
    discount: 13,
    sku: "MBP-M3"
  }
])
```

---

## 🐛 Common Issues & Solutions

### Issue 1: CORS Error

**Error**: 
```
Access to XMLHttpRequest blocked by CORS policy
```

**Solution**:
```javascript
// Backend: Add CORS middleware
const cors = require('cors');
app.use(cors());

// Or configure specific origins
app.use(cors({
  origin: 'http://localhost:5174'
}));
```

### Issue 2: API URL Not Working

**Check**:
1. Is backend running? `curl http://localhost:5000/api/products`
2. Correct API URL in `.env`?
3. Network tab shows request?

**Solution**:
```javascript
// Verify API URL
console.log('API URL:', process.env.VITE_API_URL);

// Check in network tab (F12 → Network)
// Look for requests to /api/products
```

### Issue 3: Products Not Displaying

**Check**:
1. Are products in database?
2. Is API returning correct format?
3. Check browser console for errors

**Solution**:
```bash
# Check MongoDB
mongo
use product_service
db.products.find().pretty()

# Check backend logs
npm run dev  # Look for console output
```

### Issue 4: Filters Not Working

**Check**:
1. Is filter state updating?
2. Is API call being made?
3. Is backend filter query working?

**Solution**:
```javascript
// Add debugging to ProductContext
console.log('Filters changed:', filters);
console.log('API URL:', buildApiUrl(filters));

// Check network tab for API request
// Check response data in browser console
```

---

## 📱 Deployment Checklist

### Before Production

- [ ] Backend environment variables configured (.env)
- [ ] Frontend API URL set to production backend
- [ ] Database connection verified
- [ ] CORS configured for production domain
- [ ] Error handling tested
- [ ] Logging enabled for debugging
- [ ] Security headers added
- [ ] HTTPS enabled
- [ ] Rate limiting configured
- [ ] Input validation on backend

### Build for Production

```bash
# Frontend
cd product/frontend
npm run build

# Creates optimized dist/ folder
# Upload to hosting (Netlify, Vercel, etc.)

# Backend
# Deploy to server (Heroku, AWS, etc.)
```

---

## 🎓 Summary

**You Now Have**:

✅ Complete React Frontend with all features  
✅ Understanding of component structure  
✅ Context API state management  
✅ Responsive design for all devices  
✅ Performance optimizations  
✅ Security best practices  
✅ API integration documentation  
✅ Deployment guide  

**Next Steps**:

1. Start the development server: `npm run dev`
2. Open http://localhost:5174 in browser
3. Verify products display correctly
4. Start building additional features
5. Deploy when ready

**Key Files to Know**:

- `UI_DESIGN_SPECIFICATION.md` - Design system and layouts
- `FEATURES_IMPLEMENTATION.md` - How each feature works
- `BEST_PRACTICES.md` - Code standards and patterns
- `README.md` - Quick reference guide

The foundation is solid and ready to scale! 🚀
