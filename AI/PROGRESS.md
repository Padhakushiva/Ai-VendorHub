AI Service — Progress & Next Steps
Date: 2026-05-06 (Updated)

## ✅ Completed Work

### Phase 1 (Previously completed):
- Started and verified Product Service (port 3000) with real product data.
- Prevented unconditional Gemini/LLM instantiation when `GOOGLE_API_KEY` missing.
- Added fallback parsers and guarded services to avoid crashes when LLM unavailable.
- Updated `ecommerce-agent` and Chat node to call Product API directly (axios) for stable product responses.
- Implemented timeouts around LLM calls and increased timeouts to handle latency.
- Added background AI improvement task to attempt non-blocking model refinements.
- Replaced LLM-generated summaries/descriptions with fast fallbacks to avoid invoke() hangs.
- Hardened `searchIntent.service.js` (robust parsing, response-key handling, product API error logging).
- Restarted services and validated HTTP endpoints: `/health`, `/ai/search-intent`, `/ai/generate-description`, `/ai/suggest-category-tags`.

### Phase 2 (Just completed):

1. **✅ Re-enabled Gemini/LangChain invoke with protection**
   - All 4 services (search, description, category, review) now try Gemini FIRST
   - Circuit Breaker (`src/utils/circuitBreaker.js`) — opens after 3 consecutive failures, auto-recovers
   - Retry with Exponential Backoff (`src/utils/retryWithBackoff.js`) — up to 3 retries with jitter
   - Graceful fallback to local parsers when LLM fails or circuit is OPEN

2. **✅ Re-integrated structured model-to-tool invocation (LangChain tools)**
   - `ecommerce-agent.js` now uses `model.bindTools()` for Gemini tool calling
   - Tools node executes tool calls returned by the model
   - Falls back to direct API search if tool calling fails
   - Graph flow: `__start__ → intent_check → chat ↔ tools → __end__`

3. **✅ Improved keyword extraction**
   - New `src/utils/queryParser.js` with:
     - Multi-keyword extraction
     - Comprehensive stop-word list (English + Hindi)
     - Synonym expansion
     - Price range extraction (under X, between X-Y, above X)
     - Category auto-detection from common e-commerce terms
     - Sort intent detection (cheapest, latest, best, etc.)
     - Color/size/brand attribute extraction
     - Fuzzy matching support

4. **✅ Added retry/backoff and circuit-breaker**
   - `CircuitBreaker` class: CLOSED → OPEN → HALF_OPEN lifecycle
   - Opens circuit after 3 consecutive failures (configurable)
   - Auto-recovers after 30s cooldown
   - `retryWithBackoff`: exponential delay with jitter
   - Non-retryable error detection (e.g., "Circuit is OPEN")

5. **✅ Fixed socket client authentication**
   - Socket now accepts tokens from 4 sources:
     - Cookie (`token=...`)
     - Authorization header (`Bearer ...`)
     - Socket.io auth object (`socket.handshake.auth.token`)
     - Query parameter (`?token=...`)
   - `test_socket_real.js` generates a valid test JWT automatically
   - Added `chat` event handler alongside `message` for backward compatibility
   - Added typing indicators and welcome message

6. **✅ Added metrics/health checks for LLM success/failure rates**
   - `src/utils/llmMetrics.js` — ring buffer tracking all LLM calls
   - Per-endpoint breakdown (calls, successes, failures, avg latency)
   - Global success rate and last-5-minute window
   - Recent errors log
   - `GET /health` — includes full metrics + feature flags
   - `GET /ai/metrics` — detailed metrics endpoint

7. **✅ Added feature flags to toggle LLM-heavy features**
   - `src/utils/featureFlags.js` — toggleable flags for each LLM feature
   - Flags: LLM_ENABLED, LLM_SEARCH_INTENT, LLM_DESCRIPTION_GENERATOR, etc.
   - Env override: `FF_LLM_ENABLED=false` disables all
   - Runtime toggle: `POST /ai/feature-flags` with `{ flag, enabled }`
   - Auto-disables all flags when GOOGLE_API_KEY missing

8. **✅ Enhanced Conversational Shopping (Rufus AI style)**
   - Replaced hardcoded string templates with dynamic LLM generation.
   - Added conversational memory using LangChain (`SystemMessage`, `HumanMessage`, `AIMessage`).
   - Dual-pass approach:
     - Pass 1: Extract intent (with full chat history context).
     - Fetch products based on intent.
     - Pass 2: Generate rich, contextual, and helpful response incorporating the fetched products and user history.
   - Session tracking map integrated to handle `sessionId`.

## Files Modified/Created

### New Files:
- `src/utils/circuitBreaker.js` — Circuit breaker implementation
- `src/utils/retryWithBackoff.js` — Exponential backoff retry
- `src/utils/featureFlags.js` — Feature flag system
- `src/utils/llmMetrics.js` — LLM call metrics tracker
- `src/utils/queryParser.js` — Advanced query parser

### Modified Files:
- `src/services/searchIntent.service.js` — Re-enabled Gemini with fallback
- `src/services/description.service.js` — Re-enabled Gemini with fallback
- `src/services/categoryTag.service.js` — Re-enabled Gemini with fallback
- `src/services/reviewSummary.service.js` — Re-enabled Gemini with fallback
- `src/agent/ecommerce-agent.js` — Re-enabled tool calling with fallback
- `src/agent/ecommerce-tools.js` — Fixed URLs and response handling
- `src/app.js` — Added metrics/health/feature-flag endpoints
- `src/sokcets/sockets.server.js` — Fixed multi-source auth
- `test_socket_real.js` — Proper JWT auth test
- `src/tests/integration.test.js` — Comprehensive test suite
- `.env` — Added PRODUCT_SERVICE_URL and NODE_ENV

## Architecture

```
Client Request
     │
     ▼
  Express Server (port 3005)
     │
     ├── GET /health ─── Metrics + Feature Flags
     ├── GET /ai/metrics ─── LLM stats
     ├── POST /ai/feature-flags ─── Toggle
     │
     ├── POST /ai/search-intent ─── SearchIntentService
     │     ├── Try Gemini (circuit breaker + retry)
     │     ├── Fallback: queryParser.parseQuery()
     │     └── Call Product API
     │
     ├── POST /ai/generate-description ─── DescriptionService
     │     ├── Try Gemini (circuit breaker + retry)
     │     └── Fallback: template-based
     │
     ├── POST /ai/suggest-category-tags ─── CategoryTagService
     │     ├── Try Gemini (circuit breaker + retry)
     │     └── Fallback: keyword category map
     │
     ├── POST /ai/review-summary/:id ─── ReviewSummaryService
     │     ├── Try Gemini (circuit breaker + retry)
     │     └── Fallback: statistical analysis
     │
     └── WebSocket (socket.io)
           ├── Auth: cookie | header | auth obj | query
           └── Ecommerce Agent (LangGraph)
                 ├── intent_check → chat ↔ tools → __end__
                 ├── Try Gemini with bindTools()
                 └── Fallback: direct product API
```

File: AI/PROGRESS.md
