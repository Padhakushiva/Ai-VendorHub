const axios = require("axios");
const { parseQuery, expandSynonyms } = require("../utils/queryParser");
const { embedText, embedProduct, cosineSimilarity } = require("./embedding.service");
const personalizationService = require("./personalization.service");

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || "http://localhost:3000";

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function productId(product = {}) {
  return String(product._id || product.id || product.productId || "");
}

function normalizeProduct(product = {}) {
  return {
    ...product,
    _id: product._id || product.id || product.productId,
    price: product.price || product.currentPrice || product.unitPrice || { amount: 0, currency: "INR" },
    stock: Number(product.stock ?? product.productSnapshot?.stock ?? 0),
    title: product.title || product.name || product.productSnapshot?.title || "Untitled product",
    description: product.description || "",
    category: product.category || product.productSnapshot?.category,
    brand: product.brand,
    tags: product.tags || [],
    images: product.images || product.productSnapshot?.images || [],
  };
}

function withinBudget(product, intent = {}) {
  const price = Number(product.price?.amount || 0);
  if (intent.minBudget && price < Number(intent.minBudget)) return false;
  if (intent.maxBudget && price > Number(intent.maxBudget)) return false;
  return true;
}

function keywordText(product = {}) {
  return [
    product.title,
    product.description,
    product.category,
    product.brand,
    ...(product.tags || []),
  ].filter(Boolean).join(" ").toLowerCase();
}

function keywordScore(product, keywords = []) {
  if (!keywords.length) return 0;
  const text = keywordText(product);
  let matches = 0;
  let possible = 0;
  for (const keyword of keywords) {
    const expanded = expandSynonyms(keyword);
    possible += 1;
    if (expanded.some((term) => text.includes(term.toLowerCase()))) matches += 1;
  }
  return possible ? matches / possible : 0;
}

function preferenceScore(product, signals) {
  let score = 0;
  const category = String(product.category || "").toLowerCase();
  const brand = String(product.brand || "").toLowerCase();
  const text = keywordText(product);

  if (signals.categories.has(category)) score += Math.min(0.18, signals.categories.get(category) / 30);
  if (signals.brands.has(brand)) score += Math.min(0.12, signals.brands.get(brand) / 30);

  for (const [term, weight] of signals.terms.entries()) {
    if (text.includes(term)) score += Math.min(0.08, weight / 60);
  }

  if (signals.productIds.has(productId(product))) score += 0.1;
  if ((signals.memory.negativeProductIds || []).includes(productId(product))) score -= 0.25;
  return score;
}

function popularityScore(product) {
  const rating = Number(product.rating?.average || product.rating || 0);
  const ratingCount = Number(product.rating?.count || product.reviewsCount || 0);
  const metrics = product.metrics || {};
  const popularity = Number(metrics.popularityScore || 0);
  const ratingComponent = rating > 0 ? Math.min(0.12, rating / 5 * 0.12) : 0;
  const countComponent = Math.min(0.05, ratingCount / 200);
  const metricComponent = Math.min(0.08, popularity / 1000);
  return ratingComponent + countComponent + metricComponent;
}

function buildReasons(product, components, intent, signals) {
  const reasons = [];
  if (components.semantic >= 0.35) reasons.push("Matches the meaning of your request");
  if (components.keyword >= 0.5) reasons.push("Matches your searched terms");
  if (components.preference > 0.08) reasons.push("Fits your past shopping preferences");
  if (signals.productIds.has(productId(product))) reasons.push("Related to your cart, wishlist, views, or orders");
  if (Number(product.stock || 0) > 0) reasons.push("Currently in stock");
  if (intent.maxBudget && Number(product.price?.amount || 0) <= Number(intent.maxBudget)) reasons.push(`Inside your ₹${intent.maxBudget} budget`);
  if (components.popularity > 0.08) reasons.push("Has stronger marketplace signals");
  return reasons.slice(0, 4);
}

class ProductIntelligenceService {
  async fetchCandidates(intent = {}, token) {
    const parsed = parseQuery([...(intent.keywords || []), intent.category || ""].join(" "));
    const searches = [];
    const baseParams = { limit: 40 };

    if (intent.maxBudget) baseParams.maxPrice = intent.maxBudget;
    if (intent.minBudget) baseParams.minPrice = intent.minBudget;
    if (intent.category) baseParams.category = intent.category;
    if (intent.sortBy && intent.sortBy !== "relevance") baseParams.sort = intent.sortBy;

    if (intent.keywords?.length) {
      searches.push({ ...baseParams, q: intent.keywords.join(" ") });
      for (const keyword of intent.keywords.slice(0, 3)) searches.push({ ...baseParams, q: keyword });
    }
    if (parsed.category && parsed.category !== intent.category) searches.push({ ...baseParams, category: parsed.category });
    if (intent.category) searches.push({ ...baseParams, category: intent.category });
    searches.push({ ...baseParams });

    const seen = new Set();
    const candidates = [];

    for (const params of searches) {
      try {
        const response = await axios.get(`${PRODUCT_SERVICE_URL}/api/product`, {
          params,
          headers: authHeaders(token),
          timeout: 5000,
        });
        const products = response.data.data || response.data.products || [];
        for (const raw of products) {
          const product = normalizeProduct(raw);
          const id = productId(product);
          if (!id || seen.has(id)) continue;
          seen.add(id);
          candidates.push(product);
        }
      } catch (_) {}
      if (candidates.length >= 80) break;
    }

    return candidates;
  }

  async rankProducts({ query, intent = {}, token, memory = {} }) {
    const [candidates, signals] = await Promise.all([
      this.fetchCandidates(intent, token),
      personalizationService.getSignals(token, memory),
    ]);

    const queryText = [
      query,
      ...(intent.keywords || []),
      intent.category || "",
      memory.summary || "",
    ].join(" ");
    const queryEmbedding = embedText(queryText);
    const memoryEmbedding = Array.isArray(memory.embedding) && memory.embedding.length ? memory.embedding : embedText(memory.summary || "");

    const ranked = candidates
      .filter((product) => withinBudget(product, intent))
      .map((product) => {
        const productEmbedding = embedProduct(product);
        const semantic = cosineSimilarity(queryEmbedding, productEmbedding);
        const memorySemantic = cosineSimilarity(memoryEmbedding, productEmbedding);
        const keyword = keywordScore(product, intent.keywords || []);
        const preference = preferenceScore(product, signals);
        const stock = Number(product.stock || 0) > 0 ? 0.12 : -0.35;
        const priceFit = intent.maxBudget
          ? Math.max(0, 0.1 * (1 - (Number(product.price?.amount || 0) / Math.max(Number(intent.maxBudget), 1))))
          : 0;
        const popularity = popularityScore(product);
        const components = { semantic, memorySemantic, keyword, preference, stock, priceFit, popularity };
        const score = (semantic * 0.34)
          + (memorySemantic * 0.12)
          + (keyword * 0.22)
          + preference
          + stock
          + priceFit
          + popularity;

        return {
          ...product,
          aiScore: Number(score.toFixed(4)),
          aiScoreBreakdown: components,
          aiReasons: buildReasons(product, components, intent, signals),
        };
      })
      .sort((left, right) => right.aiScore - left.aiScore);

    return {
      products: ranked,
      personalization: {
        hasSignals: signals.productIds.size > 0 || signals.categories.size > 0 || signals.terms.size > 0,
        categories: [...signals.categories.entries()].slice(0, 6),
        brands: [...signals.brands.entries()].slice(0, 6),
        terms: [...signals.terms.entries()].slice(0, 8),
      },
    };
  }
}

module.exports = new ProductIntelligenceService();
