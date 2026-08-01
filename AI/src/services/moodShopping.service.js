const axios = require("axios");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const CircuitBreaker = require("../utils/circuitBreaker");
const retryWithBackoff = require("../utils/retryWithBackoff");
const featureFlags = require("../utils/featureFlags");
const llmMetrics = require("../utils/llmMetrics");
const { getPrompt } = require("./prompt.service");
const { extractJsonObject } = require("../utils/json");

// Mood → keyword mapping for fallback
const MOOD_MAP = {
  // Aesthetic / Minimal
  minimal: ["minimalist", "simple", "clean", "white", "desk"],
  aesthetic: ["aesthetic", "pastel", "cute", "pink", "decor"],
  cozy: ["cozy", "warm", "blanket", "lamp", "cushion"],
  "dark mode": ["black", "dark", "rgb", "led"],
  // Setup based
  gaming: ["gaming", "rgb", "mechanical", "headset"],
  coding: ["keyboard", "mouse", "monitor", "laptop"],
  study: ["notebook", "pen", "lamp", "organizer", "stationery"],
  office: ["office", "desk", "chair", "organizer", "webcam"],
  // Lifestyle
  travel: ["travel", "bag", "portable", "earphones", "power bank"],
  fitness: ["fitness", "gym", "yoga", "protein", "water bottle"],
  kitchen: ["kitchen", "cooking", "pan", "blender", "utensil"],
  photography: ["camera", "tripod", "lens", "photo"],
  music: ["speaker", "headphones", "earbuds", "bluetooth"],
  reading: ["book", "kindle", "reading lamp", "bookmark"],
};

class MoodShoppingService {
  constructor() {
    if (process.env.GOOGLE_API_KEY) {
      try {
        this.model = new ChatGoogleGenerativeAI({
          model: "gemini-flash-latest",
          temperature: 0.7,
          apiKey: process.env.GOOGLE_API_KEY,
          maxOutputTokens: 1024,
        });
        console.log("✅ MoodShoppingService: Gemini model initialized");
      } catch (err) {
        this.model = null;
      }
    } else {
      this.model = null;
    }

    this.circuitBreaker = new CircuitBreaker({
      name: "Mood-LLM",
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      callTimeoutMs: 12000,
    });
  }

  /**
   * Mood/Intent based shopping — map user vibe to products
   * @param {string} mood - User's mood/intent (e.g. "minimal desk setup", "cozy room")
   * @param {number} [maxBudget] - Optional price cap
   * @param {string} token - Auth token
   * @returns {Object} Curated product list with mood analysis
   */
  async getMoodProducts(mood, maxBudget, token) {
    const startTime = Date.now();
    try {
      console.log(`🎨 Mood Shopping: "${mood}" budget: ₹${maxBudget || "any"}`);

      const baseUrl = process.env.PRODUCT_SERVICE_URL || "http://localhost:3000";
      let searchKeywords = [];
      let moodAnalysis = null;
      let usedLLM = false;

      // Try LLM to understand mood and extract product keywords
      if (this.model && featureFlags.isEnabled("LLM_ENABLED")) {
        try {
          const result = await this.circuitBreaker.execute(async () => {
            return await retryWithBackoff(
              async () => {
                const res = await this.model.invoke(getPrompt("moodKeywords", { mood, maxBudget: maxBudget || "any" }));
                const parsed = extractJsonObject(res.content, null);
                if (!parsed) throw new Error("No JSON");
                return parsed;
              },
              { maxRetries: 1, baseDelayMs: 500, label: "Mood-LLM" }
            );
          });

          searchKeywords = result.searchKeywords || [];
          moodAnalysis = {
            description: result.moodDescription,
            vibe: result.vibe,
          };
          usedLLM = true;
          llmMetrics.record({ endpoint: "mood-shopping", success: true, latencyMs: Date.now() - startTime });
        } catch (err) {
          llmMetrics.record({ endpoint: "mood-shopping", success: false, latencyMs: Date.now() - startTime, error: err.message, usedFallback: true });
        }
      }

      // Fallback: keyword map
      if (searchKeywords.length === 0) {
        const moodLower = mood.toLowerCase();
        for (const [key, keywords] of Object.entries(MOOD_MAP)) {
          if (moodLower.includes(key)) {
            searchKeywords = keywords.slice(0, 4);
            moodAnalysis = { description: `Products for a ${key} vibe`, vibe: key };
            break;
          }
        }

        // Generic fallback — use mood words as keywords
        if (searchKeywords.length === 0) {
          searchKeywords = moodLower
            .replace(/[^a-z0-9\s]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length > 2)
            .slice(0, 4);
          moodAnalysis = { description: `Products matching "${mood}" vibe`, vibe: "other" };
        }
      }

      // Search products for each keyword
      const allProducts = [];
      const seenIds = new Set();

      for (const keyword of searchKeywords.slice(0, 5)) {
        try {
          const params = { q: keyword, limit: 5 };
          if (maxBudget) params.maxprice = maxBudget;

          const res = await axios.get(`${baseUrl}/api/product`, {
            params,
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000,
          });

          const products = res.data.data || [];
          for (const p of products) {
            const pid = p._id?.toString();
            if (pid && !seenIds.has(pid) && p.stock > 0) {
              seenIds.add(pid);
              allProducts.push({ ...p, _matchedKeyword: keyword });
            }
          }
        } catch {}
      }

      // Sort by stock availability (in-stock first), then by price
      const sorted = allProducts.sort((a, b) => {
        if (b.stock !== a.stock) return b.stock - a.stock;
        return (a.price?.amount || 0) - (b.price?.amount || 0);
      });

      const formatted = sorted.slice(0, 15).map((p) => ({
        _id: p._id,
        title: p.title,
        price: p.price,
        stock: p.stock,
        category: p.category,
        description: (p.description || "").substring(0, 120),
        images: p.images,
        matchedVia: p._matchedKeyword,
      }));

      return {
        success: true,
        mood,
        moodAnalysis,
        searchKeywords,
        products: formatted,
        totalFound: formatted.length,
        usedLLM,
        message:
          formatted.length > 0
            ? `Found ${formatted.length} products for your "${mood}" vibe!`
            : `No products found for "${mood}". Try different mood keywords.`,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("❌ Mood shopping error:", error.message);
      throw new Error(`Failed to get mood products: ${error.message}`);
    }
  }
}

module.exports = new MoodShoppingService();
