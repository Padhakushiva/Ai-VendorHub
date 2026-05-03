# AI Buddy Service Documentation

Last Updated: 2026-05-03

## Overview
AI Buddy Service is a personal shopping assistant that accepts natural language queries, searches products, and can add items to the user's cart. It uses Socket.IO for real-time messaging and a LangChain agent backed by Google Gemini 2.0 Flash.

This service does NOT expose a public REST API for chat. It exposes:
- HTTP health and info endpoints for monitoring
- A WebSocket (Socket.IO) interface for chat messages

## Features
- Natural language product search ("find me red sneakers under 2000")
- Product lookup via Product Service
- Add items to cart via Cart Service
- JWT-based authentication via cookie token
- Structured tool calls with schema validation (Zod)
- Logging and error handling for tool calls

## Service Ports
- AI Buddy Service: 3005
- Product Service: 3000
- Cart Service: 3002
- Auth Service: 3001

## Dependencies
- @langchain/langgraph
- @langchain/core
- @langchain/google-genai
- socket.io
- axios

## Environment Variables
Required:
- GOOGLE_API_KEY
- JWT_SECRET

Optional:
- CORS_ORIGIN (default: *)
- NODE_ENV (recommended: development)

## HTTP Endpoints

### GET /
Returns basic service info.

Response example:
```
{
  "message": "AI Buddy Service is running",
  "service": "AI Buddy - Personal Shopping Assistant",
  "version": "1.0.0",
  "connection": "Connect via WebSocket at ws://localhost:3005",
  "description": "Acts like a personal shopping assistant. Parse natural language queries and query Product Service, Can create cart items on behalf of user."
}
```

### GET /health
Returns health status.

Response example:
```
{
  "status": "OK",
  "service": "AI Buddy Service",
  "port": 3005
}
```

## WebSocket (Socket.IO) API
Namespace: default

### Authentication
The client must send a cookie named `token` containing a valid JWT signed with `JWT_SECRET`.

Handshake example:
- Header: `cookie: token=<jwt>`

### Events

#### Client -> Server: `message`
Send a natural language query.

Payload:
```
"Find me red sneakers under 2000"
```

#### Server -> Client: `response`
The AI response message.

Payload example:
```
{
  "success": true,
  "message": "I found 3 red sneakers under 2000. Do you want me to add the first one to your cart?",
  "timestamp": "2026-05-03T12:34:56.000Z"
}
```

#### Server -> Client: `error`
Error response.

Payload example:
```
{
  "success": false,
  "message": "Failed to process message",
  "error": "Internal server error",
  "timestamp": "2026-05-03T12:34:56.000Z"
}
```

## Internal Tool Endpoints
The AI agent calls these internal service endpoints.

### Product Search Tool
- Method: GET
- URL: http://localhost:3000/api/product
- Query param: `q` (string)
- Auth: Bearer token in `Authorization` header

Example:
```
GET /api/product?q=red%20sneakers
Authorization: Bearer <jwt>
```

### Add to Cart Tool
- Method: POST
- URL: http://localhost:3002/api/cart/items
- Body:
```
{
  "productId": "<product-id>",
  "qty": 1
}
```
- Auth: Bearer token in `Authorization` header

## End-to-End Flow

### 1) User sends message
User sends a natural language query via Socket.IO:
"Find me red sneakers under 2000"

### 2) AI agent interprets intent
- The LLM extracts search intent and attributes (color, price ceiling)
- The agent decides to call `searchProduct`

### 3) Product Service search
- Tool calls Product Service:
  GET http://localhost:3000/api/product?q=red sneakers
- Product Service returns matching items

### 4) AI response to user
- AI summarizes results and asks whether to add to cart

### 5) User asks to add item
User message: "Add the first one"

### 6) Add to cart
- Tool calls Cart Service:
  POST http://localhost:3002/api/cart/items
- Cart Service confirms addition

### 7) Final confirmation
AI responds: "Added item to your cart."

## Example Client (Socket.IO)
```
const io = require('socket.io-client');

const socket = io('http://localhost:3005', {
  extraHeaders: { cookie: `token=${TOKEN}` }
});

socket.on('connect', () => {
  socket.emit('message', 'Find me red sneakers under 2000');
});

socket.on('response', (data) => {
  console.log('AI response:', data);
});

socket.on('error', (err) => {
  console.error('AI error:', err);
});
```

## Troubleshooting

- "Authentication error: No token provided"
  - Make sure cookie header includes `token=<jwt>`

- "Product Service (localhost:3000) is not running"
  - Start Product Service on port 3000

- "Cart Service (localhost:3002) is not running"
  - Start Cart Service on port 3002

- "Cannot find module @langchain/google-genai"
  - Run `npm install` inside AI service

## File References
- Server entry: AI/server.js
- WebSocket handler: AI/src/sokcets/sockets.server.js
- Agent: AI/src/agent/agent.JS
- Tools: AI/src/agent/tools.js
- Express app: AI/src/app.js
