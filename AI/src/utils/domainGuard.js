const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { getPrompt } = require("../services/prompt.service");
const { extractJsonObject } = require("./json");
const { parseQuery } = require("./queryParser");

let classifierModel = null;

function getModel() {
  if (!process.env.GOOGLE_API_KEY) return null;
  if (!classifierModel) {
    classifierModel = new ChatGoogleGenerativeAI({
      model: process.env.AI_MODEL || "gemini-2.5-flash",
      temperature: 0.1,
      apiKey: process.env.GOOGLE_API_KEY,
      maxOutputTokens: 512,
    });
  }
  return classifierModel;
}

function fallbackClassify(message) {
  const parsed = parseQuery(message || "");
  const hasShoppingSignal = parsed.keywords.length > 0
    || parsed.category
    || parsed.priceRange?.min
    || parsed.priceRange?.max;

  if (!message || message.trim().length < 2) {
    return {
      allowed: false,
      intent: "unclear",
      reason: "Query is too short to understand.",
      clarifyingQuestion: "Please tell me what product, budget, or shopping need you have.",
    };
  }

  if (hasShoppingSignal) {
    return {
      allowed: true,
      intent: "search",
      reason: "Looks like a marketplace shopping request.",
      clarifyingQuestion: "",
    };
  }

  return {
    allowed: false,
    intent: "off_topic",
    reason: "Request is outside marketplace shopping scope.",
    clarifyingQuestion: "",
  };
}

async function classifyMarketplaceRequest(message) {
  const model = getModel();
  if (!model) return fallbackClassify(message);

  try {
    const response = await model.invoke(getPrompt("marketplaceClassifier", { message }));
    const parsed = extractJsonObject(response.content, null);
    if (!parsed || typeof parsed.allowed !== "boolean") return fallbackClassify(message);
    return {
      allowed: parsed.allowed,
      intent: parsed.intent || (parsed.allowed ? "search" : "off_topic"),
      reason: parsed.reason || "",
      clarifyingQuestion: parsed.clarifyingQuestion || "",
    };
  } catch (error) {
    console.warn("AI domain classifier fallback:", error.message);
    return fallbackClassify(message);
  }
}

function buildScopeMessage(classification) {
  if (classification.intent === "unclear") {
    return classification.clarifyingQuestion || "I could not clearly understand your request. Please mention the product, budget, category, or seller task you want help with.";
  }

  return "I can help only with Ai-VendorHub marketplace tasks like product search, recommendations, comparisons, budget shopping, product descriptions, category/tag suggestions, and review summaries. Please ask me something related to shopping or seller product listing.";
}

module.exports = {
  classifyMarketplaceRequest,
  buildScopeMessage,
};
