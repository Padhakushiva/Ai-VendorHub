# 🤖 AI Service - Marketplace Assistant

> Intelligent AI-powered features for enhanced product discovery, content generation, and user experience in the Ai-VendorHub marketplace.

## 🎯 Features

- **🔍 AI Product Search Assistant** - Natural language search with intelligent filter parsing
- **📝 Product Description Generator** - Auto-generate professional descriptions with bullet points
- **🏷️ Category & Tag Suggestion** - Smart categorization based on product details
- **⭐ Review Summary Generator** - Extract pros, cons, and sentiment from customer reviews

## 🚀 Quick Start

### 1. Installation
```bash
cd AI
npm install
```

### 2. Configuration
```bash
cp .env.example .env
# Edit .env and add your Google Gemini API key
```

### 3. Start Server
```bash
npm run dev  # Development with auto-reload
npm start    # Production mode
```

Server runs on: **http://localhost:3005**

## 📚 API Endpoints

### 1. Search Intent
```bash
POST /ai/search-intent
Authorization: Bearer {token}
Content-Type: application/json

{
  "query": "show me shoes under 2000 for college"
}
```

**Response:** Parsed filters + matching products + AI summary

---

### 2. Generate Description
```bash
POST /ai/generate-description
Content-Type: application/json

{
  "title": "Nike Air Max Running Shoes",
  "category": "Footwear",
  "basicDescription": "Comfortable running shoes",
  "price": 5999
}
```

**Response:** Full description, bullet points, tags, SEO keywords

---

### 3. Suggest Categories
```bash
POST /ai/suggest-category-tags
Content-Type: application/json

{
  "title": "Sony Wireless Headphones",
  "description": "Premium noise-cancelling wireless headphones"
}
```

**Response:** Category suggestions, tags, confidence score

---

### 4. Review Summary
```bash
POST /ai/review-summary/:productId
Authorization: Bearer {token}
```

**Response:** Pros, cons, sentiment, recommendation score

## 📋 Project Structure

```
AI/
├── src/
│   ├── app.js                    # Express app
│   ├── routes/ai.routes.js       # All endpoints
│   ├── controllers/              # Endpoint handlers
│   ├── services/                 # Business logic
│   └── tests/integration.test.js # Test suite
├── server.js                     # Entry point
├── package.json                  # Dependencies
├── .env.example                  # Config template
└── docs/
    ├── AI_API_DOCUMENTATION.md   # Full API docs
    └── AI_SETUP_GUIDE.md         # Detailed setup
```

## 🔐 Authentication

- Required for: `search-intent`, `review-summary`
- Not required for: `generate-description`, `suggest-category-tags`

```
Authorization: Bearer YOUR_JWT_TOKEN
```

## ⚙️ Environment Variables

```env
GOOGLE_API_KEY=your_google_gemini_api_key
NODE_ENV=development
PORT=3005
PRODUCT_SERVICE_URL=http://localhost:3000
CART_SERVICE_URL=http://localhost:3002
```

## 🧪 Testing

```bash
# Run integration tests
node src/tests/integration.test.js

# Or use npm script (if added)
npm test
```

## 📊 Service Dependencies

| Service | URL | Purpose |
|---------|-----|---------|
| Product Service | http://localhost:3000 | Fetch products & reviews |
| Auth Service | http://localhost:3001 | JWT token validation |
| Cart Service | http://localhost:3002 | Future: Add to cart |

## 🛠️ Dependencies

```json
{
  "@langchain/core": "AI framework core",
  "@langchain/google-genai": "Google Gemini integration",
  "@langchain/langgraph": "AI workflow orchestration",
  "express": "Web framework",
  "axios": "HTTP client",
  "dotenv": "Environment configuration",
  "socket.io": "Real-time communication"
}
```

## 🎨 Design Principles

- **Modular:** Each feature is independent
- **Scalable:** Easy to add new AI features
- **Reliable:** Error handling and logging
- **Documented:** Comprehensive API docs
- **Tested:** Integration tests included

## 💡 Usage Examples

### Node.js
```javascript
const axios = require('axios');

const searchProducts = async (query) => {
  const response = await axios.post('http://localhost:3005/ai/search-intent', {
    query
  }, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
};

// Usage
const results = await searchProducts('shoes under 2000');
```

### cURL
```bash
curl -X POST http://localhost:3005/ai/search-intent \
  -H "Authorization: Bearer token" \
  -H "Content-Type: application/json" \
  -d '{"query": "shoes under 2000"}'
```

### Frontend/React
```javascript
import axios from 'axios';

const generateDescription = async (productData) => {
  try {
    const response = await axios.post('/api/ai/generate-description', productData);
    return response.data.generatedContent;
  } catch (error) {
    console.error('Failed to generate description:', error);
  }
};
```

## 🔧 Troubleshooting

### Issue: "API Key not provided"
- Check `.env` file has `GOOGLE_API_KEY`
- Verify key is valid at https://aistudio.google.com/app/apikey
- Restart server

### Issue: "Product Service connection refused"
- Ensure Product Service running on port 3000
- Check `PRODUCT_SERVICE_URL` in `.env`

### Issue: Timeout errors
- Increase timeout threshold in services
- Check network latency
- Verify service is responsive

## 📈 Performance

| Endpoint | Avg Time | Max Time |
|----------|----------|----------|
| Search Intent | 2-3s | 5s |
| Description | 4-5s | 8s |
| Category Suggest | 2-3s | 5s |
| Review Summary | 3-4s | 6s |

## 🚧 Roadmap

- [ ] WebSocket support for real-time chat
- [ ] Image analysis and tagging
- [ ] Multi-language support
- [ ] Caching layer for frequent queries
- [ ] Analytics dashboard
- [ ] A/B testing framework
- [ ] Personalization engine
- [ ] Mobile API optimization

## 🤝 Integration Examples

### With Product Service
```javascript
// Search returns integrated product data
const searchResults = await aiService.generateSearchIntent('gaming laptop');
// Results include full product details from Product Service
```

### Future: With Cart Service
```javascript
// AI can add products to cart on user's behalf
await aiService.addProductToCart(productId, quantity, userId);
```

## 📝 API Response Format

All endpoints return:
```json
{
  "success": true|false,
  "message": "...",
  "data": { /* service-specific data */ },
  "timestamp": "2024-05-05T10:30:00Z",
  "error": "..." /* only on failure */
}
```

## 🎓 Learning Resources

- [Google Gemini API Docs](https://ai.google.dev/docs)
- [LangChain Documentation](https://python.langchain.com/docs)
- [Express.js Guide](https://expressjs.com)

## 📞 Support

For issues or questions:
1. Check [AI_API_DOCUMENTATION.md](./AI_API_DOCUMENTATION.md)
2. Review [AI_SETUP_GUIDE.md](./AI_SETUP_GUIDE.md)
3. Check error logs in console

## 📄 License

Proprietary - Ai-VendorHub Project 2024

## 👥 Contributors

- AI Service Team
- Backend Development Team

---

**Version:** 2.0.0  
**Last Updated:** 2024-05-05  
**Status:** Production Ready ✅
