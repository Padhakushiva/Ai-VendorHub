const axios = require("axios");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const CircuitBreaker = require("../utils/circuitBreaker");
const retryWithBackoff = require("../utils/retryWithBackoff");
const featureFlags = require("../utils/featureFlags");
const llmMetrics = require("../utils/llmMetrics");

class SimilarProductService {
  constructor() {
    if (process.env.GOOGLE_API_KEY) {
      try {
        this.model = new ChatGoogleGenerativeAI({
          model: "gemini-2.5-flash",
          temperature: 0.5,
          apiKey: process.env.GOOGLE_API_KEY,
          maxOutputTokens: 1024,
        });
        console.log("✅ SimilarProductService: Gemini model initialized");
      } catch (err) {
        this.model = null;
      }
    } else {
      this.model = null;
    }

    this.circuitBreaker = new CircuitBreaker({
      name: "SimilarProduct-LLM",
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      callTimeoutMs: 12000,
    });
  }

  /**
   * Find similar products for a given product
   * @param {string} productId - Source product ID
   * @param {string} token - Auth token
   * @returns {Object} Similar products list
   */
  async getSimilarProducts(productId, token) {
    const startTime = Date.now();
    try {
      console.log(`🔄 Finding similar products for: ${productId}`);

      const baseUrl = process.env.PRODUCT_SERVICE_URL || "http://localhost:3000";

      // Step 1: Fetch the source product
      const productRes = await axios
        .get(`${baseUrl}/api/product/${productId}`, {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000,
        })
        .catch(() => ({ data: { data: null } }));

      const product = productRes.data.data || productRes.data.product;
      if (!product) {
        return { success: false, message: "Product not found" };
      }

      // Step 2: Extract keywords for similarity search
      let searchKeywords = [];

      // Try LLM to extract better similarity keywords
      if (this.model && featureFlags.isEnabled("LLM_ENABLED")) {
        try {
          const kws = await this.circuitBreaker.execute(async () => {
            return await retryWithBackoff(
              async () => {
                const prompt = `Extract 3-5 search keywords to find similar products to this one. Return ONLY a JSON array of strings.

Product: ${product.title}
Category: ${product.category || "N/A"}
Description: ${(product.description || "").substring(0, 200)}

Example output: ["gaming mouse", "wireless mouse", "rgb mouse"]`;
                const result = await this.model.invoke(prompt);
                const text = result.content || "";
                const match = text.match(/\[[\s\S]*?\]/);
                if (!match) throw new Error("No JSON array");
                return JSON.parse(match[0]);
              },
              { maxRetries: 1, baseDelayMs: 500, label: "SimilarProduct-KW" }
            );
          });
          searchKeywords = kws;
          llmMetrics.record({ endpoint: "similar-products", success: true, latencyMs: Date.now() - startTime });
        } catch (err) {
          llmMetrics.record({ endpoint: "similar-products", success: false, latencyMs: Date.now() - startTime, error: err.message, usedFallback: true });
        }
      }

      // Fallback: extract keywords from title
      if (searchKeywords.length === 0) {
        const stopWords = new Set(["the", "a", "an", "and", "or", "for", "with", "in", "on", "of", "to", "is", "by"]);
        searchKeywords = product.title
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 2 && !stopWords.has(w))
          .slice(0, 3);
      }

      // Step 3: Search for similar products using each keyword
      const allProducts = [];
      const seenIds = new Set([productId]);

      for (const keyword of searchKeywords.slice(0, 3)) {
        try {
          const res = await axios.get(`${baseUrl}/api/product`, {
            params: { q: keyword, limit: 5 },
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000,
          });
          const products = res.data.data || res.data.products || [];
          for (const p of products) {
            const pid = p._id?.toString();
            if (pid && !seenIds.has(pid)) {
              seenIds.add(pid);
              allProducts.push(p);
            }
          }
        } catch {}
      }

      // Also search by category if available
      if (product.category) {
        try {
          const res = await axios.get(`${baseUrl}/api/product`, {
            params: { category: product.category, limit: 5 },
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000,
          });
          const products = res.data.data || [];
          for (const p of products) {
            const pid = p._id?.toString();
            if (pid && !seenIds.has(pid)) {
              seenIds.add(pid);
              allProducts.push(p);
            }
          }
        } catch {}
      }

      // Step 4: Rank by price similarity
      const sourcePrice = product.price?.amount || 0;
      const ranked = allProducts
        .map((p) => ({
          ...p._doc || p,
          priceDiff: Math.abs((p.price?.amount || 0) - sourcePrice),
        }))
        .sort((a, b) => a.priceDiff - b.priceDiff)
        .slice(0, 10);

      return {
        success: true,
        sourceProduct: {
          id: productId,
          title: product.title,
          price: product.price,
          category: product.category,
        },
        similarProducts: ranked.map((p) => ({
          _id: p._id,
          title: p.title,
          price: p.price,
          stock: p.stock,
          category: p.category,
          description: (p.description || "").substring(0, 120),
          images: p.images,
        })),
        totalFound: ranked.length,
        searchKeywords,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("❌ Similar product error:", error.message);
      throw new Error(`Failed to find similar products: ${error.message}`);
    }
  }
}

module.exports = new SimilarProductService();
