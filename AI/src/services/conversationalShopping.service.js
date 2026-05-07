const axios = require("axios");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { HumanMessage, SystemMessage, AIMessage } = require("@langchain/core/messages");
const CircuitBreaker = require("../utils/circuitBreaker");
const retryWithBackoff = require("../utils/retryWithBackoff");
const featureFlags = require("../utils/featureFlags");
const llmMetrics = require("../utils/llmMetrics");
const { parseQuery } = require("../utils/queryParser");

class ConversationalShoppingService {
  constructor() {
    if (process.env.GOOGLE_API_KEY) {
      try {
        this.model = new ChatGoogleGenerativeAI({
          model: "gemini-2.5-flash",
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

    this.sessions = new Map();
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

      const baseUrl = process.env.PRODUCT_SERVICE_URL || "http://localhost:3000";

      // Initialize session history
      const currentSessionId = sessionId || 'default_session';
      let history = this.sessions.get(currentSessionId) || [];

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
                const prompt = `You are a shopping assistant. Analyze this user message and extract shopping intent. Consider the recent chat history for context if the user refers to previous products.

Recent History:
${historyText}

Current User Message: "${message}"

Return ONLY valid JSON:
{
  "type": "search | recommend | budget | compare | info | off_topic",
  "keywords": ["product search keywords"],
  "maxBudget": null or number,
  "minBudget": null or number,
  "category": null or "category name",
  "sortBy": "relevance | price_asc | price_desc | rating | newest"
}

Rules:
- type "search" = user wants to find specific products
- type "recommend" = user wants suggestions/recommendations
- type "budget" = user has a specific budget
- type "compare" = user wants to compare products
- type "off_topic" = NOT shopping related
- For off_topic, set keywords to []`;

                const res = await this.model.invoke(prompt);
                const text = res.content || "";
                const match = text.match(/\{[\s\S]*\}/);
                if (!match) throw new Error("No JSON");
                return JSON.parse(match[0]);
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
        intent = {
          type: parsed.keywords.length > 0 ? "search" : "info",
          keywords: parsed.keywords,
          maxBudget: parsed.priceRange?.max || null,
          minBudget: parsed.priceRange?.min || null,
          category: parsed.category || null,
          sortBy: parsed.sortBy || "relevance"
        };
      }

      // Step 2: Fetch products based on intent (unless off_topic)
      let products = [];
      let formattedProducts = [];

      if (intent.type !== "off_topic") {
        const params = { limit: 10 };
        if (intent.keywords && intent.keywords.length > 0) {
          params.q = intent.keywords.join(" ");
        }
        if (intent.maxBudget) params.maxprice = intent.maxBudget;
        if (intent.minBudget) params.minprice = intent.minBudget;
        if (intent.category) params.category = intent.category;

        let noMatchFoundLocally = false;

        try {
          let response = await axios.get(`${baseUrl}/api/product`, {
            params,
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000,
          });
          products = response.data.data || [];
          
          if (products.length === 0 && intent.category) {
            console.log(`⚠️ No products found with keyword. Retrying with category "${intent.category}" only...`);
            const fallbackParams = { limit: 10, category: intent.category };
            if (intent.maxBudget) fallbackParams.maxPrice = intent.maxBudget;
            if (intent.minBudget) fallbackParams.minPrice = intent.minBudget;
            
            response = await axios.get(`${baseUrl}/api/product`, {
              params: fallbackParams,
              headers: { Authorization: `Bearer ${token}` },
              timeout: 5000,
            });
            products = response.data.data || [];
          }
          
          let broadSearchUsed = false;
          // SMART FALLBACK: If everything failed, fetch broadly and let the LLM filter semantically
          if (products.length === 0) {
            broadSearchUsed = true;
            console.log(`⚠️ Still 0 products. Doing a broad search for local filtering...`);
            const broadParams = { limit: 20 };
            if (intent.maxBudget) broadParams.maxPrice = intent.maxBudget;
            if (intent.minBudget) broadParams.minPrice = intent.minBudget;
            
            const broadResponse = await axios.get(`${baseUrl}/api/product`, {
              params: broadParams,
              headers: { Authorization: `Bearer ${token}` },
              timeout: 5000,
            });
            products = broadResponse.data.data || [];
          }

          // In-memory smart filtering using synonyms
          if (products.length > 0 && intent.keywords && intent.keywords.length > 0) {
            const { expandSynonyms } = require("../utils/queryParser");
            const targetWords = intent.keywords.flatMap(k => expandSynonyms(k));
            
            const matchedProducts = products.filter(p => {
                const text = `${p.title} ${p.description} ${p.category} ${(p.tags||[]).join(' ')}`.toLowerCase();
                return targetWords.some(w => text.includes(w.toLowerCase()));
            });

            if (matchedProducts.length > 0) {
                products = matchedProducts; // We found actual matches
            } else {
                // No products match the requested keyword in our fallback searches
                console.log(`⚠️ Fallback search yielded products, but none matched keywords: [${targetWords.join(', ')}]`);
                noMatchFoundLocally = true;
            }
          }

        } catch (err) {
          console.error("❌ Product fetch error:", err.message);
        }

        // Pass this flag to formatting/fallback so we know it's a "did you mean" rather than a direct match
        this.noMatchFoundLocally = noMatchFoundLocally;

        // Filter: only in-stock products for recommendations
        if (intent.type === "recommend") {
          products = products.filter((p) => p.stock > 0);
        }

        // Sort based on intent
        if (intent.sortBy === "price_asc") {
          products.sort((a, b) => (a.price?.amount || 0) - (b.price?.amount || 0));
        } else if (intent.sortBy === "price_desc") {
          products.sort((a, b) => (b.price?.amount || 0) - (a.price?.amount || 0));
        }

        formattedProducts = products.slice(0, 10).map((p) => ({
          _id: p._id,
          title: p.title,
          price: p.price,
          stock: p.stock,
          category: p.category,
          description: (p.description || "").substring(0, 120),
          images: p.images,
          inStock: (p.stock || 0) > 0,
        }));
      }

      // Step 3: Generate conversational AI response
      let finalReply = "I couldn't process your request right now. Try again! 😊";

      if (this.model && featureFlags.isEnabled("LLM_ENABLED")) {
        try {
          let systemPrompt = `You are "Rufus", an expert conversational shopping assistant. 
Your goal is to guide the user, explain product features, offer personalized recommendations, and help them make purchasing decisions.

Always be conversational, friendly, and helpful. Do NOT sound robotic. Do NOT use markdown headers or bolding aggressively. Keep responses concise and natural.
If products are found, mention them naturally in your response, compare them if relevant, and answer any user questions based on the product context.
If no products are found, suggest alternative searches or ask clarifying questions.

`;
          if (formattedProducts.length > 0) {
            systemPrompt += `You have searched the store and found these products:\n${JSON.stringify(formattedProducts.map(p => ({ title: p.title, price: p.price?.amount, description: p.description, inStock: p.inStock })))}`;
          } else if (intent.type !== "off_topic") {
            systemPrompt += `You searched the store but found 0 products matching the user's intent.`;
          }

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

          // Save to history
          history.push(new HumanMessage(message));
          history.push(new AIMessage(finalReply));
          
          // Keep only last 10 messages to avoid context overflow
          if (history.length > 10) history = history.slice(history.length - 10);
          this.sessions.set(currentSessionId, history);

        } catch (err) {
          console.error("❌ Conversational response generation error:", err.message);
          // Fallback to basic string if LLM fails
          finalReply = this._getFallbackReply(intent, formattedProducts, message);
        }
      } else {
        finalReply = this._getFallbackReply(intent, formattedProducts, message);
      }

      return {
        success: true,
        sessionId: currentSessionId,
        message,
        intent,
        reply: finalReply,
        products: formattedProducts,
        totalFound: formattedProducts.length,
        usedLLM,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("❌ Conversational shopping error:", error.message);
      throw new Error(`Failed to process message: ${error.message}`);
    }
  }

  _getFallbackReply(intent, formattedProducts, message) {
    if (intent.type === "off_topic") {
      return "I'm your shopping assistant! I can help you find products, recommend items, or optimize your budget. What would you like to shop for today? 🛍️";
    }
    
    if (formattedProducts.length > 0) {
      if (this.noMatchFoundLocally) {
        return `I couldn't find exactly what you were looking for ("${message}").\n\nHowever, we do have some other great products you might like, such as the ${formattedProducts[0].title}. Would you like to explore these? 😊`;
      }

      const priceRange =
        formattedProducts.length > 1
          ? ` ranging from ₹${Math.min(...formattedProducts.map((p) => p.price?.amount || 0))} to ₹${Math.max(...formattedProducts.map((p) => p.price?.amount || 0))}`
          : ` at ₹${formattedProducts[0].price?.amount || 0}`;

      return intent.type === "recommend"
        ? `Great choice! Here are my top recommendations${priceRange}. All products are in stock and ready to ship! 🎯`
        : `Found ${formattedProducts.length} products${priceRange}. Here's what I found for you! 🛍️`;
    }
    
    return `I couldn't find products for "${message}". Try different keywords or adjust your budget. I'm here to help! 😊`;
  }
}

module.exports = new ConversationalShoppingService();
