const axios = require("axios");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const CircuitBreaker = require("../utils/circuitBreaker");
const retryWithBackoff = require("../utils/retryWithBackoff");
const featureFlags = require("../utils/featureFlags");
const llmMetrics = require("../utils/llmMetrics");

class ProductComparisonService {
  constructor() {
    if (process.env.GOOGLE_API_KEY) {
      try {
        this.model = new ChatGoogleGenerativeAI({
          model: "gemini-2.5-flash",
          temperature: 0.4,
          apiKey: process.env.GOOGLE_API_KEY,
          maxOutputTokens: 2048,
        });
        console.log("✅ ProductComparisonService: Gemini model initialized");
      } catch (err) {
        this.model = null;
      }
    } else {
      this.model = null;
    }

    this.circuitBreaker = new CircuitBreaker({
      name: "Comparison-LLM",
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      callTimeoutMs: 15000,
    });
  }

  /**
   * Compare multiple products side-by-side
   * @param {string[]} productIds - Array of product IDs to compare
   * @param {string} token - Auth token
   * @returns {Object} Comparison result
   */
  async compareProducts(productIds, token) {
    const startTime = Date.now();
    try {
      console.log(`⚖️ Comparing ${productIds.length} products`);

      if (!productIds || productIds.length < 2) {
        throw new Error("At least 2 product IDs are required for comparison");
      }
      if (productIds.length > 5) {
        throw new Error("Maximum 5 products can be compared at once");
      }

      const baseUrl = process.env.PRODUCT_SERVICE_URL || "http://localhost:3000";

      // Step 1: Fetch all products
      const productPromises = productIds.map((id) =>
        axios
          .get(`${baseUrl}/api/product/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000,
          })
          .then((res) => res.data.data || res.data.product)
          .catch(() => null)
      );

      const products = (await Promise.all(productPromises)).filter(Boolean);

      if (products.length < 2) {
        return {
          success: false,
          message: "Could not fetch enough products for comparison. Check the product IDs.",
        };
      }

      // Step 2: Build comparison table
      const comparisonTable = products.map((p) => ({
        id: p._id,
        title: p.title,
        price: p.price?.amount || 0,
        currency: p.price?.currency || "INR",
        stock: p.stock || 0,
        inStock: (p.stock || 0) > 0,
        category: p.category || "N/A",
        brand: p.brand || "N/A",
        description: (p.description || "").substring(0, 200),
        images: p.images || [],
      }));

      // Step 3: Generate AI analysis
      let aiAnalysis = null;
      let usedLLM = false;

      if (this.model && featureFlags.isEnabled("LLM_ENABLED")) {
        try {
          aiAnalysis = await this.circuitBreaker.execute(async () => {
            return await retryWithBackoff(
              async () => {
                const productSummary = comparisonTable
                  .map(
                    (p, i) =>
                      `Product ${i + 1}: "${p.title}" - ₹${p.price} - Stock: ${p.stock} - Category: ${p.category} - Brand: ${p.brand} - Description: ${p.description}`
                  )
                  .join("\n");

                const prompt = `You are a product comparison expert. Compare these products and provide helpful insights for a buyer.

${productSummary}

Return ONLY valid JSON:
{
  "cheapest": "Product name that is cheapest",
  "bestValue": "Product name that offers best value for money",
  "highlights": ["3-5 key comparison points"],
  "recommendation": "1-2 sentence recommendation for the buyer",
  "verdict": "Which product to buy and why (1 sentence)"
}`;

                const result = await this.model.invoke(prompt);
                const text = result.content || "";
                const match = text.match(/\{[\s\S]*\}/);
                if (!match) throw new Error("No JSON in response");
                return JSON.parse(match[0]);
              },
              { maxRetries: 1, baseDelayMs: 500, label: "Comparison-LLM" }
            );
          });

          usedLLM = true;
          llmMetrics.record({ endpoint: "compare-products", success: true, latencyMs: Date.now() - startTime });
        } catch (err) {
          llmMetrics.record({ endpoint: "compare-products", success: false, latencyMs: Date.now() - startTime, error: err.message, usedFallback: true });
        }
      }

      // Fallback analysis
      if (!aiAnalysis) {
        const sorted = [...comparisonTable].sort((a, b) => a.price - b.price);
        const cheapest = sorted[0];
        const mostExpensive = sorted[sorted.length - 1];
        const priceDiff = mostExpensive.price - cheapest.price;
        const allInStock = comparisonTable.every((p) => p.inStock);

        aiAnalysis = {
          cheapest: cheapest.title,
          bestValue: cheapest.title,
          highlights: [
            `Price range: ₹${cheapest.price} — ₹${mostExpensive.price} (difference: ₹${priceDiff})`,
            `${cheapest.title} is the most affordable option`,
            allInStock ? "All products are currently in stock" : "Some products are out of stock",
            comparisonTable.length > 2 ? `Comparing ${comparisonTable.length} products across categories` : `Head-to-head comparison between 2 products`,
          ],
          recommendation: `${cheapest.title} offers the lowest price at ₹${cheapest.price}. Consider your budget and feature needs.`,
          verdict: `Go with ${cheapest.title} for budget, or ${mostExpensive.title} for premium features.`,
        };
      }

      return {
        success: true,
        productsCompared: comparisonTable.length,
        comparisonTable,
        analysis: aiAnalysis,
        usedLLM,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("❌ Product comparison error:", error.message);
      throw new Error(`Failed to compare products: ${error.message}`);
    }
  }
}

module.exports = new ProductComparisonService();
