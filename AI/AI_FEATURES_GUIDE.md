# 🤖 AI Service - Complete Features & Endpoints Guide

## 📌 Table of Contents

1. [Overview](#overview)
2. [Feature Breakdown by User Type](#feature-breakdown-by-user-type)
3. [Architecture](#architecture)
4. [Feature 1: Search Intent](#feature-1-ai-product-search-assistant)
5. [Feature 2: Description Generator](#feature-2-ai-product-description-generator)
6. [Feature 3: Category & Tags](#feature-3-ai-category--tag-suggestion)
7. [Feature 4: Review Summary](#feature-4-ai-review-summary)
8. [Authentication & Security](#authentication--security)
9. [Error Handling](#error-handling)
10. [Integration Guide](#integration-guide)
11. [Response Formats](#response-formats)

---

## Overview

The AI Service is an intelligent marketplace assistant providing 4 core AI-powered features built with:
- **Framework:** Express.js (Node.js)
- **AI Model:** Google Gemini 2.5 Flash
- **Port:** 3005
- **Status:** Production Ready ✅

### Service Purpose

---

## Feature Breakdown by User Type

```
┌─────────────────────────────────────────────────────────────────┐
│                   AI SERVICE FEATURES                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  👥 FOR USERS (Customers/Buyers)                                │
│  ├── 🔍 AI Product Search Assistant                             │
│  │   └── Natural language search: "shoes under 2000"            │
│  │       Finds products that match user intent                  │
│  │                                                              │
│  └── ⭐ Review Summary (View Only)                              │
│      └── See pros/cons of products before buying               │
│          Helps make purchasing decisions                        │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🏬 FOR SELLERS (Product Owners)                                │
│  ├── 📝 AI Product Description Generator                        │
│  │   └── Auto-generate professional descriptions               │
│  │       with bullet points and SEO keywords                   │
│  │                                                              │
│  ├── 🏷️ AI Category & Tag Suggestion                            │
│  │   └── Smart categorization and tagging                      │
│  │       of new products                                       │
│  │                                                              │
│  └── ⭐ Review Summary (Analytics)                              │
│      └── Understand customer feedback                          │
│          Identify pros/cons from reviews                       │
│          Use insights to improve products                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Quick Reference Matrix

| Feature | Feature Name | User Type | Purpose | Auth Required |
|---------|--------------|-----------|---------|---|
| 1 | Search Intent | 👥 USERS | Find products naturally | ✅ Yes |
| 2 | Description Generator | 🏬 SELLERS | Create product content | ❌ No |
| 3 | Category & Tags | 🏬 SELLERS | Categorize products | ❌ No |
| 4 | Review Summary | 👥 USERS & 🏬 SELLERS | View/analyze reviews | ✅ Yes |

---
Enhance product discovery, automate content generation, improve categorization, and provide review insights using AI.

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│            CLIENT APPLICATION                    │
│        (Web/Mobile/API Consumer)                │
└────────────────┬────────────────────────────────┘
                 │ HTTP Requests
                 ▼
┌─────────────────────────────────────────────────┐
│         EXPRESS SERVER (Port 3005)              │
├─────────────────────────────────────────────────┤
│  Routes Layer        (ai.routes.js)             │
│  ↓                                              │
│  Controllers Layer   (4 controllers)            │
│  ↓                                              │
│  Services Layer      (4 services with AI)       │
└────────┬─────────────────────────────┬──────────┘
         │                             │
         ▼                             ▼
    ┌─────────────┐          ┌────────────────┐
    │ Google API  │          │ Product Service│
    │ (Gemini)    │          │ (localhost:3000)
    └─────────────┘          └────────────────┘
```

### Request Flow

```
Client Request
     ↓
Routes (ai.routes.js)
     ↓
Controllers (Request validation + handler)
     ↓
Services (AI logic + external API calls)
     ↓
Response Formatting
     ↓
Client Response
```

---

# Feature 1: AI Product Search Assistant

## � FOR USERS (Customers/Buyers)

## 🔍 What It Does

Converts natural language search queries into structured search filters and retrieves relevant products from the marketplace.

### Use Case
Customers can search products using natural language instead of traditional filters, making product discovery faster, easier, and more intuitive.

**Example:**
- User says: *"show me shoes under 2000 for college"*
- AI converts to: `{ category: "Footwear", priceRange: { max: 2000 }, keywords: ["college"] }`
- Returns: Matching products + friendly summary

---

## 📍 Endpoint

```
Method:  POST
URL:     http://localhost:3005/ai/search-intent
Auth:    REQUIRED (Bearer Token)
Headers: Content-Type: application/json
         Authorization: Bearer {JWT_TOKEN}
```

---

## 📤 Request Format

### Basic Request
```json
{
  "query": "show me shoes under 2000 for college"
}
```

### Request Examples

**Example 1: Budget Shoes**
```json
{
  "query": "comfortable shoes under 2000 rupees"
}
```

**Example 2: Gaming Laptop**
```json
{
  "query": "gaming laptop with RTX GPU under 80000"
}
```

**Example 3: Smartphone**
```json
{
  "query": "best smartphone under 30000 with good camera"
}
```

### Required Fields
- `query` (string) - Natural language search query, minimum 3 characters

### Optional Fields
- None

---

## 📥 Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "query": "show me shoes under 2000 for college",
  "parsedFilters": {
    "keywords": ["shoes", "college"],
    "priceRange": {
      "min": null,
      "max": 2000
    },
    "category": "Footwear",
    "attributes": {},
    "sortBy": "relevance",
    "originalQuery": "show me shoes under 2000 for college"
  },
  "productsFound": 15,
  "products": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "name": "Nike Air Max Running Shoes",
      "description": "Lightweight comfortable running shoes...",
      "price": 1799,
      "category": "Footwear",
      "rating": 4.5,
      "reviews": 234,
      "image": "https://..."
    },
    {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Adidas College Casual Shoes",
      "description": "Perfect casual shoes for college...",
      "price": 1499,
      "category": "Footwear",
      "rating": 4.2,
      "reviews": 156,
      "image": "https://..."
    }
    // ... more products
  ],
  "summary": "Found 15 shoes under ₹2000 perfect for college, ranging from casual to formal styles. Nike and Adidas options are highly rated.",
  "timestamp": "2024-05-05T10:30:00Z"
}
```

### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Search query is required",
  "error": "Query field is empty"
}
```

### Error Response (401 Unauthorized)
```json
{
  "success": false,
  "message": "Authentication token is required"
}
```

---

## 🔄 Parsed Filters Explanation

The AI parses the natural language query into these filters:

| Filter | Type | Example | Purpose |
|--------|------|---------|---------|
| `keywords` | Array | `["shoes", "college"]` | Main search terms |
| `priceRange.min` | Number | 500 | Minimum price |
| `priceRange.max` | Number | 2000 | Maximum price |
| `category` | String | "Footwear" | Product category |
| `attributes` | Object | `{}` | Additional properties |
| `sortBy` | String | "relevance" | Sort order |

---

## 💻 cURL Example

```bash
curl -X POST http://localhost:3005/ai/search-intent \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "query": "show me shoes under 2000 for college"
  }'
```

---

## 🔧 Code Implementation Examples

### Node.js / Express
```javascript
const axios = require('axios');

async function searchProducts(query, token) {
  try {
    const response = await axios.post(
      'http://localhost:3005/ai/search-intent',
      { query },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Products found:', response.data.productsFound);
    console.log('Summary:', response.data.summary);
    return response.data.products;
  } catch (error) {
    console.error('Search failed:', error.message);
  }
}

// Usage
const results = await searchProducts('shoes under 2000', 'your_jwt_token');
```

### React / Frontend
```javascript
import axios from 'axios';

const SearchComponent = () => {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query) => {
    setLoading(true);
    try {
      const response = await axios.post('/api/ai/search-intent', { query }, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      setResults(response.data.products);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input placeholder="Search..." onChange={(e) => handleSearch(e.target.value)} />
      {loading && <p>Searching...</p>}
      {results.map(product => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
};
```

### Python
```python
import requests
import json

def search_products(query, token):
    url = 'http://localhost:3005/ai/search-intent'
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    payload = {'query': query}
    
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        print(f"Found {data['productsFound']} products")
        print(f"Summary: {data['summary']}")
        return data['products']
    else:
        print(f"Error: {response.json()['message']}")
        return None

# Usage
products = search_products('shoes under 2000', 'your_token')
```

---

## ⏱️ Performance

- **Response Time:** 2-3 seconds average
- **Max Time:** 5 seconds
- **Typical:** 2.5 seconds
- **Dependencies:** Google Gemini API, Product Service

---

## 🔐 Authentication Details

- **Type:** Bearer Token (JWT)
- **Header Format:** `Authorization: Bearer <token>`
- **Token Source:** Auth Service (localhost:3001)
- **Validation:** Token is passed to Product Service

---

## 📊 Response Statistics

| Metric | Value |
|--------|-------|
| Products Returned | Up to 20 |
| Response Size | ~50-200 KB |
| Timeout | 5 seconds |
| Cache Time | Not cached |

---
🏬 FOR SELLERS (Product Owners/Shops)

## 📝 What It Does

Generates professional, SEO-optimized product descriptions with bullet points, tags, and keywords from basic product information.

### Use Case
Sellers can quickly create high-quality product descriptions without hiring a copywriter. Saves time, improves SEO, and enhances product listings automatically.

**Exampl
## 📝 What It Does

Generates professional, SEO-optimized product descriptions with bullet points, tags, and keywords from basic product information.

**Example Use Case:**
- Input: Nike Air Max Running Shoes
- Output: Full description + 7 bullet points + 8 tags + 5 SEO keywords

---

## 📍 Endpoint

```
Method:  POST
URL:     http://localhost:3005/ai/generate-description
Auth:    NOT REQUIRED (Public)
Headers: Content-Type: application/json
```

---

## 📤 Request Format

### Basic Request
```json
{
  "title": "Nike Air Max Running Shoes",
  "category": "Footwear",
  "basicDescription": "Comfortable running shoes with air cushioning",
  "price": 5999
}
```

### Request Examples

**Example 1: Running Shoes**
```json
{
  "title": "Nike Air Max Running Shoes",
  "category": "Footwear",
  "basicDescription": "Comfortable running shoes with air cushioning technology",
  "price": 5999
}
```

**Example 2: Wireless Headphones**
```json
{
  "title": "Sony Wireless Headphones WF-C700N",
  "category": "Electronics",
  "basicDescription": "Noise cancelling wireless headphones",
  "price": 8999
}
```

**Example 3: Minimum Required**
```json
{
  "title": "iPhone 15 Pro Max Case"
}
```

### Required Fields
- `title` (string) - Product title/name

### Optional Fields
- `category` (string) - Product category
- `basicDescription` (string) - Basic product info
- `price` (number) - Product price

---

## 📥 Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "productTitle": "Nike Air Max Running Shoes",
  "generatedContent": {
    "fullDescription": "Experience ultimate comfort and style with Nike Air Max Running Shoes. Engineered with advanced air cushioning technology, these shoes provide superior support for daily runs and casual wear. The breathable mesh upper keeps your feet cool, while the responsive midsole offers excellent shock absorption for a smooth running experience. Perfect for athletes and fitness enthusiasts alike.",
    "bulletPoints": [
      "Advanced Air Max cushioning for superior comfort",
      "Breathable mesh upper for enhanced ventilation",
      "Responsive midsole with excellent shock absorption",
      "Lightweight design for effortless movement",
      "Durable rubber outsole for reliable traction",
      "Perfect for both running and casual wear",
      "Available in multiple color options"
    ],
    "tags": [
      "running shoes",
      "athletic footwear",
      "air cushioning",
      "comfortable",
      "breathable",
      "sports",
      "nike",
      "everyday wear"
    ],
    "seoKeywords": [
      "Nike Air Max running shoes",
      "comfortable running shoes",
      "air cushioned footwear",
      "athletic shoes online",
      "sports footwear"
    ]
  },
  "timestamp": "2024-05-05T10:30:00Z"
}
```

### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Product title is required"
}
```

---

## 🎯 Generated Content Details

### Full Description
- **Length:** 150-250 words
- **Format:** 2-3 professional paragraphs
- **Tone:** Professional and engaging
- **Includes:** Features, benefits, and use cases

### Bullet Points
- **Count:** 5-7 points
- **Format:** Key features and benefits
- **Purpose:** Quick scanning
- **Style:** Action-oriented

### Tags
- **Count:** 5-8 tags
- **Purpose:** Product categorization
- **Format:** Lowercase, single words or phrases
- **Use:** Filtering and search

### SEO Keywords
- **Count:** 5 keywords
- **Purpose:** Search engine optimization
- **Format:** Phrases with 2-4 words
- **Focus:** High-value search terms

---

## 💻 cURL Example

```bash
curl -X POST http://localhost:3005/ai/generate-description \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Nike Air Max Running Shoes",
    "category": "Footwear",
    "basicDescription": "Comfortable running shoes with air cushioning",
    "price": 5999
  }'
```

---

## 🔧 Code Implementation Examples

### Node.js / Express
```javascript
const axios = require('axios');

async function generateDescription(productData) {
  try {
    const response = await axios.post(
      'http://localhost:3005/ai/generate-description',
      productData
    );
    
    const { generatedContent } = response.data;
    console.log('Description:', generatedContent.fullDescription);
    console.log('Tags:', generatedContent.tags);
    return generatedContent;
  } catch (error) {
    console.error('Generation failed:', error.message);
  }
}

// Usage
const description = await generateDescription({
  title: 'Nike Air Max Running Shoes',
  category: 'Footwear',
  price: 5999
});
```

### React / Frontend
```javascript
import axios from 'axios';

const DescriptionGenerator = () => {
  const [generated, setGenerated] = useState(null);

  const handleGenerate = async (formData) => {
    try {
      const response = await axios.post('/api/ai/generate-description', formData);
      setGenerated(response.data.generatedContent);
    } catch (error) {
      console.error('Generation error:', error);
    }
  };

  return (
    <div>
      <form onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        handleGenerate(Object.fromEntries(data));
      }}>
        <input name="title" placeholder="Product Title" required />
        <input name="category" placeholder="Category" />
        <textarea name="basicDescription" placeholder="Basic Description" />
        <input name="price" type="number" placeholder="Price" />
        <button>Generate Description</button>
      </form>

      {generated && (
        <div>
          <h3>Generated Content</h3>
          <p>{generated.fullDescription}</p>
          <h4>Features:</h4>
          <ul>
            {generated.bulletPoints.map((point, i) => (
              <li key={i}>{point}</li>
            ))}
          </ul>
          <p>Tags: {generated.tags.join(', ')}</p>
          <p>SEO Keywords: {generated.seoKeywords.join(', ')}</p>
        </div>
      )}
    </div>
  );
};
```

---

## ⏱️ Performance

- **Response Time:** 4-5 seconds average
- **Max Time:** 8 seconds
- **Typical:** 4.5 seconds
- **Depends on:** Google Gemini API latency

---

## 📊 Output Specifications

| Component | Count | Words |
|-----------|-------|-------|
| Full Description | 1 | 150-250 |
| Bullet Points | 5-7 | 10-15 each |
| Tags | 5-8 | 1-3 words each |
| SEO Keywords | 5 | 2-4 words each |

---
� FOR SELLERS (Product Owners/Shops)

## 🏷️ What It Does

Analyzes product information and suggests the most appropriate category, subcategory, and relevant tags with confidence scoring.

### Use Case
Sellers can categorize and tag their products correctly on the first try. Ensures products are discoverable through search, properly classified, and reach the right customers.

**Exampl
## 🏷️ What It Does

Analyzes product information and suggests the most appropriate category, subcategory, and relevant tags with confidence scoring.

**Example Use Case:**
- Input: Sony Wireless Headphones with noise cancellation
- Output: Electronics > Audio & Headphones + 10 relevant tags + 92% confidence

---

## 📍 Endpoint

```
Method:  POST
URL:     http://localhost:3005/ai/suggest-category-tags
Auth:    NOT REQUIRED (Public)
Headers: Content-Type: application/json
```

---

## 📤 Request Format

### Basic Request
```json
{
  "title": "Sony Wireless Headphones",
  "description": "Premium noise-cancelling wireless headphones with 30-hour battery life"
}
```

### Request Examples

**Example 1: Wireless Headphones**
```json
{
  "title": "Sony Wireless Headphones",
  "description": "Premium noise-cancelling wireless headphones with 30-hour battery life and superior sound quality"
}
```

**Example 2: Running Shoes**
```json
{
  "title": "Nike Revolution 7 Running Shoes",
  "description": "Lightweight comfortable running shoes with responsive cushioning for daily jogging and gym workouts"
}
```

**Example 3: Kitchen Appliance**
```json
{
  "title": "Powerful 1500W Kitchen Blender",
  "description": "High-speed blender with multiple preset functions for smoothies, soups, and ice crushing"
}
```

### Required Fields
- `title` (string) - Product title

### Optional Fields
- `description` (string) - Product description

---

## 📥 Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "productTitle": "Sony Wireless Headphones",
  "suggestions": {
    "category": "Electronics",
    "subcategory": "Audio & Headphones",
    "tags": [
      "wireless headphones",
      "noise cancelling",
      "bluetooth",
      "premium audio",
      "sony",
      "headphones",
      "long battery life",
      "portable audio",
      "music",
      "audio equipment"
    ],
    "confidence": 92,
    "reasoning": "The product is clearly electronics, specifically audio equipment. Keywords like 'wireless', 'noise-cancelling', and 'Sony' indicate premium headphones category. High confidence due to clear product indicators."
  },
  "timestamp": "2024-05-05T10:30:00Z"
}
```

### Error Response (400 Bad Request)
```json
{
  "success": false,
  "message": "Product title is required"
}
```

---

## 📊 Suggestions Details

### Category Levels

```
Category (Main)
  └── Electronics
      ├── Subcategory (Specific)
          └── Audio & Headphones
          └── Computing
          └── Mobile & Accessories
```

### Confidence Score

- **90-100:** High confidence - clear product type
- **75-89:** Good confidence - identifiable product
- **60-74:** Moderate confidence - some indicators
- **Below 60:** Low confidence - ambiguous product

### Tags

- **Count:** 8-10 tags
- **Format:** Lowercase, 1-3 words each
- **Purpose:** Product discovery and filtering
- **Relevance:** Highly specific to product

---

## 💻 cURL Example

```bash
curl -X POST http://localhost:3005/ai/suggest-category-tags \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Sony Wireless Headphones",
    "description": "Premium noise-cancelling wireless headphones with 30-hour battery life"
  }'
```

---

## 🔧 Code Implementation Examples

### Node.js / Express
```javascript
const axios = require('axios');

async function suggestCategories(title, description) {
  try {
    const response = await axios.post(
      'http://localhost:3005/ai/suggest-category-tags',
      { title, description }
    );
    
    const { suggestions } = response.data;
    console.log(`Category: ${suggestions.category}`);
    console.log(`Subcategory: ${suggestions.subcategory}`);
    console.log(`Confidence: ${suggestions.confidence}%`);
    console.log(`Tags: ${suggestions.tags.join(', ')}`);
    return suggestions;
  } catch (error) {
    console.error('Suggestion failed:', error.message);
  }
}

// Usage
const suggestions = await suggestCategories(
  'Sony Wireless Headphones',
  'Premium noise-cancelling...'
);
```

### React / Frontend
```javascript
import axios from 'axios';

const CategorySuggester = () => {
  const [suggestions, setSuggestions] = useState(null);

  const handleSuggest = async (title, description) => {
    try {
      const response = await axios.post(
        '/api/ai/suggest-category-tags',
        { title, description }
      );
      setSuggestions(response.data.suggestions);
    } catch (error) {
      console.error('Suggestion error:', error);
    }
  };

  return (
    <div>
      <form onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        handleSuggest(
          data.get('title'),
          data.get('description')
        );
      }}>
        <input name="title" placeholder="Product Title" required />
        <textarea name="description" placeholder="Product Description" />
        <button>Get Suggestions</button>
      </form>

      {suggestions && (
        <div>
          <h3>Category Suggestions</h3>
          <p><strong>Category:</strong> {suggestions.category}</p>
          <p><strong>Subcategory:</strong> {suggestions.subcategory}</p>
          <p><strong>Confidence:</strong> {suggestions.confidence}%</p>
          <p><strong>Tags:</strong> {suggestions.tags.join(', ')}</p>
          <p><strong>Reasoning:</strong> {suggestions.reasoning}</p>
        </div>
      )}
    </div>
  );
};
```

---

## ⏱️ Performance

- **Response Time:** 2-3 seconds average
- **Max Time:** 5 seconds
- **Typical:** 2.5 seconds

---

## 📊 Output Specifications

| Element | Details |
|---------|---------|
| Category | 1 main category |
| Subcategory | 1 specific subcategory |
| T👥 FOR USERS (Buyers) & 🏬 FOR SELLERS (Product Owners)

## ⭐ What It Does

Analyzes product reviews and generates a comprehensive summary including pros, cons, sentiment analysis, and recommendation scoring.

### Use Cases

**For Users (Buyers):**
- Quickly understand what customers like and dislike about a product
- Make informed purchasing decisions without reading all reviews
- See sentiment analysis and recommendation score at a glance

**For Sellers (Product Owners):**
- Get actionable insights from customer feedback
- Identify strengths to highlight in marketing
- Identify weaknesses to improve in future products
- Monitor customer satisfaction trends

**Exampl

---

# Feature 4: AI Review Summary

## ⭐ What It Does

Analyzes product reviews and generates a comprehensive summary including pros, cons, sentiment analysis, and recommendation scoring.

**Example Use Case:**
- Input: Product ID with 45 reviews
- Output: Top 5 pros + Top 5 cons + sentiment + 88% recommendation score

---

## 📍 Endpoint

```
Method:  POST
URL:     http://localhost:3005/ai/review-summary/:productId
Auth:    REQUIRED (Bearer Token)
Headers: Content-Type: application/json
         Authorization: Bearer {JWT_TOKEN}
Param:   productId (URL parameter)
```

---

## 📤 Request Format

### URL Format
```
POST /ai/review-summary/507f1f77bcf86cd799439011
```

### Request Body
```json
{}
```
(No body required, only URL parameter)

### Request Examples

**Example 1: Nike Shoes Product**
```
POST /ai/review-summary/507f1f77bcf86cd799439011
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Example 2: Sony Headphones Product**
```
POST /ai/review-summary/507f1f77bcf86cd799439012
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Required Parameters
- `productId` (URL parameter) - Unique product identifier

### Required Headers
- `Authorization: Bearer {token}` - JWT authentication token

---

## 📥 Response Format

### Success Response (200 OK)
```json
{
  "success": true,
  "productId": "507f1f77bcf86cd799439011",
  "productName": "Nike Air Max Running Shoes",
  "reviewsCount": 45,
  "averageRating": 4.5,
  "summary": {
    "pros": [
      "Extremely comfortable for long hours",
      "Great value for money",
      "Excellent build quality",
      "Perfect for running and casual wear",
      "Amazing customer support"
    ],
    "cons": [
      "Sizing runs slightly large",
      "Color may fade with frequent washing",
      "Limited color options",
      "May take time to break in",
      "Expensive compared to competitors"
    ],
    "overallSentiment": "positive",
    "summary": "Customers love these shoes for their comfort and quality. Most reviewers recommend them for running and everyday wear. However, some mention sizing issues and color fading concerns. Overall, this is a highly recommended product with excellent customer satisfaction.",
    "recommendationScore": 88
  },
  "timestamp": "2024-05-05T10:30:00Z"
}
```

### Success Response - No Reviews (200 OK)
```json
{
  "success": true,
  "productId": "507f1f77bcf86cd799439011",
  "productName": "Unknown Product",
  "reviewsCount": 0,
  "message": "No reviews found for this product",
  "summary": null,
  "timestamp": "2024-05-05T10:30:00Z"
}
```

### Error Response - Product Not Found (404)
```json
{
  "success": false,
  "message": "Product not found",
  "error": "Invalid product ID"
}
```

### Error Response - Unauthorized (401)
```json
{
  "success": false,
  "message": "Authentication token is required"
}
```

---

## 📊 Summary Components

### Pros
- **Count:** 3-5 main positive points
- **Source:** Extracted from customer reviews
- **Focus:** Most frequently mentioned benefits
- **Sorted by:** Frequency and relevance

### Cons
- **Count:** 3-5 main negative points
- **Source:** Extracted from customer reviews
- **Focus:** Most commonly mentioned issues
- **Sorted by:** Frequency and impact

### Overall Sentiment
- **Values:** "positive", "neutral", "negative"
- **Basis:** Aggregated review ratings and text analysis
- **Scale:** Based on average rating and sentiment

### Summary
- **Length:** 2-3 sentences
- **Format:** Natural language overview
- **Includes:** Key pros, cons, and recommendation

### Recommendation Score
- **Range:** 0-100 percentage
- **Basis:** Reviews, ratings, and sentiment
- **Meaning:** Likelihood customers would recommend product

---

## 💻 cURL Example

```bash
curl -X POST http://localhost:3005/ai/review-summary/507f1f77bcf86cd799439011 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json"
```

---

## 🔧 Code Implementation Examples

### Node.js / Express
```javascript
const axios = require('axios');

async function getReviewSummary(productId, token) {
  try {
    const response = await axios.post(
      `http://localhost:3005/ai/review-summary/${productId}`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const { summary } = response.data;
    console.log(`Product: ${response.data.productName}`);
    console.log(`Reviews: ${response.data.reviewsCount}`);
    console.log(`Rating: ${response.data.averageRating}/5`);
    console.log(`Recommendation: ${summary.recommendationScore}%`);
    console.log('Pros:', summary.pros);
    console.log('Cons:', summary.cons);
    
    return summary;
  } catch (error) {
    console.error('Summary failed:', error.message);
  }
}

// Usage
const summary = await getReviewSummary(
  '507f1f77bcf86cd799439011',
  'your_jwt_token'
);
```

### React / Frontend
```javascript
import axios from 'axios';

const ReviewSummary = ({ productId, token }) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      try {
        const response = await axios.post(
          `/api/ai/review-summary/${productId}`,
          {},
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        setSummary(response.data);
      } catch (error) {
        console.error('Error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [productId, token]);

  if (loading) return <div>Loading review summary...</div>;
  if (!summary) return <div>No summary available</div>;

  return (
    <div>
      <h3>{summary.productName}</h3>
      <p>Reviews: {summary.reviewsCount} | Rating: {summary.averageRating}/5</p>
      
      <h4>Pros</h4>
      <ul>
        {summary.summary.pros.map((pro, i) => (
          <li key={i}>{pro}</li>
        ))}
      </ul>

      <h4>Cons</h4>
      <ul>
        {summary.summary.cons.map((con, i) => (
          <li key={i}>{con}</li>
        ))}
      </ul>

      <p><strong>Sentiment:</strong> {summary.summary.overallSentiment}</p>
      <p><strong>Recommendation:</strong> {summary.summary.recommendationScore}%</p>
      <p>{summary.summary.summary}</p>
    </div>
  );
};
```

---

## ⏱️ Performance

- **Response Time:** 3-4 seconds average
- **Max Time:** 6 seconds
- **Typical:** 3.5 seconds
- **Depends on:** Review count and Product Service latency

---

## 📊 Output Specifications

| Element | Details |
|---------|---------|
| Pros | 3-5 points |
| Cons | 3-5 points |
| Summary | 2-3 sentences |
| Sentiment | positive/neutral/negative |
| Recommendation | 0-100 score |

---

---

# Authentication & Security

## 🔐 Bearer Token Authentication

### What is it?
Bearer token authentication using JWT (JSON Web Tokens) for secure API access.

### Protected Endpoints
```
✅ POST /ai/search-intent          - REQUIRES Bearer Token
✅ POST /ai/review-summary/:productId  - REQUIRES Bearer Token

❌ POST /ai/generate-description   - NO Token Required
❌ POST /ai/suggest-category-tags  - NO Token Required
```

### How to Use

**1. Get Token from Auth Service**
```bash
POST /auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

Response:
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**2. Include Token in Protected Endpoint**
```bash
curl -X POST http://localhost:3005/ai/search-intent \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{"query": "shoes"}'
```

### Token Format
```
Authorization: Bearer <JWT_TOKEN>
```

### Token Location
- **Header:** `Authorization`
- **Format:** `Bearer {token}`
- **Source:** Auth Service at localhost:3001

---

## 🛡️ Security Best Practices

1. **Never expose tokens** in logs or client-side code
2. **Use HTTPS** in production (not HTTP)
3. **Token expiration** - tokens expire in typically 1-24 hours
4. **Refresh tokens** - obtain new token when old one expires
5. **Rate limiting** - service implements rate limiting
6. **Input validation** - all inputs are validated

---

---

# Error Handling

## ❌ Error Response Format

All error responses follow this format:

```json
{
  "success": false,
  "message": "Human-readable error message",
  "error": "Detailed error (only in development mode)"
}
```

---

## 🔴 Common Error Codes

### 400 - Bad Request
```json
{
  "success": false,
  "message": "Search query is required"
}
```
**Causes:**
- Missing required fields
- Invalid input format
- Empty query string

### 401 - Unauthorized
```json
{
  "success": false,
  "message": "Authentication token is required"
}
```
**Causes:**
- Missing Authorization header
- Invalid or expired token
- Accessing protected endpoint without token

### 404 - Not Found
```json
{
  "success": false,
  "message": "Product not found",
  "error": "Product ID does not exist"
}
```
**Causes:**
- Invalid product ID
- Product deleted or archived
- Wrong endpoint

### 500 - Internal Server Error
```json
{
  "success": false,
  "message": "Failed to generate search intent",
  "error": "Google API service unavailable"
}
```
**Causes:**
- Google Gemini API down
- Product Service connection failed
- Server error or crash

---

## 🚨 Error Recovery Strategies

| Error | Retry? | Wait | Action |
|-------|--------|------|--------|
| 400 Bad Request | No | - | Fix input and retry |
| 401 Unauthorized | No | - | Get new auth token |
| 500 Server Error | Yes | 5s | Exponential backoff |
| Timeout | Yes | 3s | Retry with delay |

---

---

# Integration Guide

## 🔗 Service Dependencies

### 1. Google Gemini API
- **Purpose:** AI model for all features
- **Key:** GOOGLE_API_KEY
- **Get:** https://aistudio.google.com/app/apikey

### 2. Product Service
- **URL:** http://localhost:3000
- **Purpose:** Fetch products and reviews
- **Endpoints Used:**
  - `GET /api/product?q={query}` - Search products
  - `GET /api/product/{id}` - Get product details with reviews

### 3. Auth Service (Optional)
- **URL:** http://localhost:3001
- **Purpose:** Token validation
- **Endpoints Used:**
  - `POST /auth/login` - Get JWT token

---

## 📱 Frontend Integration

### React Example
```javascript
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3005',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to all requests
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

### Vue Example
```javascript
// api.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:3005',
  headers: {
    'Content-Type': 'application/json'
  }
});

apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default apiClient;
```

---

## 🔄 Workflow Examples

### Complete Search Workflow
```
1. User enters search query
2. Frontend validates query
3. Frontend calls /ai/search-intent
4. AI Service parses query with Gemini
5. AI Service searches products
6. Products returned to frontend
7. Frontend displays results
```

### Complete Description Generation Workflow
```
1. Seller enters product info
2. Frontend calls /ai/generate-description
3. AI Service generates content
4. Generated content returned
5. Seller reviews/edits content
6. Seller saves to database
```

---

## 📊 Response Formats

### Standard Success Response
```json
{
  "success": true,
  "data": { /* feature-specific data */ },
  "timestamp": "2024-05-05T10:30:00Z"
}
```

### Standard Error Response
```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error (development only)"
}
```

---

---

# Response Formats

## ✅ Success Response Structure

All successful responses follow this structure:

```json
{
  "success": true,
  "query": "original user query or context",
  "productTitle": "product name if applicable",
  "suggestions": "feature-specific data",
  "summary": "human-friendly summary",
  "timestamp": "2024-05-05T10:30:00.000Z"
}
```

---

## ❌ Error Response Structure

All error responses follow this structure:

```json
{
  "success": false,
  "message": "Short error message",
  "error": "Detailed error (only in development)"
}
```

---

## 📋 HTTP Status Codes Used

| Code | Meaning | Cause |
|------|---------|-------|
| 200 | OK | Request succeeded |
| 400 | Bad Request | Missing/invalid input |
| 401 | Unauthorized | Missing/invalid token |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Internal server error |

---

## ⏱️ Timestamp Format

All timestamps use ISO 8601 format:
```
2024-05-05T10:30:00.000Z
```

---

---

---

# User Type Features Summary

## 👥 Features FOR USERS (Customers/Buyers)

### 🔍 Feature 1: AI Product Search Assistant
```
📍 Endpoint: POST /ai/search-intent
🔐 Auth: REQUIRED (Bearer Token)
⏱️ Response: 2-3 seconds

What Users Can Do:
✅ Search using natural language
✅ Say "shoes under 2000" instead of using complex filters
✅ Find products that match their needs faster
✅ Get AI-friendly summary of results
✅ Discover products they might miss with traditional search

Benefits:
• Faster product discovery
• More intuitive search experience
• Better search results accuracy
• Find niche products easily
```

### ⭐ Feature 4: AI Review Summary (User View)
```
📍 Endpoint: POST /ai/review-summary/:productId
🔐 Auth: REQUIRED (Bearer Token)
⏱️ Response: 3-4 seconds

What Users Can Do:
✅ View product pros and cons
✅ See overall sentiment about the product
✅ Check recommendation score
✅ Read AI-generated summary instead of all reviews
✅ Make informed buying decisions

Benefits:
• Save time reading reviews
• Understand consensus on products
• Identify potential issues before buying
• Build confidence in purchase decisions
```

---

## 🏬 Features FOR SELLERS (Product Owners/Shops)

### 📝 Feature 2: AI Product Description Generator
```
📍 Endpoint: POST /ai/generate-description
🔐 Auth: NOT REQUIRED (Public)
⏱️ Response: 4-5 seconds

What Sellers Can Do:
✅ Input basic product info
✅ Get professional description generated
✅ Get bullet points highlighting features
✅ Get relevant tags for categorization
✅ Get SEO keywords to improve search ranking

Benefits:
• Save time on copywriting
• Professional descriptions for all products
• Improved SEO for better search visibility
• Consistent product information
• Cost savings on hiring copywriters
• Faster product listing creation
```

### 🏷️ Feature 3: AI Category & Tag Suggestion
```
📍 Endpoint: POST /ai/suggest-category-tags
🔐 Auth: NOT REQUIRED (Public)
⏱️ Response: 2-3 seconds

What Sellers Can Do:
✅ Input product title and description
✅ Get suggested category and subcategory
✅ Get relevant tags for the product
✅ See confidence score for accuracy
✅ Understand why categories were suggested

Benefits:
• Correctly categorize products first time
• Improve product discoverability
• Reach customers looking in right categories
• Consistent categorization across store
• Better inventory organization
• Higher product visibility in searches
```

### ⭐ Feature 4: AI Review Summary (Seller View)
```
📍 Endpoint: POST /ai/review-summary/:productId
🔐 Auth: REQUIRED (Bearer Token)
⏱️ Response: 3-4 seconds

What Sellers Can Do:
✅ View customer feedback summary
✅ See most mentioned pros and cons
✅ Check overall customer sentiment
✅ View recommendation score
✅ Get data-driven insights for improvements

Benefits:
• Understand customer satisfaction
• Identify product improvements needed
• Know what to highlight in marketing
• Track customer feedback trends
• Make data-driven product decisions
• Improve product quality based on feedback
```

---

## 📊 Feature Usage by Role

### User (Buyer) Dashboard
```
┌─────────────────────────────────┐
│    BUYER/USER DASHBOARD         │
├─────────────────────────────────┤
│                                 │
│  🔍 Search Products             │
│     • Natural language search   │
│     • "Shoes under 2000"        │
│                                 │
│  ⭐ View Product Reviews        │
│     • Pros and cons summary     │
│     • Recommendation score      │
│     • Sentiment analysis        │
│                                 │
└─────────────────────────────────┘
```

### Seller (Shop) Dashboard
```
┌─────────────────────────────────┐
│   SELLER/SHOP DASHBOARD         │
├─────────────────────────────────┤
│                                 │
│  📝 Create Product Descriptions │
│     • Auto-generated content    │
│     • Professional descriptions │
│     • SEO keywords included     │
│                                 │
│  🏷️ Categorize Products         │
│     • Smart categorization      │
│     • Auto-tagging              │
│     • Confidence scoring        │
│                                 │
│  ⭐ Analyze Reviews             │
│     • Customer feedback summary │
│     • Identify improvements     │
│     • Trend monitoring          │
│                                 │
└─────────────────────────────────┘
```

---

## 🎯 Quick Feature Comparison

| Aspect | Users | Sellers |
|--------|-------|---------|
| **Features Available** | Search, Reviews | Description, Categories, Reviews |
| **Main Benefit** | Discover products | List products effectively |
| **Time Saved** | Faster search | Faster product creation |
| **AI Usage** | Search parsing | Content generation |
| **Authentication** | Required | Not always required |
| **Focus** | Buying experience | Selling experience |

---

## 💡 Integration Examples

### For Users: Search Integration
```javascript
// In User's Product Search Page
const handleSearch = async (query) => {
  const results = await aiService.searchIntent(query, token);
  // Display results and summary to user
  displayProductResults(results);
};
```

### For Sellers: Product Listing Creation
```javascript
// In Seller's Product Creation Form
const handleCreateProduct = async (productData) => {
  // Generate description
  const description = await aiService.generateDescription(productData);
  
  // Get category suggestions
  const categories = await aiService.suggestCategories(productData);
  
  // Seller reviews and approves, then saves to database
  saveProductToDB({ ...productData, ...description, ...categories });
};
```

### For Sellers: Review Analytics
```javascript
// In Seller's Product Analytics Page
const handleViewAnalytics = async (productId) => {
  const summary = await aiService.getReviewSummary(productId, token);
  // Display pros, cons, and insights to seller
  displayReviewAnalytics(summary);
};
```

---

| Feature | Method | Endpoint | Auth | Response Time |
|---------|--------|----------|------|---|
| Search | POST | /ai/search-intent | ✅ | 2-3s |
| Generate | POST | /ai/generate-description | ❌ | 4-5s |
| Suggest | POST | /ai/suggest-category-tags | ❌ | 2-3s |
| Review | POST | /ai/review-summary/:id | ✅ | 3-4s |

---

### Required Headers

```
Content-Type: application/json
Authorization: Bearer {token}  // Only for protected endpoints
```

---

### Base URL

```
http://localhost:3005
```

---

## 📞 Support Resources

- **Documentation:** README.md
- **Setup Guide:** AI_SETUP_GUIDE.md
- **API Tests:** Postman_Collection.json
- **Verification:** node setup.js
- **Integration Tests:** node src/tests/integration.test.js

---

**Version:** 2.0.0  
**Status:** ✅ Production Ready  
**Last Updated:** 2024-05-05

---

## 📱 Implementation Checklist by User Type

### For User (Buyer) Features

```
Frontend Integration - Buyer App/Website
├── ✅ Search Feature Component
│   └── Natural language input field
│   └── Results display component
│   └── Call: POST /ai/search-intent (with auth token)
│
└── ✅ Review Summary Component
    └── Display pro/con lists
    └── Show sentiment badge
    └── Show recommendation score
    └── Call: POST /ai/review-summary/:productId (with auth token)

Required:
• User authentication (to get bearer token)
• User dashboard/search page
• Product detail page for reviews
```

### For Seller (Shop) Features

```
Frontend Integration - Seller Dashboard
├── ✅ Product Description Generator
│   └── Form input (title, category, description)
│   └── Generation button
│   └── Display generated content
│   └── Call: POST /ai/generate-description (no auth needed)
│   └── Allow seller to review/edit before saving
│
├── ✅ Category & Tag Suggestion
│   └── Form input (title, description)
│   └── Suggestion button
│   └── Display category options
│   └── Display tag suggestions
│   └── Call: POST /ai/suggest-category-tags (no auth needed)
│   └── Allow seller to select/customize
│
└── ✅ Review Analytics
    └── Analytics dashboard
    └── Show pro/con insights
    └── Show sentiment trends
    └── Call: POST /ai/review-summary/:productId (with auth token)

Required:
• Seller authentication (for review analytics)
• Product creation/editing pages
• Analytics dashboard page
```

---

## 🔐 Authentication Flow by User Type

### For Users (Buyers)

```
1. User logs in with email/password
   ↓
2. Auth Service returns JWT token
   ↓
3. Store token in localStorage/sessionStorage
   ↓
4. Include token in AI Service requests:
   • POST /ai/search-intent → Include Bearer token
   • POST /ai/review-summary/:id → Include Bearer token
   ↓
5. Browse products, use AI search features
```

### For Sellers (Shop Owners)

```
1. Seller logs in with email/password
   ↓
2. Auth Service returns JWT token
   ↓
3. Store token in localStorage/sessionStorage
   ↓
4. Use AI features as follows:
   
   a) Description & Category (NO AUTH NEEDED):
      • POST /ai/generate-description → No token needed
      • POST /ai/suggest-category-tags → No token needed
      • Can be called from client directly
   
   b) Review Analytics (AUTH NEEDED):
      • POST /ai/review-summary/:id → Include Bearer token
   ↓
5. Create/edit products with AI assistance
6. Analyze reviews and customer feedback
```

---

## 🎓 Who Gets Which Features

### User/Buyer Perspective
```
✅ CAN ACCESS:
  • AI Search Intent → Find products with natural language
  • Review Summary → See pros/cons before buying

❌ CANNOT ACCESS:
  • Description Generator → Can't create descriptions
  • Category Suggestion → Can't suggest categories
```

### Seller/Shop Perspective
```
✅ CAN ACCESS:
  • Description Generator → Create product descriptions
  • Category Suggestion → Get category recommendations
  • Review Summary → Analyze customer feedback

❌ CANNOT ACCESS:
  • Search Intent (but searches work for customers)
```

---
