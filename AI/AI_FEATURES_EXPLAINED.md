# 🤖 AI Service — Complete Features & API Guide

> **Base URL:** `http://localhost:3005`  
> **Port:** 3005  
> **Version:** 3.0.0

---

## 📌 Overview — Kya hai ye AI Service?

Ye AI Service ek **E-commerce Marketplace** ke liye banaya gaya hai. Isme Gemini AI (Google ka LLM) use hota hai products search karne, descriptions generate karne, categories suggest karne, aur reviews summarize karne ke liye.

**Agar Gemini API down ho ya quota khatam ho jaye** — toh service crash nahi hoti. Fallback system automatically kaam karta hai aur basic results deta hai. Jab Gemini wapas aata hai, automatically AI results dene lagta hai.

### ✨ All Features:
| # | Feature | Endpoint | Unique Point |
|---|---------|----------|-------------|
| 1 | 🔍 AI Smart Search | `POST /ai/search-intent` | Natural language → MongoDB `$text` search |
| 2 | 💬 Conversational Shopping | `POST /ai/chat` | Chat-style UX, intent detection |
| 3 | 🔁 Similar Products | `GET /ai/similar/:id` | "You may also like" recommendations |
| 4 | ⚖️ Product Comparison | `POST /ai/compare` | Side-by-side with AI verdict |
| 5 | 💰 Smart Budget Shopping | `POST /ai/smart-budget` | **UNIQUE** — bundle products within budget |
| 6 | 🎨 Mood Shopping | `POST /ai/mood-shopping` | Vibe → products (minimal, cozy, gaming) |
| 7 | 📝 Description Generator | `POST /ai/generate-description` | Bullet points + SEO keywords |
| 8 | 🏷️ Category & Tags | `POST /ai/suggest-category-tags` | Auto-categorize products |
| 9 | ⭐ Review Summary | `POST /ai/review-summary/:id` | Pros/Cons + sentiment |
| 10 | 📊 Health & Metrics | `GET /health`, `GET /ai/metrics` | LLM call tracking |
| 11 | 🚩 Feature Flags | `POST /ai/feature-flags` | Runtime LLM toggle |

---

## 🔗 All Endpoints

| Method | Endpoint | Auth? | Description |
|--------|----------|-------|-------------|
| GET | `/` | ❌ | Service info |
| GET | `/health` | ❌ | Health + metrics |
| GET | `/ai/metrics` | ❌ | Detailed LLM metrics |
| POST | `/ai/search-intent` | ✅ | AI Smart Search |
| POST | `/ai/chat` | ✅ | Conversational Shopping |
| GET | `/ai/similar/:productId` | ✅ | Similar Products |
| POST | `/ai/compare` | ✅ | Product Comparison |
| POST | `/ai/smart-budget` | ✅ | Smart Budget Shopping |
| POST | `/ai/mood-shopping` | ✅ | Mood-based Shopping |
| POST | `/ai/generate-description` | ❌ | Description Generator |
| POST | `/ai/suggest-category-tags` | ❌ | Category & Tag Suggestion |
| POST | `/ai/review-summary/:productId` | ✅ | Review Summary |
| POST | `/ai/feature-flags` | ❌ | Toggle Feature Flags |

**Auth = ✅** matlab `Authorization: Bearer <JWT_TOKEN>` header chahiye.

---

## 1️⃣ 🔍 AI Smart Search — `POST /ai/search-intent`

### Kya karta hai?
User kuch bhi likhe — "gaming product under 2000", "cheap headphones", "study setup ke liye products" — AI samjhega aur MongoDB ka `$text` index use karke matching products dhundega.

### Backend flow:
```
User query → AI parses → { keyword: "gaming", maxPrice: 2000 }
                     ↓
MongoDB: $text search on (title, description) + price.amount <= 2000
                     ↓
Products returned with summary
```

### Postman:
```
Method: POST
URL: http://localhost:3005/ai/search-intent
Headers:
  Content-Type: application/json
  Authorization: Bearer <TOKEN>
```

### Body Examples:
```json
{ "query": "gaming product under 2000" }
{ "query": "cheap headphones" }
{ "query": "products for study setup" }
{ "query": "iphone between 50000 and 100000 latest" }
{ "query": "red shoes under 3000" }
```

### Response:
```json
{
  "success": true,
  "query": "gaming product under 2000",
  "parsedFilters": {
    "keywords": ["gaming", "product"],
    "priceRange": { "min": null, "max": 2000 },
    "category": "Electronics",
    "sortBy": "relevance"
  },
  "productsFound": 5,
  "products": [...],
  "summary": "Found 5 products matching your search. Price range: ₹999 - ₹1999.",
  "usedLLM": true
}
```

---

## 2️⃣ 💬 Conversational Shopping Assistant — `POST /ai/chat`

### Kya karta hai?
Normal ecommerce mein sirf filters hote hain. Yahan user chat kar sakta hai jaise kisi dost se baat ho. AI intent samjhega — search, recommend, budget, ya off-topic — aur accordingly respond karega.

### Ye feature strong kyun hai?
- Off-topic questions detect hote hain aur politely decline hote hain
- Budget, category, keywords sab automatically detect hota hai
- Natural, conversational reply milta hai
- sessionId se multi-turn conversations possible hain (future)

### Postman:
```
Method: POST
URL: http://localhost:3005/ai/chat
Headers:
  Content-Type: application/json
  Authorization: Bearer <TOKEN>
```

### Body Examples:
```json
{ "message": "Suggest products for coding", "sessionId": "user-001" }
{ "message": "Best products under 1000" }
{ "message": "I need something for my gaming setup" }
{ "message": "Who is PM of India?" }
```

### Response:
```json
{
  "success": true,
  "message": "Suggest products for coding",
  "intent": {
    "type": "recommend",
    "keywords": ["keyboard", "mouse", "headphones"],
    "maxBudget": null,
    "sortBy": "relevance",
    "response": "Great! Let me find the best coding essentials for you!"
  },
  "reply": "Great choice! Here are my top recommendations ranging from ₹500 to ₹5000. All products are in stock and ready to ship! 🎯",
  "products": [...],
  "totalFound": 8,
  "usedLLM": true
}
```

---

## 3️⃣ 🔁 Similar Product Recommendation — `GET /ai/similar/:productId`

### Kya karta hai?
User kisi product page par hai — AI automatically similar products dikhata hai ("You may also like"). Current product ke title, description, aur category se keywords nikalke related products dhundha jaata hai. Price similarity ke basis pe rank kiya jaata hai.

### Example:
```
Product: Wireless Gaming Mouse
Similar: Gaming Keyboard, RGB Mousepad, Gaming Headphones, USB Hub
```

### Postman:
```
Method: GET
URL: http://localhost:3005/ai/similar/6789abcdef1234567890abcd
Headers:
  Authorization: Bearer <TOKEN>
```

### Response:
```json
{
  "success": true,
  "sourceProduct": {
    "id": "6789abcdef1234567890abcd",
    "title": "Wireless Gaming Mouse",
    "price": { "amount": 1500, "currency": "INR" },
    "category": "Electronics"
  },
  "similarProducts": [
    {
      "_id": "...",
      "title": "Mechanical Gaming Keyboard",
      "price": { "amount": 2500, "currency": "INR" },
      "stock": 10,
      "category": "Electronics"
    }
  ],
  "totalFound": 6,
  "searchKeywords": ["gaming mouse", "wireless mouse", "rgb mouse"]
}
```

---

## 4️⃣ ⚖️ AI Product Comparison — `POST /ai/compare`

### Kya karta hai?
2-5 products ke IDs do — AI har product ka price, availability, description compare karega aur ek verdict dega. "Product A cheaper hai, Product B mein better features hain."

### Postman:
```
Method: POST
URL: http://localhost:3005/ai/compare
Headers:
  Content-Type: application/json
  Authorization: Bearer <TOKEN>
```

### Body:
```json
{
  "productIds": [
    "6789abcdef1234567890ab01",
    "6789abcdef1234567890ab02"
  ]
}
```

### Response:
```json
{
  "success": true,
  "productsCompared": 2,
  "comparisonTable": [
    {
      "id": "...",
      "title": "iPhone 15 Pro Max",
      "price": 109999,
      "currency": "INR",
      "stock": 45,
      "inStock": true,
      "category": "Electronics",
      "brand": "Apple",
      "description": "..."
    },
    {
      "id": "...",
      "title": "Samsung Galaxy S24",
      "price": 79999,
      "currency": "INR",
      "stock": 20,
      "inStock": true,
      "category": "Electronics",
      "brand": "Samsung"
    }
  ],
  "analysis": {
    "cheapest": "Samsung Galaxy S24",
    "bestValue": "Samsung Galaxy S24",
    "highlights": [
      "Price range: ₹79999 — ₹109999 (difference: ₹30000)",
      "Samsung Galaxy S24 is the most affordable option",
      "Both products are currently in stock"
    ],
    "recommendation": "Samsung Galaxy S24 is ₹30000 cheaper. Consider your budget.",
    "verdict": "Go with Samsung for budget savings, or iPhone for premium ecosystem."
  },
  "usedLLM": false
}
```

---

## 5️⃣ 💰 Smart Budget Shopping — `POST /ai/smart-budget`

### Kya karta hai? *(YE UNIQUE HAI)*
Normal ecommerce mein user ek product dhundta hai. Yahan user apna **total budget** aur **purpose** batata hai — AI multiple products combine karke ek optimized bundle banata hai jo budget ke andar fit ho.

### Example:
```
Budget: ₹5000, Purpose: "gaming setup"
↓
AI suggests: mouse + keyboard + headphones + mousepad
Mouse        → ₹1000
Keyboard     → ₹2000
Headphones   → ₹1500
Mousepad     → ₹300
─────────────────────
Total Spent  → ₹4800  ✅
Remaining    → ₹200   💰
```

### Postman:
```
Method: POST
URL: http://localhost:3005/ai/smart-budget
Headers:
  Content-Type: application/json
  Authorization: Bearer <TOKEN>
```

### Body Examples:
```json
{ "budget": 5000, "purpose": "gaming setup" }
{ "budget": 3000, "purpose": "study desk setup" }
{ "budget": 10000, "purpose": "home office setup" }
{ "budget": 2000, "purpose": "cozy bedroom" }
{ "budget": 8000, "purpose": "photography" }
```

### Response:
```json
{
  "success": true,
  "budget": 5000,
  "purpose": "gaming setup",
  "bundle": [
    {
      "_id": "...",
      "title": "Gaming Mouse RGB",
      "price": { "amount": 999, "currency": "INR" },
      "stock": 15,
      "category": "gaming mouse"
    },
    {
      "_id": "...",
      "title": "Mechanical Keyboard",
      "price": { "amount": 2199, "currency": "INR" },
      "stock": 8,
      "category": "mechanical keyboard"
    }
  ],
  "totalItems": 2,
  "totalSpent": 3198,
  "remaining": 1802,
  "savingsPercent": "36.0%",
  "searchTerms": ["gaming mouse", "mechanical keyboard", "gaming headphones", "mouse pad"],
  "summary": "Found 2 products for your 'gaming setup' within ₹5000. Total: ₹3198, Remaining: ₹1802."
}
```

---

## 6️⃣ 🎨 Mood/Intent Based Shopping — `POST /ai/mood-shopping`

### Kya karta hai?
User koi vibe ya mood express karta hai — "minimal desk setup", "aesthetic products", "cozy room items" — AI samjhega aur matching products dhundega. Normal search se zyada intuitive hai.

### Ye bahut modern kyun lagta hai?
- User exact product naam nahi jaanta — bas vibe express karta hai
- AI automatically product categories map karta hai
- Gen Z aur millennials ke liye perfect UX

### Mood Map:
| Mood | Maps to Products |
|------|-----------------|
| minimal | minimalist, simple, clean, desk accessories |
| aesthetic | pastel, cute, pink, decor |
| cozy | lamp, cushion, warm items |
| gaming | RGB, mechanical, gaming headset |
| coding | keyboard, mouse, monitor stand |
| study | notebook, pen, lamp, organizer |
| travel | portable, power bank, earphones |

### Postman:
```
Method: POST
URL: http://localhost:3005/ai/mood-shopping
Headers:
  Content-Type: application/json
  Authorization: Bearer <TOKEN>
```

### Body Examples:
```json
{ "mood": "minimal desk setup", "maxBudget": 5000 }
{ "mood": "aesthetic products" }
{ "mood": "cozy room items", "maxBudget": 2000 }
{ "mood": "gaming aesthetic dark setup" }
{ "mood": "productive coding setup" }
```

### Response:
```json
{
  "success": true,
  "mood": "minimal desk setup",
  "moodAnalysis": {
    "description": "A clean, clutter-free workspace with essential accessories",
    "vibe": "minimal"
  },
  "searchKeywords": ["desk organizer", "minimalist lamp", "cable management", "white keyboard"],
  "products": [
    {
      "_id": "...",
      "title": "Minimalist Desk Organizer",
      "price": { "amount": 799, "currency": "INR" },
      "stock": 25,
      "matchedVia": "desk organizer"
    }
  ],
  "totalFound": 8,
  "usedLLM": true,
  "message": "Found 8 products for your 'minimal desk setup' vibe!"
}
```

---

## 7️⃣ 📝 Description Generator — `POST /ai/generate-description`

### Body:
```json
{
  "title": "Nike Air Max Running Shoes",
  "category": "Footwear",
  "basicDescription": "Comfortable running shoes with air cushioning",
  "price": 5999
}
```

### Response: fullDescription, bulletPoints[], tags[], seoKeywords[]

---

## 8️⃣ 🏷️ Category & Tag Suggestion — `POST /ai/suggest-category-tags`

### Body:
```json
{
  "title": "Sony WH-1000XM5 Wireless Headphones",
  "description": "Premium noise-cancelling wireless headphones"
}
```

### Response: category, subcategory, tags[], confidence, reasoning

---

## 9️⃣ ⭐ Review Summary — `POST /ai/review-summary/:productId`

### URL: `http://localhost:3005/ai/review-summary/PRODUCT_ID`
### Headers: `Authorization: Bearer <TOKEN>`
### Body: `{}`

### Response: pros[], cons[], overallSentiment, summary, recommendationScore

---

## 🛡️ Resilience — Kaise kaam karta hai?

```
User Request
     ↓
Try Gemini API (with timeout 12-20s)
     ↓
   Success? → Return AI result (usedLLM: true)
   Fail?    → Circuit Breaker counts failure
                  ↓
            3 failures → Circuit OPENS (30s)
                  ↓
            Fallback kicks in (usedLLM: false)
            Returns smart local result
```

**Every endpoint has its own fallback:**
- `/ai/chat` → Local query parser + direct product search
- `/ai/similar` → Keyword extraction from title
- `/ai/compare` → Statistical comparison (price sorting)
- `/ai/smart-budget` → Purpose keyword map + greedy optimization
- `/ai/mood-shopping` → Pre-built mood → keyword mapping

---

## 🚩 Feature Flags

### Disable all LLM (production emergency):
```json
POST /ai/feature-flags
{ "flag": "LLM_ENABLED", "enabled": false }
```

### Re-enable:
```json
{ "flag": "LLM_ENABLED", "enabled": true }
```

### Env override (before server start):
```bash
FF_LLM_ENABLED=false node server.js
```

---

## 🧪 Quick cURL Test Commands

```bash
# Conversational chat
curl -X POST http://localhost:3005/ai/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"message": "suggest products for coding"}'

# Similar products
curl http://localhost:3005/ai/similar/PRODUCT_ID \
  -H "Authorization: Bearer TOKEN"

# Compare products
curl -X POST http://localhost:3005/ai/compare \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"productIds": ["ID1", "ID2"]}'

# Smart budget
curl -X POST http://localhost:3005/ai/smart-budget \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"budget": 5000, "purpose": "gaming setup"}'

# Mood shopping
curl -X POST http://localhost:3005/ai/mood-shopping \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"mood": "minimal desk setup", "maxBudget": 5000}'
```

---

## 📁 Project Structure (Updated)

```
AI/src/
├── routes/
│   └── ai.routes.js              # All 13 endpoints registered here
│
├── controllers/
│   ├── searchIntent.controller.js
│   ├── description.controller.js
│   ├── categoryTag.controller.js
│   ├── reviewSummary.controller.js
│   ├── conversationalShopping.controller.js  ← NEW
│   ├── similarProduct.controller.js          ← NEW
│   ├── productComparison.controller.js       ← NEW
│   ├── smartBudget.controller.js             ← NEW
│   └── moodShopping.controller.js            ← NEW
│
├── services/
│   ├── searchIntent.service.js
│   ├── description.service.js
│   ├── categoryTag.service.js
│   ├── reviewSummary.service.js
│   ├── conversationalShopping.service.js     ← NEW
│   ├── similarProduct.service.js             ← NEW
│   ├── productComparison.service.js          ← NEW
│   ├── smartBudget.service.js                ← NEW
│   └── moodShopping.service.js               ← NEW
│
└── utils/
    ├── circuitBreaker.js
    ├── retryWithBackoff.js
    ├── featureFlags.js
    ├── llmMetrics.js
    └── queryParser.js
```

**File:** `AI/AI_FEATURES_EXPLAINED.md`  
**Last Updated:** 2026-05-06
