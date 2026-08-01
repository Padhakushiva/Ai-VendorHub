const featureFlags = require("../utils/featureFlags");
const llmMetrics = require("../utils/llmMetrics");
const { getPrompt } = require("./prompt.service");
const { extractJsonObject } = require("../utils/json");
const { requestGemini } = require("./geminiRest.service");

const MODEL_UNAVAILABLE_MESSAGE = "AI model unavailable";

class DescriptionGeneratorService {
  async generateDescription(productData) {
    const { title, category, basicDescription, price } = productData;
    if (!title || typeof title !== "string" || title.trim().length < 2) {
      return {
        success: false,
        code: "AI_UNCLEAR_PRODUCT",
        message: "I could not generate description because product title is missing or too short. Please provide a clear product title.",
      };
    }

    if (!process.env.GOOGLE_API_KEY || !featureFlags.isEnabled("LLM_DESCRIPTION_GENERATOR")) {
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
        getPrompt("description", {
          title,
          category: category || "General",
          basicDescription: basicDescription || "Not provided",
          price: price || "Not provided",
        }),
        { temperature: 0.7, maxOutputTokens: 2048, timeoutMs: 20000 }
      );

      llmMetrics.record({ endpoint: "description", success: true, latencyMs: Date.now() - start });
      const generatedContent = extractJsonObject(content, {});

      return {
        success: true,
        usedLLM: true,
        productTitle: title,
        generatedContent: {
          fullDescription: generatedContent.fullDescription || "",
          bulletPoints: generatedContent.bulletPoints || [],
          tags: generatedContent.tags || [],
          seoKeywords: generatedContent.seoKeywords || [],
        },
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Gemini Error in generateDescription:', error);
      llmMetrics.record({ endpoint: "description", success: false, latencyMs: Date.now() - start, error: `${error.code || "AI_MODEL_ERROR"}: ${error.message}` });
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

module.exports = new DescriptionGeneratorService();
