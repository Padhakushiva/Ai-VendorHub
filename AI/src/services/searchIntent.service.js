const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const axios = require("axios");
const CircuitBreaker = require("../utils/circuitBreaker");
const retryWithBackoff = require("../utils/retryWithBackoff");
const featureFlags = require("../utils/featureFlags");
const llmMetrics = require("../utils/llmMetrics");
const { parseQuery, expandSynonyms } = require("../utils/queryParser");

class SearchIntentService {
  constructor() {
    if (process.env.GOOGLE_API_KEY) {
      try {
        this.model = new ChatGoogleGenerativeAI({
          model: "gemini-2.5-flash",
          temperature: 0.3,
          apiKey: process.env.GOOGLE_API_KEY,
          maxOutputTokens: 1024,
        });
        console.log('✅ SearchIntentService: Gemini model initialized successfully');
      } catch (err) {
        console.error('❌ SearchIntentService: Failed to initialize Gemini model:', err.message);
        this.model = null;
      }
    } else {
      this.model = null;
      console.log('⚠️ GOOGLE_API_KEY not set — SearchIntentService will use fallback parser only.');
    }

    // Circuit breaker protects against cascading Gemini failures
    this.circuitBreaker = new CircuitBreaker({
      name: 'SearchIntent-LLM',
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      callTimeoutMs: 15000,
    });
  }

  /**
   * Call Gemini to parse a query into structured filters.
   * Protected by circuit breaker + retry with backoff.
   */
  async _parseWithLLM(query) {
    const parsePrompt = `You are a search query parser for an e-commerce platform. Parse the following natural language query into a JSON object.

Query: "${query}"

Return ONLY a valid JSON object with these fields:
{
  "keywords": ["array", "of", "search", "keywords"],
  "priceRange": { "min": null, "max": null },
  "category": "detected category or null",
  "sortBy": "relevance | price_asc | price_desc | rating | newest",
  "attributes": { "color": [], "brand": [], "size": [] }
}

Rules:
- Extract meaningful product keywords (not stop words).
- Detect price constraints from phrases like "under 2000", "between 1000 and 5000".
- Detect sorting intent from words like "cheapest", "best", "latest".
- Return valid JSON only, no explanation.`;

    return await this.circuitBreaker.execute(async () => {
      return await retryWithBackoff(
        async () => {
          const result = await this.model.invoke(parsePrompt);
          const text = result.content || '';
          // Extract JSON from the response
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) throw new Error('No JSON found in LLM response');
          return JSON.parse(jsonMatch[0]);
        },
        {
          maxRetries: 2,
          baseDelayMs: 1000,
          label: 'SearchIntent-LLM-Parse',
          shouldRetry: (err) => !err.message.includes('Circuit is OPEN'),
        }
      );
    });
  }

  /**
   * Parse natural language search query into filters
   * @param {string} query - Natural language search query
   * @param {string} token - Auth token for product service
   * @returns {Object} Parsed search filters and results
   */
  async generateSearchIntent(query, token) {
    const startTime = Date.now();
    let usedFallback = false;

    try {
      console.log(`🔍 Generating search intent for: "${query}"`);

      // Step 1: Parse the query into structured filters
      let parsedFilters;

      // Try LLM parsing if enabled and model available
      if (this.model && featureFlags.isEnabled('LLM_SEARCH_INTENT')) {
        try {
          console.log('🤖 Attempting LLM-based query parsing...');
          parsedFilters = await this._parseWithLLM(query);
          console.log('✅ LLM parsed filters:', JSON.stringify(parsedFilters));

          llmMetrics.record({
            endpoint: 'search-intent',
            success: true,
            latencyMs: Date.now() - startTime,
            usedFallback: false,
          });
        } catch (err) {
          console.warn(`⚠️ LLM parsing failed: ${err.message}. Using fallback parser.`);
          usedFallback = true;
          parsedFilters = null;

          llmMetrics.record({
            endpoint: 'search-intent',
            success: false,
            latencyMs: Date.now() - startTime,
            usedFallback: true,
            error: err.message,
            timedOut: err.message.includes('timed out') || err.message.includes('Timeout'),
          });
        }
      } else {
        usedFallback = true;
      }

      // Fallback: use local query parser
      if (!parsedFilters) {
        console.log('📋 Using advanced local query parser');
        parsedFilters = parseQuery(query);
        usedFallback = true;
      }

      console.log("✅ Parsed filters:", JSON.stringify(parsedFilters));

      // Step 2: Search products using parsed filters
      const searchParams = new URLSearchParams();

      if (parsedFilters.keywords && Array.isArray(parsedFilters.keywords) && parsedFilters.keywords.length > 0) {
        // Include synonym expansions for broader search coverage
        const allKeywords = new Set();
        parsedFilters.keywords.forEach(kw => {
          expandSynonyms(kw).forEach(s => allKeywords.add(s));
        });
        searchParams.append("q", parsedFilters.keywords.join(" "));
      }

      if (parsedFilters.category) {
        searchParams.append("category", parsedFilters.category);
      }

      if (parsedFilters.priceRange?.min) {
        searchParams.append("minPrice", parsedFilters.priceRange.min);
      }

      if (parsedFilters.priceRange?.max) {
        searchParams.append("maxPrice", parsedFilters.priceRange.max);
      }

      const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3000';
      const productResponse = await axios.get(
        `${productServiceUrl}/api/product?${searchParams.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 5000,
        }
      ).catch(err => {
        console.error('❌ Product service error:', err.message);
        console.error('   URL:', `${productServiceUrl}/api/product?${searchParams.toString()}`);
        throw err;
      });

      // Product service sometimes returns products under `data` or `products`
      const products = productResponse.data.data || productResponse.data.products || [];
      console.log(`✅ Product service returned keys: ${Object.keys(productResponse.data).join(', ')}`);
      console.log(`✅ Found ${products.length} products`);

      // Step 3: Generate human-friendly summary
      let summary;
      const productCount = products.length;
      if (productCount > 0) {
        const priceRange = products.length > 0
          ? `₹${Math.min(...products.map(p => p.price?.amount || 0))} - ₹${Math.max(...products.map(p => p.price?.amount || 0))}`
          : '';

        // Try LLM for a better summary (non-blocking)
        if (this.model && featureFlags.isEnabled('LLM_SEARCH_INTENT') && !usedFallback) {
          try {
            const productNames = products.slice(0, 5).map(p => p.title).join(', ');
            const summaryPrompt = `Summarize these search results in 1-2 sentences for a shopper. Query: "${query}". Found ${productCount} products including: ${productNames}. Price range: ${priceRange}.`;
            
            const summaryResult = await Promise.race([
              this.model.invoke(summaryPrompt),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Summary timeout')), 5000))
            ]);
            summary = summaryResult.content;
          } catch {
            summary = `Found ${productCount} product${productCount > 1 ? 's' : ''} matching your search. Price range: ${priceRange}.`;
          }
        } else {
          summary = `Found ${productCount} product${productCount > 1 ? 's' : ''} matching your search. Price range: ${priceRange}.`;
        }
      } else {
        summary = 'No products found matching your query. Try different keywords or broader filters.';
      }

      return {
        success: true,
        query: query,
        parsedFilters: parsedFilters,
        productsFound: products.length,
        products: products.slice(0, 20),
        summary: summary,
        usedLLM: !usedFallback,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("❌ Search intent error:", error.message);
      throw new Error(`Failed to generate search intent: ${error.message}`);
    }
  }
}

module.exports = new SearchIntentService();
