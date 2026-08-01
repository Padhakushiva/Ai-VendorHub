const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { HumanMessage, SystemMessage, AIMessage } = require("@langchain/core/messages");
const CircuitBreaker = require("../utils/circuitBreaker");
const retryWithBackoff = require("../utils/retryWithBackoff");
const featureFlags = require("../utils/featureFlags");
const llmMetrics = require("../utils/llmMetrics");
const { parseQuery } = require("../utils/queryParser");
const { classifyMarketplaceRequest, buildScopeMessage } = require("../utils/domainGuard");
const { getPrompt } = require("./prompt.service");
const { extractJsonObject } = require("../utils/json");
const aiMemoryService = require("./aiMemory.service");
const productIntelligenceService = require("./productIntelligence.service");
const chatActionService = require("./chatAction.service");
const { isConnected } = require("../DB/db");

class ConversationalShoppingService {
  constructor() {
    if (process.env.GOOGLE_API_KEY) {
      try {
        this.model = new ChatGoogleGenerativeAI({
          model: "gemini-flash-latest",
          temperature: 0.6,
          apiKey: process.env.GOOGLE_API_KEY,
          maxOutputTokens: 2048,
        });
        console.log("✅ ConversationalShoppingService: Gemini model initialized");
      } catch (err) {
        this.model = null;
      }
    } else {
      this.model = null;
    }

    this.circuitBreaker = new CircuitBreaker({
      name: "Conversational-LLM",
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      callTimeoutMs: 15000,
    });

  }

  /**
   * Conversational shopping assistant
   * @param {string} message - User's natural language message
   * @param {string} [sessionId] - Optional session ID for context
   * @param {string} token - Auth token
   * @returns {Object} AI response with product recommendations
   */
  async chat(message, sessionId, token) {
    const startTime = Date.now();
    try {
      console.log(`💬 Conversational Shopping: "${message}"`);
      const userId = token ? "authenticated" : "anonymous";

      const classification = await classifyMarketplaceRequest(message);
      if (!classification.allowed) {
        return {
          success: false,
          code: classification.intent === "unclear" ? "AI_UNCLEAR_REQUEST" : "AI_SCOPE_LIMITED",
          message,
          intent: classification,
          reply: buildScopeMessage(classification),
          products: [],
          totalFound: 0,
          usedLLM: Boolean(this.model),
        };
      }

      const currentSessionId = sessionId || 'default_session';
      const decodedUserId = this._extractUserIdFromToken(token) || userId;
      const [conversation, userMemory] = await Promise.all([
        aiMemoryService.getConversation(decodedUserId, currentSessionId),
        aiMemoryService.getUserMemory(decodedUserId),
      ]);
      let history = await aiMemoryService.getLangChainHistory(decodedUserId, currentSessionId);

      // Format history for intent extraction
      const historyText = history.map(m => {
        if (m instanceof HumanMessage) return `User: ${m.content}`;
        if (m instanceof AIMessage) return `Assistant: ${m.content}`;
        return '';
      }).join('\n');

      // Step 1: Parse intent from message
      let intent = null;
      let usedLLM = false;

      if (this.model && featureFlags.isEnabled("LLM_ENABLED")) {
        try {
          intent = await this.circuitBreaker.execute(async () => {
            return await retryWithBackoff(
              async () => {
                const res = await this.model.invoke(getPrompt("conversationalIntent", { historyText, message }));
                const parsed = extractJsonObject(res.content, null);
                if (!parsed) throw new Error("No JSON");
                return parsed;
              },
              { maxRetries: 1, baseDelayMs: 500, label: "Conversational-Intent" }
            );
          });

          usedLLM = true;
          llmMetrics.record({ endpoint: "conversational-intent", success: true, latencyMs: Date.now() - startTime });
        } catch (err) {
          console.warn("⚠️ Conversational intent extraction failed:", err.message);
          llmMetrics.record({ endpoint: "conversational-intent", success: false, latencyMs: Date.now() - startTime, error: err.message, usedFallback: true });
        }
      }

      // Fallback: local query parser
      if (!intent) {
        const parsed = parseQuery(message);
        const lowerMessage = message.toLowerCase();
        const isRecommendationRequest = /\b(suggest|recommend|best|top|value|worth|pick)\b/.test(lowerMessage);
        const detectedAction = chatActionService.detect(message);
        intent = {
          type: isRecommendationRequest ? "recommend" : (parsed.keywords.length > 0 ? "search" : "info"),
          action: detectedAction || "none",
          keywords: parsed.keywords,
          maxBudget: parsed.priceRange?.max || null,
          minBudget: parsed.priceRange?.min || null,
          category: parsed.category || null,
          sortBy: parsed.sortBy || "relevance"
        };
      }
      if (!intent.action || intent.action === "none") {
        intent.action = chatActionService.detect(message) || "none";
      }
      if (intent.action !== "none") {
        intent.type = "action";
      }

      // Step 2: Fetch, semantically rank, and personalize products based on intent
      let formattedProducts = [];
      let personalization = { hasSignals: false };

      if (intent.type !== "off_topic") {
        try {
          const ranked = await productIntelligenceService.rankProducts({
            query: message,
            intent,
            token,
            memory: userMemory,
          });
          personalization = ranked.personalization;
          formattedProducts = ranked.products.slice(0, 10).map((p) => ({
          _id: p._id,
          title: p.title,
          price: p.price,
          stock: p.stock,
          category: p.category,
          brand: p.brand,
          description: (p.description || "").substring(0, 120),
          images: p.images,
          inStock: (p.stock || 0) > 0,
          aiScore: p.aiScore,
          aiReasons: p.aiReasons,
          aiScoreBreakdown: p.aiScoreBreakdown,
        }));
        } catch (err) {
          console.error("❌ Product intelligence error:", err.message);
          formattedProducts = [];
        }
      }

      // Step 3: Execute product actions when requested
      let actionResult = null;
      if (intent.action && intent.action !== "none") {
        actionResult = await chatActionService.execute({
          type: intent.action,
          message,
          products: formattedProducts,
          conversation,
          token,
        });
      }

      // Step 4: Generate conversational AI response
      let finalReply = "I couldn't process your request right now. Try again! 😊";

      if (this.model && featureFlags.isEnabled("LLM_ENABLED")) {
        try {
          const systemPrompt = getPrompt("conversationalReply", {
            intent,
            memorySummary: userMemory.summary || "No stored preferences yet",
            actionResult,
            products: formattedProducts.map(p => ({
              title: p.title,
              price: p.price?.amount,
              currency: p.price?.currency,
              description: p.description,
              inStock: p.inStock,
              aiScore: p.aiScore,
              reasons: p.aiReasons,
            })),
          });

          const messages = [
            new SystemMessage(systemPrompt),
            ...history,
            new HumanMessage(message)
          ];

          const response = await this.circuitBreaker.execute(async () => {
            return await retryWithBackoff(
              async () => await this.model.invoke(messages),
              { maxRetries: 1, baseDelayMs: 500, label: "Conversational-Reply" }
            );
          });
          finalReply = response.content;
          usedLLM = true;

        } catch (err) {
          console.error("❌ Conversational response generation error:", err.message);
          // Fallback to basic string if LLM fails
          finalReply = this._getFallbackReply(intent, formattedProducts, message, actionResult);
        }
      } else {
        finalReply = this._getFallbackReply(intent, formattedProducts, message, actionResult);
      }

      await aiMemoryService.saveTurn({
        userId: decodedUserId,
        sessionId: currentSessionId,
        userMessage: message,
        assistantReply: finalReply,
        intent,
        products: formattedProducts,
        actions: actionResult ? [{ ...actionResult, at: new Date() }] : [],
      });
      const nextMemory = await aiMemoryService.learnFromTurn({
        userId: decodedUserId,
        message,
        intent,
        products: formattedProducts,
        actionResults: actionResult ? [actionResult] : [],
      });

      return {
        success: true,
        sessionId: currentSessionId,
        userId: decodedUserId,
        message,
        intent,
        reply: finalReply,
        action: actionResult,
        products: formattedProducts,
        totalFound: formattedProducts.length,
        personalization,
        memory: {
          persisted: isConnected(),
          summary: nextMemory.summary,
          topCategories: (nextMemory.preferredCategories || []).slice(0, 5),
          topTerms: (nextMemory.preferredTerms || []).slice(0, 8),
          budget: nextMemory.budget,
        },
        usedLLM,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("❌ Conversational shopping error:", error.message);
      throw new Error(`Failed to process message: ${error.message}`);
    }
  }

  _extractUserIdFromToken(token) {
    try {
      if (!token) return null;
      const jwt = require("jsonwebtoken");
      const decoded = jwt.decode(token);
      return decoded?.id || decoded?._id || decoded?.userId || decoded?.sub || null;
    } catch (_) {
      return null;
    }
  }

  _getFallbackReply(intent, formattedProducts, message, actionResult = null) {
    if (actionResult) {
      return actionResult.success
        ? actionResult.message
        : `I found the product, but could not complete that action: ${actionResult.message}`;
    }

    if (intent.type === "off_topic") {
      return "I'm your shopping assistant! I can help you find products, recommend items, or optimize your budget. What would you like to shop for today? 🛍️";
    }
    
    if (formattedProducts.length > 0) {
      const sortedProducts = [...formattedProducts]
        .filter((product) => product.inStock)
        .sort((a, b) => {
          if (intent.sortBy === "price_desc") return (b.price?.amount || 0) - (a.price?.amount || 0);
          if (intent.sortBy === "price_asc") return (a.price?.amount || 0) - (b.price?.amount || 0);
          return (b.price?.amount || 0) - (a.price?.amount || 0);
        })
        .slice(0, 5);

      const productsToShow = sortedProducts.length ? sortedProducts : formattedProducts.slice(0, 5);
      const budgetText = intent.maxBudget ? ` under ₹${intent.maxBudget}` : "";
      const lines = productsToShow.map((product, index) => {
        const price = product.price?.amount || 0;
        const category = product.category || "General";
        const stock = product.stock || 0;
        const reason = (product.aiReasons || [])[0] || this._recommendationReason(product, index);
        return `${index + 1}. ${product.title} - ₹${price.toLocaleString("en-IN")}\n   ${reason} Category: ${category}. Stock: ${stock}.`;
      });
      const topPick = productsToShow[0];
      const topPickLine = topPick
        ? `\n\nMy top pick is ${topPick.title} because ${(topPick.aiReasons || [])[0] || `it gives the strongest overall option${budgetText}`}.`
        : "";

      return `Here are the best products${budgetText}:\n\n${lines.join("\n\n")}${topPickLine}`;
    }
    
    return `I couldn't find products for "${message}". Try different keywords or adjust your budget. I'm here to help! 😊`;
  }

  _recommendationReason(product, index) {
    const title = `${product.title || ""} ${product.category || ""}`.toLowerCase();
    if (title.includes("purifier")) return "Best for improving home air quality and daily comfort.";
    if (title.includes("ssd") || title.includes("storage")) return "Best for fast storage, backups, and heavy file use.";
    if (title.includes("keyboard")) return "Best for coding, gaming, and productivity setups.";
    if (title.includes("assistant") || title.includes("smart home")) return "Best for smart-home control on a budget.";
    if (title.includes("lamp")) return "Best as an affordable desk accessory with practical lighting.";
    return index === 0
      ? "Best premium pick from the current catalog."
      : "Good option based on price, stock, and category fit.";
  }
}

module.exports = new ConversationalShoppingService();
