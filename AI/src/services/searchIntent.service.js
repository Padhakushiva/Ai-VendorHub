const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const axios = require("axios");
const CircuitBreaker = require("../utils/circuitBreaker");
const retryWithBackoff = require("../utils/retryWithBackoff");
const featureFlags = require("../utils/featureFlags");
const llmMetrics = require("../utils/llmMetrics");
const { parseQuery } = require("../utils/queryParser");
const { getPrompt } = require("./prompt.service");
const { extractJsonObject } = require("../utils/json");
const { classifyMarketplaceRequest, buildScopeMessage } = require("../utils/domainGuard");

class SearchIntentService {
  constructor() {
    this.model = process.env.GOOGLE_API_KEY
      ? new ChatGoogleGenerativeAI({
          model: process.env.AI_MODEL || "gemini-2.5-flash",
          temperature: 0.2,
          apiKey: process.env.GOOGLE_API_KEY,
          maxOutputTokens: 1024,
        })
      : null;

    this.circuitBreaker = new CircuitBreaker({
      name: "SearchIntent-LLM",
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      callTimeoutMs: 12000,
    });
  }

  normalizeFilters(filters, query) {
    const fallback = parseQuery(query);
    return {
      keywords: Array.isArray(filters?.keywords) && filters.keywords.length ? filters.keywords : fallback.keywords,
      priceRange: {
        min: filters?.priceRange?.min ?? fallback.priceRange?.min ?? null,
        max: filters?.priceRange?.max ?? fallback.priceRange?.max ?? null,
      },
      category: filters?.category || fallback.category || null,
      attributes: filters?.attributes || fallback.attributes || {},
      sortBy: filters?.sortBy || fallback.sortBy || "relevance",
      confidence: Number(filters?.confidence || 0),
      needsClarification: Boolean(filters?.needsClarification),
      clarifyingQuestion: filters?.clarifyingQuestion || "",
      originalQuery: query,
    };
  }

  async parseWithAI(query) {
    if (!this.model || !featureFlags.isEnabled("LLM_SEARCH_INTENT")) return null;
    const start = Date.now();

    try {
      const response = await this.circuitBreaker.execute(() => retryWithBackoff(
        () => this.model.invoke(getPrompt("searchIntent", { query })),
        { maxRetries: 1, baseDelayMs: 500, label: "SearchIntent" }
      ));
      llmMetrics.record({ endpoint: "search-intent", success: true, latencyMs: Date.now() - start });
      return extractJsonObject(response.content, null);
    } catch (error) {
      llmMetrics.record({
        endpoint: "search-intent",
        success: false,
        latencyMs: Date.now() - start,
        error: error.message,
        usedFallback: true,
      });
      return null;
    }
  }

  buildSearchParams(filters) {
    const params = new URLSearchParams();
    if (filters.keywords?.length) params.append("q", filters.keywords.join(" "));
    if (filters.category) params.append("category", filters.category);
    if (filters.priceRange?.min) params.append("minPrice", filters.priceRange.min);
    if (filters.priceRange?.max) params.append("maxPrice", filters.priceRange.max);
    if (filters.sortBy && filters.sortBy !== "relevance") params.append("sort", filters.sortBy);
    params.append("limit", "20");
    return params;
  }

  async fetchProducts(filters, token) {
    const baseUrl = process.env.PRODUCT_SERVICE_URL || "http://localhost:3000";
    const params = this.buildSearchParams(filters);
    const response = await axios.get(`${baseUrl}/api/product?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 6000,
    });
    return response.data.data || response.data.products || response.data.Product || [];
  }

  async buildSummary(query, filters, products) {
    if (!this.model || !featureFlags.isEnabled("LLM_SEARCH_INTENT")) {
      return products.length
        ? `Found ${products.length} matching product(s) for your marketplace search.`
        : "I could not find matching products. Try a broader keyword, different category, or updated budget.";
    }

    try {
      const response = await this.model.invoke(getPrompt("searchSummary", {
        query,
        filters,
        products: products.slice(0, 5),
      }));
      return response.content;
    } catch (_) {
      return products.length
        ? `Found ${products.length} matching product(s) for your marketplace search.`
        : "I could not find matching products. Try a broader keyword, different category, or updated budget.";
    }
  }

  async generateSearchIntent(query, token) {
    const classification = await classifyMarketplaceRequest(query);
    if (!classification.allowed) {
      return {
        success: false,
        code: classification.intent === "unclear" ? "AI_UNCLEAR_REQUEST" : "AI_SCOPE_LIMITED",
        message: buildScopeMessage(classification),
        query,
        productsFound: 0,
        products: [],
        timestamp: new Date(),
      };
    }

    const aiFilters = await this.parseWithAI(query);
    const parsedFilters = this.normalizeFilters(aiFilters, query);

    if (parsedFilters.needsClarification || (
      parsedFilters.keywords.length === 0
      && !parsedFilters.category
      && !parsedFilters.priceRange.min
      && !parsedFilters.priceRange.max
    )) {
      return {
        success: false,
        code: "AI_UNCLEAR_REQUEST",
        message: parsedFilters.clarifyingQuestion || "I could not clearly understand what product you want. Please mention product type, category, budget, or use-case.",
        query,
        parsedFilters,
        productsFound: 0,
        products: [],
        timestamp: new Date(),
      };
    }

    try {
      const products = await this.fetchProducts(parsedFilters, token);
      const summary = await this.buildSummary(query, parsedFilters, products);

      return {
        success: true,
        query,
        parsedFilters,
        productsFound: products.length,
        products: products.slice(0, 20),
        summary,
        usedLLM: Boolean(aiFilters),
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("Search product fetch error:", error.message);
      return {
        success: false,
        code: "PRODUCT_SERVICE_UNAVAILABLE",
        message: "I understood your shopping request, but Product Service is not reachable right now. Please try again after starting Product Service.",
        query,
        parsedFilters,
        productsFound: 0,
        products: [],
        timestamp: new Date(),
      };
    }
  }
}

module.exports = new SearchIntentService();
