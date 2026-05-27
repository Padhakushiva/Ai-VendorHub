const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const featureFlags = require("../utils/featureFlags");
const llmMetrics = require("../utils/llmMetrics");
const CircuitBreaker = require("../utils/circuitBreaker");
const retryWithBackoff = require("../utils/retryWithBackoff");
const { detectCategory, extractKeywords } = require("../utils/queryParser");
const { getPrompt } = require("./prompt.service");
const { extractJsonObject } = require("../utils/json");

class CategoryTagSuggestionService {
  constructor() {
    this.model = process.env.GOOGLE_API_KEY
      ? new ChatGoogleGenerativeAI({
          model: process.env.AI_MODEL || "gemini-2.5-flash",
          temperature: 0.4,
          apiKey: process.env.GOOGLE_API_KEY,
          maxOutputTokens: 1024,
        })
      : null;

    this.circuitBreaker = new CircuitBreaker({
      name: "CategoryTags-LLM",
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      callTimeoutMs: 12000,
    });
  }

  fallbackSuggestions({ title, description }) {
    const text = `${title || ""} ${description || ""}`.toLowerCase();
    const category = detectCategory(text) || "General";
    const tags = extractKeywords(text).slice(0, 10);
    return {
      category,
      subcategory: category === "General" ? "Other" : category,
      tags: tags.length ? tags : (title || "product").toLowerCase().split(/\s+/).slice(0, 8),
      confidence: category === "General" ? 45 : 70,
      reasoning: "Generated using local marketplace keyword analysis because AI output was unavailable.",
    };
  }

  async suggestCategoryAndTags(productData) {
    const { title, description } = productData;
    if (!title || typeof title !== "string" || title.trim().length < 2) {
      return {
        success: false,
        code: "AI_UNCLEAR_PRODUCT",
        message: "I could not suggest category/tags because product title is missing or too short.",
      };
    }

    if (!this.model || !featureFlags.isEnabled("LLM_CATEGORY_SUGGESTION")) {
      return {
        success: true,
        usedLLM: false,
        productTitle: title,
        suggestions: this.fallbackSuggestions(productData),
        timestamp: new Date(),
      };
    }

    const start = Date.now();
    try {
      const response = await this.circuitBreaker.execute(() => retryWithBackoff(
        () => this.model.invoke(getPrompt("categoryTags", {
          title,
          description: description || "Not provided",
        })),
        { maxRetries: 1, baseDelayMs: 500, label: "CategoryTags" }
      ));

      llmMetrics.record({ endpoint: "category-tags", success: true, latencyMs: Date.now() - start });
      const suggestions = extractJsonObject(response.content, this.fallbackSuggestions(productData));

      return {
        success: true,
        usedLLM: true,
        productTitle: title,
        suggestions: {
          category: suggestions.category || "General",
          subcategory: suggestions.subcategory || "Other",
          tags: suggestions.tags || [],
          confidence: suggestions.confidence || 0,
          reasoning: suggestions.reasoning || "",
        },
        timestamp: new Date(),
      };
    } catch (error) {
      llmMetrics.record({ endpoint: "category-tags", success: false, latencyMs: Date.now() - start, error: error.message, usedFallback: true });
      return {
        success: true,
        usedLLM: false,
        message: "AI could not fully understand the product metadata right now, so local marketplace analysis was used.",
        productTitle: title,
        suggestions: this.fallbackSuggestions(productData),
        timestamp: new Date(),
      };
    }
  }
}

module.exports = new CategoryTagSuggestionService();
