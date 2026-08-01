const axios = require("axios");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const CircuitBreaker = require("../utils/circuitBreaker");
const retryWithBackoff = require("../utils/retryWithBackoff");
const featureFlags = require("../utils/featureFlags");
const llmMetrics = require("../utils/llmMetrics");
const { getPrompt } = require("./prompt.service");
const { extractJsonArray } = require("../utils/json");

class SmartBudgetService {
  constructor() {
    if (process.env.GOOGLE_API_KEY) {
      try {
        this.model = new ChatGoogleGenerativeAI({
          model: "gemini-flash-latest",
          temperature: 0.6,
          apiKey: process.env.GOOGLE_API_KEY,
          maxOutputTokens: 2048,
        });
        console.log("✅ SmartBudgetService: Gemini model initialized");
      } catch (err) {
        this.model = null;
      }
    } else {
      this.model = null;
    }

    this.circuitBreaker = new CircuitBreaker({
      name: "Budget-LLM",
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      callTimeoutMs: 15000,
    });
  }

  /**
   * Smart budget shopping — combine multiple products within a budget
   * @param {number} budget - Total budget amount
   * @param {string} purpose - What the user wants (e.g., "gaming setup", "study desk")
   * @param {string} token - Auth token
   * @returns {Object} Optimized product bundle
   */
  async optimizeBudget(budget, purpose, token) {
    const startTime = Date.now();
    try {
      console.log(`💰 Smart Budget Shopping: ₹${budget} for "${purpose}"`);

      if (!budget || budget <= 0) {
        throw new Error("A valid budget amount is required");
      }

      const baseUrl = process.env.PRODUCT_SERVICE_URL || "http://localhost:3000";

      // Step 1: Extract search categories from purpose
      let searchTerms = [];

      if (this.model && featureFlags.isEnabled("LLM_ENABLED")) {
        try {
          const terms = await this.circuitBreaker.execute(async () => {
            return await retryWithBackoff(
              async () => {
                const result = await this.model.invoke(getPrompt("smartBudgetTerms", { budget, purpose }));
                const parsed = extractJsonArray(result.content, []);
                if (!parsed.length) throw new Error("No JSON array");
                return parsed;
              },
              { maxRetries: 1, baseDelayMs: 500, label: "Budget-Terms" }
            );
          });
          searchTerms = terms;
          llmMetrics.record({ endpoint: "smart-budget", success: true, latencyMs: Date.now() - startTime });
        } catch (err) {
          llmMetrics.record({ endpoint: "smart-budget", success: false, latencyMs: Date.now() - startTime, error: err.message, usedFallback: true });
        }
      }

      // Fallback: extract keywords from purpose
      if (searchTerms.length === 0) {
        const purposeMap = {
          gaming: ["gaming mouse", "gaming keyboard", "gaming headphones", "mouse pad"],
          study: ["desk lamp", "notebook", "pen", "organizer"],
          coding: ["keyboard", "mouse", "headphones", "monitor stand"],
          office: ["keyboard", "mouse", "webcam", "headphones"],
          desk: ["keyboard", "mouse", "desk lamp", "organizer"],
          fitness: ["yoga mat", "water bottle", "resistance band", "shoes"],
          travel: ["bag", "earphones", "power bank", "neck pillow"],
          kitchen: ["mixer", "pan", "knife set", "container"],
          photography: ["camera", "tripod", "memory card", "camera bag"],
        };

        const purposeLower = purpose.toLowerCase();
        for (const [key, terms] of Object.entries(purposeMap)) {
          if (purposeLower.includes(key)) {
            searchTerms = terms;
            break;
          }
        }

        // Generic fallback
        if (searchTerms.length === 0) {
          searchTerms = purposeLower
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length > 2)
            .slice(0, 4);
          if (searchTerms.length === 0) searchTerms = ["accessories"];
        }
      }

      // Step 2: Search for products in each category
      const categoryProducts = {};
      for (const term of searchTerms) {
        try {
          const maxPerItem = Math.floor(budget / 2); // No single item takes more than 50% of budget
          const res = await axios.get(`${baseUrl}/api/product`, {
            params: { q: term, maxprice: maxPerItem, limit: 5 },
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000,
          });
          const products = (res.data.data || []).filter((p) => p.stock > 0 && (p.price?.amount || 0) > 0);
          if (products.length > 0) {
            categoryProducts[term] = products;
          }
        } catch {}
      }

      // Step 3: Optimize — pick the cheapest from each category that fits budget
      const bundle = [];
      let remainingBudget = budget;
      const usedCategories = new Set();

      // Sort categories by cheapest available product
      const sortedCategories = Object.entries(categoryProducts)
        .map(([cat, prods]) => ({
          category: cat,
          cheapest: prods.sort((a, b) => (a.price?.amount || 0) - (b.price?.amount || 0))[0],
          products: prods,
        }))
        .sort((a, b) => (a.cheapest.price?.amount || 0) - (b.cheapest.price?.amount || 0));

      // Greedy: pick cheapest from each category
      for (const cat of sortedCategories) {
        for (const product of cat.products) {
          const price = product.price?.amount || 0;
          if (price <= remainingBudget && !usedCategories.has(cat.category)) {
            bundle.push({
              _id: product._id,
              title: product.title,
              price: product.price,
              stock: product.stock,
              category: cat.category,
              description: (product.description || "").substring(0, 100),
              images: product.images,
            });
            remainingBudget -= price;
            usedCategories.add(cat.category);
            break;
          }
        }
      }

      // Step 4: If budget left, try adding more products
      if (remainingBudget > 0) {
        for (const cat of sortedCategories) {
          if (usedCategories.has(cat.category)) continue;
          for (const product of cat.products) {
            const price = product.price?.amount || 0;
            if (price <= remainingBudget) {
              bundle.push({
                _id: product._id,
                title: product.title,
                price: product.price,
                stock: product.stock,
                category: cat.category,
                description: (product.description || "").substring(0, 100),
                images: product.images,
              });
              remainingBudget -= price;
              usedCategories.add(cat.category);
              break;
            }
          }
        }
      }

      const totalSpent = budget - remainingBudget;

      return {
        success: true,
        budget,
        purpose,
        bundle,
        totalItems: bundle.length,
        totalSpent,
        remaining: remainingBudget,
        savingsPercent: bundle.length > 0 ? ((remainingBudget / budget) * 100).toFixed(1) + "%" : "0%",
        searchTerms,
        summary:
          bundle.length > 0
            ? `Found ${bundle.length} products for your "${purpose}" setup within ₹${budget}. Total: ₹${totalSpent}, Remaining: ₹${remainingBudget}.`
            : `No products found within budget ₹${budget} for "${purpose}". Try increasing your budget.`,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("❌ Smart budget error:", error.message);
      throw new Error(`Failed to optimize budget: ${error.message}`);
    }
  }
}

module.exports = new SmartBudgetService();
