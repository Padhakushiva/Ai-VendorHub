const { HumanMessage, AIMessage } = require("@langchain/core/messages");
const { isConnected } = require("../DB/db");
const AIConversation = require("../models/aiConversation.model");
const AIUserMemory = require("../models/aiUserMemory.model");
const { embedText, tokenize } = require("./embedding.service");

const MAX_HISTORY_MESSAGES = Number(process.env.AI_MEMORY_HISTORY_LIMIT) || 16;
const MAX_LIST = 30;

function getUserId(user = {}) {
  return user.id || user._id || user.userId || user.sub || "anonymous";
}

function trimList(values = [], max = MAX_LIST) {
  return [...new Set(values.filter(Boolean).map(String))].slice(0, max);
}

function bumpWeighted(list = [], key, amount = 1) {
  if (!key) return list;
  const normalized = String(key).trim().toLowerCase();
  if (!normalized) return list;

  const next = [...list];
  const existing = next.find((item) => item.key === normalized);
  if (existing) {
    existing.weight = Number((Number(existing.weight || 0) + amount).toFixed(2));
    existing.lastSeenAt = new Date();
  } else {
    next.push({ key: normalized, weight: amount, lastSeenAt: new Date() });
  }

  return next
    .sort((left, right) => Number(right.weight || 0) - Number(left.weight || 0))
    .slice(0, MAX_LIST);
}

function budgetFromIntent(intent = {}) {
  const values = [intent.minBudget, intent.maxBudget, intent.priceRange?.min, intent.priceRange?.max]
    .map(Number)
    .filter((value) => Number.isFinite(value) && value > 0);
  return values;
}

class AIMemoryService {
  constructor() {
    this.fallbackConversations = new Map();
    this.fallbackMemories = new Map();
  }

  async getConversation(userId, sessionId) {
    const key = `${userId}:${sessionId}`;
    if (!isConnected()) {
      return this.fallbackConversations.get(key) || { messages: [], lastIntent: null, lastProductIds: [] };
    }

    const doc = await AIConversation.findOne({ userId, sessionId }).lean();
    return doc || { messages: [], lastIntent: null, lastProductIds: [] };
  }

  async getLangChainHistory(userId, sessionId) {
    const conversation = await this.getConversation(userId, sessionId);
    return (conversation.messages || []).slice(-MAX_HISTORY_MESSAGES).map((message) => (
      message.role === "user"
        ? new HumanMessage(message.content)
        : new AIMessage(message.content)
    ));
  }

  async saveTurn({ userId, sessionId, userMessage, assistantReply, intent, products = [], actions = [] }) {
    const key = `${userId}:${sessionId}`;
    const productRefs = products.slice(0, 10).map((product) => ({
      productId: String(product._id || product.id || product.productId || ""),
      title: product.title,
      score: product.aiScore,
      reasons: product.aiReasons || [],
    })).filter((product) => product.productId);

    const messagesToAdd = [
      { role: "user", content: userMessage, intent, products: [], actions: [] },
      { role: "assistant", content: assistantReply, intent, products: productRefs, actions },
    ];

    if (!isConnected()) {
      const current = this.fallbackConversations.get(key) || { messages: [], lastIntent: null, lastProductIds: [] };
      current.messages = [...current.messages, ...messagesToAdd].slice(-MAX_HISTORY_MESSAGES);
      current.lastIntent = intent;
      current.lastProductIds = productRefs.map((product) => product.productId);
      this.fallbackConversations.set(key, current);
      return current;
    }

    const updated = await AIConversation.findOneAndUpdate(
      { userId, sessionId },
      {
        $push: { messages: { $each: messagesToAdd, $slice: -MAX_HISTORY_MESSAGES } },
        $set: {
          lastIntent: intent,
          lastProductIds: productRefs.map((product) => product.productId),
        },
      },
      { upsert: true, new: true },
    );
    return updated;
  }

  async getUserMemory(userId) {
    if (!isConnected()) {
      return this.fallbackMemories.get(userId) || this.emptyMemory(userId);
    }

    const doc = await AIUserMemory.findOne({ userId }).lean();
    return doc || this.emptyMemory(userId);
  }

  emptyMemory(userId) {
    return {
      userId,
      preferredCategories: [],
      preferredBrands: [],
      preferredTerms: [],
      budget: { min: null, max: null, observed: [] },
      positiveProductIds: [],
      negativeProductIds: [],
      lastSearches: [],
      embedding: [],
      summary: "",
    };
  }

  async learnFromTurn({ userId, message, intent = {}, products = [], actionResults = [] }) {
    const current = await this.getUserMemory(userId);
    let preferredCategories = current.preferredCategories || [];
    let preferredBrands = current.preferredBrands || [];
    let preferredTerms = current.preferredTerms || [];
    let observedBudget = current.budget?.observed || [];
    let positiveProductIds = current.positiveProductIds || [];
    let negativeProductIds = current.negativeProductIds || [];

    for (const keyword of intent.keywords || []) preferredTerms = bumpWeighted(preferredTerms, keyword, 1.2);
    for (const token of tokenize(message).slice(0, 8)) preferredTerms = bumpWeighted(preferredTerms, token, 0.4);
    if (intent.category) preferredCategories = bumpWeighted(preferredCategories, intent.category, 1.5);

    for (const product of products.slice(0, 5)) {
      if (product.category) preferredCategories = bumpWeighted(preferredCategories, product.category, 0.35);
      if (product.brand) preferredBrands = bumpWeighted(preferredBrands, product.brand, 0.35);
      const amount = Number(product.price?.amount);
      if (Number.isFinite(amount) && amount > 0) observedBudget.push(amount);
    }

    for (const value of budgetFromIntent(intent)) observedBudget.push(value);
    observedBudget = observedBudget.slice(-50);

    for (const result of actionResults || []) {
      if (["add_to_cart", "add_to_wishlist", "save_for_later"].includes(result.type) && result.success && result.productId) {
        positiveProductIds = trimList([result.productId, ...positiveProductIds]);
      }
      if (!result.success && result.productId) {
        negativeProductIds = trimList([result.productId, ...negativeProductIds]);
      }
    }

    const budgetMin = observedBudget.length ? Math.min(...observedBudget) : current.budget?.min || null;
    const budgetMax = observedBudget.length ? Math.max(...observedBudget) : current.budget?.max || null;
    const summary = this.buildSummary({ preferredCategories, preferredBrands, preferredTerms, budgetMin, budgetMax });
    const embeddingText = [
      summary,
      message,
      (intent.keywords || []).join(" "),
      preferredCategories.slice(0, 8).map((item) => item.key).join(" "),
      preferredBrands.slice(0, 8).map((item) => item.key).join(" "),
    ].join(" ");

    const nextMemory = {
      userId,
      preferredCategories,
      preferredBrands,
      preferredTerms,
      budget: { min: budgetMin, max: budgetMax, observed: observedBudget },
      positiveProductIds,
      negativeProductIds,
      lastSearches: trimList([message, ...(current.lastSearches || [])]),
      embedding: embedText(embeddingText),
      summary,
    };

    if (!isConnected()) {
      this.fallbackMemories.set(userId, nextMemory);
      return nextMemory;
    }

    return AIUserMemory.findOneAndUpdate(
      { userId },
      { $set: nextMemory },
      { upsert: true, new: true },
    ).lean();
  }

  buildSummary({ preferredCategories, preferredBrands, preferredTerms, budgetMin, budgetMax }) {
    const top = (list) => (list || []).slice(0, 5).map((item) => item.key).join(", ");
    return [
      top(preferredCategories) ? `Categories: ${top(preferredCategories)}` : "",
      top(preferredBrands) ? `Brands: ${top(preferredBrands)}` : "",
      top(preferredTerms) ? `Terms: ${top(preferredTerms)}` : "",
      budgetMax ? `Observed budget: ${budgetMin || 0}-${budgetMax}` : "",
    ].filter(Boolean).join(". ");
  }
}

module.exports = new AIMemoryService();
