/**
 * Advanced Query Parser
 *
 * Multi-keyword extraction with:
 *  - Configurable stop-word list
 *  - Synonym expansion
 *  - Price / range extraction
 *  - Category detection from common e-commerce terms
 *  - Sort intent detection
 *  - Fuzzy matching support
 */

// Comprehensive stop words for e-commerce queries
const STOP_WORDS = new Set([
  // English articles & conjunctions
  'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been',
  'has', 'have', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could',
  'should', 'shall', 'may', 'might', 'must', 'am',
  // Prepositions
  'in', 'on', 'at', 'to', 'for', 'with', 'from', 'by', 'of', 'about', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between',
  // Pronouns
  'i', 'me', 'my', 'we', 'us', 'our', 'you', 'your', 'he', 'she', 'it', 'they',
  'them', 'their', 'this', 'that', 'these', 'those',
  // Common query words (not product-relevant)
  'show', 'find', 'search', 'get', 'give', 'tell', 'want', 'need', 'looking',
  'please', 'help', 'some', 'any', 'like', 'something', 'things', 'stuff',
  'item', 'items', 'product', 'products', 'available', 'best', 'good',
  'under', 'below', 'above', 'over', 'between', 'upto', 'within',
  'suggest', 'recommend', 'cheap', 'cheapest', 'latest', 'newest',
  'setup', 'new', 'top', 'popular', 'trending', 'buy', 'purchase',
  // Hindi romanized common words
  'mujhe', 'karo', 'chahiye', 'dikha', 'dikhao', 'do', 'dedo', 'de',
  'kya', 'hai', 'ho', 'ke', 'ka', 'ki',
]);

// Synonym map to normalize search terms
const SYNONYMS = {
  'mobile': ['phone', 'smartphone', 'cellphone', 'handset'],
  'phone': ['mobile', 'smartphone', 'cellphone'],
  'laptop': ['notebook', 'macbook', 'chromebook'],
  'shoes': ['footwear', 'sneakers', 'boots', 'sandals'],
  'sneakers': ['shoes', 'trainers'],
  'headphones': ['earphones', 'earbuds', 'headset'],
  'tv': ['television', 'smart tv'],
  'watch': ['smartwatch', 'wristwatch'],
  'shirt': ['tshirt', 't-shirt', 'top'],
  'pants': ['jeans', 'trousers'],
};

// Category detection keywords
const CATEGORY_KEYWORDS = {
  'Electronics': ['phone', 'mobile', 'laptop', 'tablet', 'tv', 'computer', 'camera', 'headphones', 'earbuds', 'speaker', 'charger', 'cable', 'iphone', 'samsung', 'oppo', 'vivo', 'oneplus', 'realme', 'macbook', 'ipad'],
  'Fashion': ['shirt', 'tshirt', 'jeans', 'pants', 'dress', 'jacket', 'coat', 'shoes', 'sneakers', 'boots', 'sandals', 'watch', 'bag', 'handbag', 'wallet', 'belt', 'sunglasses', 'cap', 'hat'],
  'Home & Kitchen': ['kitchen', 'cookware', 'mixer', 'blender', 'microwave', 'oven', 'fridge', 'refrigerator', 'washing', 'vacuum', 'fan', 'ac', 'cooler', 'heater', 'furniture', 'sofa', 'bed', 'table', 'chair'],
  'Beauty': ['beauty', 'skincare', 'makeup', 'cream', 'lotion', 'perfume', 'shampoo', 'conditioner', 'soap', 'face', 'lipstick', 'foundation'],
  'Sports': ['sports', 'fitness', 'gym', 'yoga', 'cricket', 'football', 'badminton', 'tennis', 'running', 'cycling'],
  'Books': ['book', 'novel', 'textbook', 'ebook', 'kindle', 'reading'],
  'Toys': ['toy', 'game', 'puzzle', 'doll', 'lego', 'action figure'],
};

// Sort intent keywords
const SORT_INTENTS = {
  'price_asc': ['cheap', 'cheapest', 'lowest', 'budget', 'affordable', 'inexpensive', 'sasta', 'saste'],
  'price_desc': ['expensive', 'premium', 'luxury', 'high-end', 'costly', 'mehenga'],
  'rating': ['best', 'top', 'rated', 'popular', 'trending', 'highest rated'],
  'newest': ['new', 'latest', 'newest', 'recent', 'naya', 'naye'],
};

/**
 * Parse a natural-language search query into structured filters.
 *
 * @param {string} query - Raw user query
 * @returns {Object} Parsed filters
 */
function parseQuery(query) {
  if (!query || typeof query !== 'string') {
    return {
      keywords: [],
      priceRange: { min: null, max: null },
      category: null,
      sortBy: 'relevance',
      attributes: {},
      originalQuery: query || '',
    };
  }

  const original = query.trim();
  const lower = original.toLowerCase();

  // --- 1. Extract price information ---
  const priceRange = extractPriceRange(lower);

  // --- 2. Extract sort intent ---
  const sortBy = extractSortIntent(lower);

  // --- 3. Detect category ---
  const category = detectCategory(lower);

  // --- 4. Extract keywords ---
  const keywords = extractKeywords(lower);

  // --- 5. Detect attributes ---
  const attributes = extractAttributes(lower);

  return {
    keywords,
    priceRange,
    category,
    sortBy,
    attributes,
    originalQuery: original,
  };
}

/**
 * Extract price range from query.
 * Handles patterns like:
 *   - "under 2000", "below 5000"
 *   - "above 1000", "over 500"
 *   - "between 1000 and 5000", "1000-5000"
 *   - "₹2000", "$50"
 */
function extractPriceRange(query) {
  let min = null;
  let max = null;

  // "between X and Y" or "X to Y" or "X-Y"
  const rangeMatch = query.match(/(?:between|from)\s*₹?\$?(\d+)\s*(?:and|to|-)\s*₹?\$?(\d+)/i);
  if (rangeMatch) {
    min = Number(rangeMatch[1]);
    max = Number(rangeMatch[2]);
    return { min, max };
  }

  // "X-Y" standalone range
  const dashRange = query.match(/₹?\$?(\d+)\s*-\s*₹?\$?(\d+)/);
  if (dashRange) {
    min = Number(dashRange[1]);
    max = Number(dashRange[2]);
    return { min, max };
  }

  // "under/below/less than X"
  const underMatch = query.match(/(?:under|below|less than|max|upto|up to|within)\s*₹?\$?(\d+)/i);
  if (underMatch) {
    max = Number(underMatch[1]);
  }

  // "above/over/more than/min X"
  const aboveMatch = query.match(/(?:above|over|more than|min|starting|starts at|from)\s*₹?\$?(\d+)/i);
  if (aboveMatch) {
    min = Number(aboveMatch[1]);
  }

  // If no explicit pattern, look for numbers as max price
  if (min === null && max === null) {
    const numbers = query.match(/₹?\$?(\d{3,})/g);
    if (numbers && numbers.length > 0) {
      const cleaned = numbers.map(n => Number(n.replace(/[₹$,]/g, '')));
      if (cleaned.length === 1) {
        max = cleaned[0];
      } else if (cleaned.length >= 2) {
        min = Math.min(...cleaned);
        max = Math.max(...cleaned);
      }
    }
  }

  return { min, max };
}

/**
 * Extract sort intent from query.
 */
function extractSortIntent(query) {
  for (const [sortType, keywords] of Object.entries(SORT_INTENTS)) {
    if (keywords.some(kw => query.includes(kw))) {
      return sortType;
    }
  }
  return 'relevance';
}

/**
 * Detect product category from keywords in the query.
 */
function detectCategory(query) {
  const words = query.split(/\s+/);
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => words.includes(kw) || query.includes(kw))) {
      return category;
    }
  }
  return null;
}

/**
 * Extract meaningful keywords.
 * - Removes stop words
 * - Removes price tokens (numbers preceded by ₹/$ or standalone large numbers)
 * - Returns multi-keyword array
 */
function extractKeywords(query) {
  // Remove price-like tokens
  let cleaned = query
    .replace(/₹?\$?\d+/g, ' ')        // Remove numbers with optional currency
    .replace(/[^a-z0-9\s-]/g, ' ')     // Remove special chars (keep hyphens)
    .replace(/\s+/g, ' ')
    .trim();

  const words = cleaned.split(/\s+/).filter(w => {
    return w.length > 1 && !STOP_WORDS.has(w);
  });

  // Deduplicate while preserving order
  const seen = new Set();
  const unique = [];
  for (const w of words) {
    if (!seen.has(w)) {
      seen.add(w);
      unique.push(w);
    }
  }

  return unique;
}

/**
 * Extract product attributes from query (color, brand, size hints).
 */
function extractAttributes(query) {
  const attrs = {};

  // Colors
  const colors = ['red', 'blue', 'green', 'black', 'white', 'pink', 'yellow',
    'purple', 'orange', 'brown', 'grey', 'gray', 'silver', 'gold', 'navy'];
  const foundColors = colors.filter(c => query.includes(c));
  if (foundColors.length > 0) attrs.color = foundColors;

  // Sizes
  const sizes = ['xs', 'small', 'medium', 'large', 'xl', 'xxl', 'xxxl',
    'extra small', 'extra large'];
  const foundSizes = sizes.filter(s => query.includes(s));
  if (foundSizes.length > 0) attrs.size = foundSizes;

  // Brand hints (common brands)
  const brands = ['apple', 'samsung', 'nike', 'adidas', 'puma', 'sony',
    'lg', 'dell', 'hp', 'lenovo', 'asus', 'realme', 'xiaomi', 'oneplus',
    'oppo', 'vivo', 'boat', 'jbl', 'bose', 'levi', 'zara'];
  const foundBrands = brands.filter(b => query.includes(b));
  if (foundBrands.length > 0) attrs.brand = foundBrands;

  return attrs;
}

/**
 * Simple fuzzy match: checks if at least N% of characters in `needle`
 * appear in sequence in `haystack`. Useful for typo-tolerance.
 *
 * @param {string} needle
 * @param {string} haystack
 * @param {number} threshold - 0 to 1 (default 0.7 = 70% match)
 * @returns {boolean}
 */
function fuzzyMatch(needle, haystack, threshold = 0.7) {
  if (!needle || !haystack) return false;
  needle = needle.toLowerCase();
  haystack = haystack.toLowerCase();

  if (haystack.includes(needle)) return true;

  let matched = 0;
  let hIdx = 0;

  for (let nIdx = 0; nIdx < needle.length && hIdx < haystack.length; nIdx++) {
    while (hIdx < haystack.length) {
      if (haystack[hIdx] === needle[nIdx]) {
        matched++;
        hIdx++;
        break;
      }
      hIdx++;
    }
  }

  return matched / needle.length >= threshold;
}

/**
 * Get synonym expansions for a keyword.
 * @param {string} keyword
 * @returns {string[]} Array including the original keyword + synonyms
 */
function expandSynonyms(keyword) {
  const lower = keyword.toLowerCase();
  const synonyms = SYNONYMS[lower] || [];
  return [lower, ...synonyms];
}

module.exports = {
  parseQuery,
  extractPriceRange,
  extractSortIntent,
  detectCategory,
  extractKeywords,
  extractAttributes,
  fuzzyMatch,
  expandSynonyms,
  STOP_WORDS,
  SYNONYMS,
  CATEGORY_KEYWORDS,
};
