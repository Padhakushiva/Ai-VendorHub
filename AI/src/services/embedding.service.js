const { STOP_WORDS, expandSynonyms } = require("../utils/queryParser");

const DIMENSIONS = Number(process.env.AI_LOCAL_EMBEDDING_DIMENSIONS) || 256;

function normalizeText(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value = "") {
  return normalizeText(value)
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
}

function hashToken(token) {
  let hash = 2166136261;
  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function normalizeVector(vector) {
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + (value * value), 0));
  if (!norm) return vector;
  return vector.map((value) => Number((value / norm).toFixed(6)));
}

function embedText(value = "") {
  const vector = Array(DIMENSIONS).fill(0);
  const tokens = tokenize(value);

  for (const token of tokens) {
    const expanded = expandSynonyms(token);
    expanded.forEach((term, synonymIndex) => {
      const position = hashToken(term) % DIMENSIONS;
      vector[position] += synonymIndex === 0 ? 1 : 0.55;
    });
  }

  return normalizeVector(vector);
}

function productText(product = {}) {
  const specs = product.specifications
    ? Object.entries(product.specifications instanceof Map ? Object.fromEntries(product.specifications) : product.specifications)
      .map(([key, value]) => `${key} ${value}`)
      .join(" ")
    : "";

  const reviews = Array.isArray(product.reviews)
    ? product.reviews.map((review) => `${review.title || ""} ${review.comment || review.text || ""}`).join(" ")
    : "";

  return [
    product.title,
    product.name,
    product.description,
    product.category,
    product.brand,
    ...(product.tags || []),
    specs,
    reviews,
  ].filter(Boolean).join(" ");
}

function embedProduct(product = {}) {
  return embedText(productText(product));
}

function cosineSimilarity(left = [], right = []) {
  if (!left.length || !right.length) return 0;
  const length = Math.min(left.length, right.length);
  let score = 0;
  for (let index = 0; index < length; index += 1) {
    score += (Number(left[index]) || 0) * (Number(right[index]) || 0);
  }
  return Number(score.toFixed(6));
}

module.exports = {
  DIMENSIONS,
  tokenize,
  embedText,
  embedProduct,
  cosineSimilarity,
  productText,
};
