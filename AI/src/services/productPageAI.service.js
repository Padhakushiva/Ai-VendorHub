const axios = require("axios");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const CircuitBreaker = require("../utils/circuitBreaker");
const retryWithBackoff = require("../utils/retryWithBackoff");
const featureFlags = require("../utils/featureFlags");
const llmMetrics = require("../utils/llmMetrics");
const { getPrompt } = require("./prompt.service");
const { extractJsonObject } = require("../utils/json");
const reviewSummaryService = require("./reviewSummary.service");
const similarProductService = require("./similarProduct.service");

class ProductPageAIService {
  constructor() {
    this.model = process.env.GOOGLE_API_KEY
      ? new ChatGoogleGenerativeAI({
          model: process.env.AI_MODEL || "gemini-2.5-flash",
          temperature: 0.35,
          apiKey: process.env.GOOGLE_API_KEY,
          maxOutputTokens: 1200,
        })
      : null;

    this.circuitBreaker = new CircuitBreaker({
      name: "ProductPageAI-LLM",
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      callTimeoutMs: 12000,
    });
  }

  getProductName(product) {
    return product?.title || product?.name || "This product";
  }

  getProductData(response) {
    return response.data?.data || response.data?.product || response.data?.Product || null;
  }

  fallbackInsights(product, reviewSummary) {
    const name = this.getProductName(product);
    const price = product?.price?.amount ? `${product.price.currency || "INR"} ${product.price.amount}` : "price not available";
    const stock = Number(product?.stock || 0);

    return {
      shortSummary: `${name} is a marketplace product in ${product?.category || "its listed"} category. Current price is ${price}.`,
      bestFor: [
        product?.category ? `${product.category} buyers` : "Marketplace buyers",
        stock > 0 ? "Users looking for an in-stock product" : "Users who can wait for restock",
      ],
      keyHighlights: [
        `Price: ${price}`,
        `Stock: ${stock}`,
        product?.brand ? `Brand: ${product.brand}` : "Brand details not available",
        reviewSummary?.summary?.overallSentiment ? `Review sentiment: ${reviewSummary.summary.overallSentiment}` : "Review summary depends on available reviews",
      ],
      buyingAdvice: stock > 0
        ? "This product is currently available. Check similar products and reviews before final purchase."
        : "This product appears out of stock. Consider similar available products.",
      possibleConcerns: [
        ...(stock <= 0 ? ["Product is currently out of stock"] : []),
        ...(!product?.images?.length ? ["Product images are limited or unavailable"] : []),
        ...(reviewSummary?.reviewsCount === 0 ? ["No reviews available yet"] : []),
      ],
      quickQuestions: [
        "Is this product worth buying?",
        "Show me similar products",
        "Summarize customer reviews",
        "Compare this with another product",
      ],
    };
  }

  async fetchProduct(productId, token) {
    const baseUrl = process.env.PRODUCT_SERVICE_URL || "http://localhost:3000";
    const response = await axios.get(`${baseUrl}/api/product/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 6000,
    });
    return this.getProductData(response);
  }

  async trackView(productId, token) {
    const baseUrl = process.env.PRODUCT_SERVICE_URL || "http://localhost:3000";
    try {
      await axios.post(`${baseUrl}/api/product/${productId}/view`, {}, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 3000,
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  async generateInsights(product, reviewSummary) {
    if (!this.model || !featureFlags.isEnabled("LLM_ENABLED")) {
      return { usedLLM: false, insights: this.fallbackInsights(product, reviewSummary) };
    }

    const start = Date.now();
    try {
      const response = await this.circuitBreaker.execute(() => retryWithBackoff(
        () => this.model.invoke(getPrompt("productPageInsights", {
          product: {
            title: product.title,
            description: product.description,
            category: product.category,
            brand: product.brand,
            tags: product.tags,
            price: product.price,
            stock: product.stock,
            rating: product.rating,
            metrics: product.metrics,
          },
          reviewSummary,
        })),
        { maxRetries: 1, baseDelayMs: 500, label: "ProductPageAI" }
      ));

      llmMetrics.record({ endpoint: "product-page-ai", success: true, latencyMs: Date.now() - start });
      return {
        usedLLM: true,
        insights: extractJsonObject(response.content, this.fallbackInsights(product, reviewSummary)),
      };
    } catch (error) {
      llmMetrics.record({
        endpoint: "product-page-ai",
        success: false,
        latencyMs: Date.now() - start,
        error: error.message,
        usedFallback: true,
      });
      return { usedLLM: false, insights: this.fallbackInsights(product, reviewSummary) };
    }
  }

  async getProductAI(productId, token) {
    const product = await this.fetchProduct(productId, token);
    if (!product) {
      return {
        success: false,
        code: "PRODUCT_NOT_FOUND",
        message: "Product not found, so AI product insight panel cannot be generated.",
      };
    }

    const [viewTracked, reviewSummary, similarProducts] = await Promise.all([
      this.trackView(productId, token),
      reviewSummaryService.summarizeReviews(productId, token).catch((error) => ({
        success: false,
        message: error.message,
        summary: null,
      })),
      similarProductService.getSimilarProducts(productId, token).catch((error) => ({
        success: false,
        message: error.message,
        similarProducts: [],
      })),
    ]);

    const generated = await this.generateInsights(product, reviewSummary);

    return {
      success: true,
      productId,
      panelTitle: "AI insights for this product",
      product: {
        _id: product._id,
        title: product.title,
        price: product.price,
        stock: product.stock,
        category: product.category,
        brand: product.brand,
        images: product.images,
      },
      aiInsights: generated.insights,
      reviewSummary: reviewSummary.success ? reviewSummary : {
        success: false,
        message: reviewSummary.message || "Review summary is not available for this product yet.",
      },
      recommendations: {
        similarProducts: similarProducts.similarProducts || [],
        totalFound: similarProducts.totalFound || 0,
        searchKeywords: similarProducts.searchKeywords || [],
      },
      aiActions: [
        {
          label: "Summarize reviews",
          endpoint: `/ai/review-summary/${productId}`,
          method: "POST",
        },
        {
          label: "Show similar products",
          endpoint: `/ai/similar/${productId}`,
          method: "GET",
        },
        {
          label: "Ask AI about this product",
          endpoint: "/ai/chat",
          method: "POST",
          bodyExample: {
            message: `Is ${this.getProductName(product)} worth buying?`,
          },
        },
        {
          label: "Compare with products",
          endpoint: "/ai/compare",
          method: "POST",
          bodyExample: {
            productIds: [productId, "anotherProductId"],
          },
        },
      ],
      viewTracked,
      usedLLM: generated.usedLLM,
      timestamp: new Date(),
    };
  }
}

module.exports = new ProductPageAIService();
