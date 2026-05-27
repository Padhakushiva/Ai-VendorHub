function extractJsonObject(text, fallback = null) {
  if (!text || typeof text !== "string") return fallback;
  try {
    return JSON.parse(text);
  } catch (_) {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    try {
      return JSON.parse(match[0]);
    } catch (_) {
      return fallback;
    }
  }
}

function extractJsonArray(text, fallback = []) {
  if (!text || typeof text !== "string") return fallback;
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (_) {
    const match = text.match(/\[[\s\S]*?\]/);
    if (!match) return fallback;
    try {
      const parsed = JSON.parse(match[0]);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (_) {
      return fallback;
    }
  }
}

module.exports = {
  extractJsonObject,
  extractJsonArray,
};
