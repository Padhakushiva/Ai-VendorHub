const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const axios = require("axios");
const featureFlags = require("../utils/featureFlags");
const llmMetrics = require("../utils/llmMetrics");
const CircuitBreaker = require("../utils/circuitBreaker");
const retryWithBackoff = require("../utils/retryWithBackoff");
const { getPrompt } = require("./prompt.service");
const { extractJsonObject } = require("../utils/json");

class ReviewSummaryService {
  constructor() {
    this.model = process.env.GOOGLE_API_KEY
      ? new ChatGoogleGenerativeAI({
          model: process.env.AI_MODEL || "gemini-flash-latest",
          temperature: 0.25,
          apiKey: process.env.GOOGLE_API_KEY,
          maxOutputTokens: 1024,
        })
      : null;

    this.circuitBreaker = new CircuitBreaker({
      name: "ReviewSummary-LLM",
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      callTimeoutMs: 12000,
    });
  }

  getProductName(product) {
    return product.title || product.name || "Unknown Product";
  }

  localSummary(reviews) {
    const averageRating = this.calculateAverageRating(reviews);
    return {
      pros: averageRating >= 3.5 ? ["Customers generally rate this product positively"] : [],
      cons: averageRating < 3.5 ? ["Customer ratings suggest some concerns"] : [],
      overallSentiment: averageRating >= 4 ? "positive" : averageRating >= 3 ? "neutral" : "negative",
      summary: `Based on ${reviews.length} review(s), the average rating is ${averageRating}/5.`,
      recommendationScore: Math.round((averageRating / 5) * 100),
    };
  }

  async summarizeReviews(productId, token) {
    try {
      const baseUrl = process.env.PRODUCT_SERVICE_URL || "http://localhost:3000";
      const productResponse = await axios.get(`${baseUrl}/api/product/${productId}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 6000,
      });

      const product = productResponse.data.product || productResponse.data.Product || productResponse.data.data || {};
      const reviews = product.reviews || [];

      if (reviews.length === 0) {
        return {
          success: true,
          productId,
          productName: this.getProductName(product),
          reviewsCount: 0,
          message: "No reviews found for this product, so AI summary is not available yet.",
          summary: null,
          timestamp: new Date(),
        };
      }

      if (!this.model || !featureFlags.isEnabled("LLM_REVIEW_SUMMARY")) {
        return {
          success: true,
          usedLLM: false,
          productId,
          productName: this.getProductName(product),
          reviewsCount: reviews.length,
          averageRating: this.calculateAverageRating(reviews),
          summary: this.localSummary(reviews),
          timestamp: new Date(),
        };
      }

      const reviewsText = reviews
        .slice(0, 50)
        .map((review, index) => `Review ${index + 1}: ${review.text || review.comment || review.review || ""} (Rating: ${review.rating || 0}/5)`)
        .join("\n");

      const start = Date.now();
      try {
        const response = await this.circuitBreaker.execute(() => retryWithBackoff(
          () => this.model.invoke(getPrompt("reviewSummary", {
            productName: this.getProductName(product),
            reviewCount: reviews.length,
            averageRating: this.calculateAverageRating(reviews),
            reviews: reviewsText,
          })),
          { maxRetries: 1, baseDelayMs: 500, label: "ReviewSummary" }
        ));

        llmMetrics.record({ endpoint: "review-summary", success: true, latencyMs: Date.now() - start });
        const summary = extractJsonObject(response.content, this.localSummary(reviews));

        return {
          success: true,
          usedLLM: true,
          productId,
          productName: this.getProductName(product),
          reviewsCount: reviews.length,
          averageRating: this.calculateAverageRating(reviews),
          summary: {
            pros: summary.pros || [],
            cons: summary.cons || [],
            overallSentiment: summary.overallSentiment || "neutral",
            summary: summary.summary || "",
            recommendationScore: summary.recommendationScore || 0,
          },
          timestamp: new Date(),
        };
      } catch (error) {
        llmMetrics.record({ endpoint: "review-summary", success: false, latencyMs: Date.now() - start, error: error.message, usedFallback: true });
        return {
          success: true,
          usedLLM: false,
          message: "AI could not summarize review text right now, so rating-based summary was used.",
          productId,
          productName: this.getProductName(product),
          reviewsCount: reviews.length,
          averageRating: this.calculateAverageRating(reviews),
          summary: this.localSummary(reviews),
          timestamp: new Date(),
        };
      }
    } catch (error) {
      return {
        success: false,
        code: "PRODUCT_SERVICE_UNAVAILABLE",
        message: "I could not fetch this product's reviews from Product Service. Please verify product ID and Product Service availability.",
        productId,
        timestamp: new Date(),
      };
    }
  }

  calculateAverageRating(reviews) {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + (Number(review.rating) || 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }
}

module.exports = new ReviewSummaryService();
