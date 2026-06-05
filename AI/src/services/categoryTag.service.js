const featureFlags = require("../utils/featureFlags");
const llmMetrics = require("../utils/llmMetrics");
const { getPrompt } = require("./prompt.service");
const { extractJsonObject } = require("../utils/json");
const { requestGemini } = require("./geminiRest.service");

const MODEL_UNAVAILABLE_MESSAGE = "AI model unavailable";

class CategoryTagSuggestionService {
  async suggestCategoryAndTags(productData) {
    const { title, description } = productData;
    if (!title || typeof title !== "string" || title.trim().length < 2) {
      return {
        success: false,
        code: "AI_UNCLEAR_PRODUCT",
        message: "I could not suggest category/tags because product title is missing or too short.",
      };
    }

    if (!process.env.GOOGLE_API_KEY || !featureFlags.isEnabled("LLM_CATEGORY_SUGGESTION")) {
      return {
        success: false,
        code: "AI_MODEL_UNAVAILABLE",
        message: MODEL_UNAVAILABLE_MESSAGE,
        productTitle: title,
        timestamp: new Date(),
      };
    }

    const start = Date.now();
    try {
      const content = await requestGemini(
        getPrompt("categoryTags", {
          title,
          description: description || "Not provided",
        }),
        { temperature: 0.4, maxOutputTokens: 1024, timeoutMs: 20000 }
      );

      llmMetrics.record({ endpoint: "category-tags", success: true, latencyMs: Date.now() - start });
      const suggestions = extractJsonObject(content, {});

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
      llmMetrics.record({ endpoint: "category-tags", success: false, latencyMs: Date.now() - start, error: `${error.code || "AI_MODEL_ERROR"}: ${error.message}` });
      return {
        success: false,
        code: "AI_MODEL_UNAVAILABLE",
        message: MODEL_UNAVAILABLE_MESSAGE,
        productTitle: title,
        timestamp: new Date(),
      };
    }
  }
}

module.exports = new CategoryTagSuggestionService();
