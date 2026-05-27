const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const featureFlags = require("../utils/featureFlags");
const llmMetrics = require("../utils/llmMetrics");
const CircuitBreaker = require("../utils/circuitBreaker");
const retryWithBackoff = require("../utils/retryWithBackoff");
const { getPrompt } = require("./prompt.service");
const { extractJsonObject } = require("../utils/json");

class DescriptionGeneratorService {
  constructor() {
    this.model = process.env.GOOGLE_API_KEY
      ? new ChatGoogleGenerativeAI({
          model: process.env.AI_MODEL || "gemini-2.5-flash",
          temperature: 0.7,
          apiKey: process.env.GOOGLE_API_KEY,
          maxOutputTokens: 2048,
        })
      : null;

    this.circuitBreaker = new CircuitBreaker({
      name: "Description-LLM",
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      callTimeoutMs: 15000,
    });
  }

  fallbackDescription({ title, category, basicDescription }) {
    return {
      fullDescription: `${title} is listed in ${category || "General"} category. ${basicDescription || "Add more product details to generate a richer AI description."}`,
      bulletPoints: [
        `${title} for marketplace buyers`,
        category ? `Suitable for ${category}` : "Category can be refined",
        "Seller can update details anytime",
      ],
      tags: [title, category || "general"].filter(Boolean).join(" ").toLowerCase().split(/\s+/).slice(0, 8),
      seoKeywords: [title, category || "online product"].filter(Boolean),
    };
  }

  async generateDescription(productData) {
    const { title, category, basicDescription, price } = productData;
    if (!title || typeof title !== "string" || title.trim().length < 2) {
      return {
        success: false,
        code: "AI_UNCLEAR_PRODUCT",
        message: "I could not generate description because product title is missing or too short. Please provide a clear product title.",
      };
    }

    if (!this.model || !featureFlags.isEnabled("LLM_DESCRIPTION_GENERATOR")) {
      return {
        success: true,
        usedLLM: false,
        message: "AI model is unavailable, so a basic marketplace description was generated.",
        productTitle: title,
        generatedContent: this.fallbackDescription(productData),
        timestamp: new Date(),
      };
    }

    const start = Date.now();
    try {
      const response = await this.circuitBreaker.execute(() => retryWithBackoff(
        () => this.model.invoke(getPrompt("description", {
          title,
          category: category || "General",
          basicDescription: basicDescription || "Not provided",
          price: price || "Not provided",
        })),
        { maxRetries: 1, baseDelayMs: 500, label: "Description" }
      ));

      llmMetrics.record({ endpoint: "description", success: true, latencyMs: Date.now() - start });
      const generatedContent = extractJsonObject(response.content, this.fallbackDescription(productData));

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
      llmMetrics.record({ endpoint: "description", success: false, latencyMs: Date.now() - start, error: error.message, usedFallback: true });
      return {
        success: true,
        usedLLM: false,
        message: "AI could not fully generate the listing right now, so a safe fallback description was created.",
        productTitle: title,
        generatedContent: this.fallbackDescription(productData),
        timestamp: new Date(),
      };
    }
  }
}

module.exports = new DescriptionGeneratorService();
