const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const CircuitBreaker = require("../utils/circuitBreaker");
const retryWithBackoff = require("../utils/retryWithBackoff");
const featureFlags = require("../utils/featureFlags");
const llmMetrics = require("../utils/llmMetrics");

// Category mappings for fallback
const CATEGORY_MAP = {
  'phone': { category: 'Electronics', subcategory: 'Smartphones' },
  'mobile': { category: 'Electronics', subcategory: 'Smartphones' },
  'iphone': { category: 'Electronics', subcategory: 'Smartphones' },
  'samsung': { category: 'Electronics', subcategory: 'Smartphones' },
  'laptop': { category: 'Electronics', subcategory: 'Laptops' },
  'macbook': { category: 'Electronics', subcategory: 'Laptops' },
  'headphone': { category: 'Electronics', subcategory: 'Audio' },
  'earphone': { category: 'Electronics', subcategory: 'Audio' },
  'earbuds': { category: 'Electronics', subcategory: 'Audio' },
  'tv': { category: 'Electronics', subcategory: 'Televisions' },
  'watch': { category: 'Electronics', subcategory: 'Smartwatches' },
  'camera': { category: 'Electronics', subcategory: 'Cameras' },
  'shoe': { category: 'Fashion', subcategory: 'Footwear' },
  'sneaker': { category: 'Fashion', subcategory: 'Footwear' },
  'shirt': { category: 'Fashion', subcategory: 'Clothing' },
  'jeans': { category: 'Fashion', subcategory: 'Clothing' },
  'dress': { category: 'Fashion', subcategory: 'Clothing' },
  'jacket': { category: 'Fashion', subcategory: 'Clothing' },
  'bag': { category: 'Fashion', subcategory: 'Accessories' },
  'wallet': { category: 'Fashion', subcategory: 'Accessories' },
  'kitchen': { category: 'Home & Kitchen', subcategory: 'Kitchen Appliances' },
  'mixer': { category: 'Home & Kitchen', subcategory: 'Kitchen Appliances' },
  'furniture': { category: 'Home & Kitchen', subcategory: 'Furniture' },
  'book': { category: 'Books', subcategory: 'General' },
  'toy': { category: 'Toys', subcategory: 'General' },
  'cream': { category: 'Beauty', subcategory: 'Skincare' },
  'perfume': { category: 'Beauty', subcategory: 'Fragrances' },
};

class CategoryTagSuggestionService {
  constructor() {
    if (process.env.GOOGLE_API_KEY) {
      try {
        this.model = new ChatGoogleGenerativeAI({
          model: "gemini-2.5-flash",
          temperature: 0.5,
          apiKey: process.env.GOOGLE_API_KEY,
          maxOutputTokens: 1024,
        });
        console.log('✅ CategoryTagSuggestionService: Gemini model initialized');
      } catch (err) {
        console.error('❌ CategoryTagSuggestionService: Init failed:', err.message);
        this.model = null;
      }
    } else {
      this.model = null;
      console.log('⚠️ GOOGLE_API_KEY not set — CategoryTagSuggestionService disabled');
    }

    this.circuitBreaker = new CircuitBreaker({
      name: 'CategoryTag-LLM',
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      callTimeoutMs: 15000,
    });
  }

  /**
   * Suggest category, subcategory, and tags based on product info
   * @param {Object} productData - Product title and description
   * @returns {Object} Category suggestions and tags
   */
  async suggestCategoryAndTags(productData) {
    const startTime = Date.now();

    try {
      const { title, description } = productData;

      if (!title) {
        throw new Error("Product title is required");
      }

      console.log(`🏷️ Suggesting categories and tags for: "${title}"`);

      let suggestions;
      let usedLLM = false;

      // Try LLM if enabled
      if (this.model && featureFlags.isEnabled('LLM_CATEGORY_SUGGESTION')) {
        try {
          console.log('🤖 Attempting LLM category suggestion...');

          suggestions = await this.circuitBreaker.execute(async () => {
            return await retryWithBackoff(
              async () => {
                const prompt = `You are an e-commerce product categorization expert. Analyze this product and suggest the best category, subcategory, and tags.

Product Title: ${title}
Description: ${description || 'N/A'}

Return ONLY valid JSON:
{
  "category": "Main category (e.g., Electronics, Fashion, Home & Kitchen, Beauty, Sports, Books, Toys)",
  "subcategory": "Specific subcategory",
  "tags": ["8-10 relevant product tags for search and discovery"],
  "confidence": 85,
  "reasoning": "Brief explanation of why this categorization was chosen"
}`;

                const result = await this.model.invoke(prompt);
                const text = result.content || '';
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error('No JSON found in LLM response');
                return JSON.parse(jsonMatch[0]);
              },
              {
                maxRetries: 2,
                baseDelayMs: 1000,
                label: 'CategoryTag-LLM',
                shouldRetry: (err) => !err.message.includes('Circuit is OPEN'),
              }
            );
          });

          usedLLM = true;
          console.log("✅ LLM category suggestion generated");

          llmMetrics.record({
            endpoint: 'suggest-category-tags',
            success: true,
            latencyMs: Date.now() - startTime,
          });
        } catch (err) {
          console.warn(`⚠️ LLM category suggestion failed: ${err.message}. Using fallback.`);

          llmMetrics.record({
            endpoint: 'suggest-category-tags',
            success: false,
            latencyMs: Date.now() - startTime,
            usedFallback: true,
            error: err.message,
            timedOut: err.message.includes('timed out') || err.message.includes('Timeout'),
          });
        }
      }

      // Fallback: keyword-based categorization
      if (!suggestions) {
        console.log('📋 Using keyword-based categorization fallback');
        const titleLower = title.toLowerCase();
        const descLower = (description || '').toLowerCase();
        const combined = `${titleLower} ${descLower}`;

        let detectedCategory = 'General';
        let detectedSubcategory = 'Miscellaneous';
        let confidence = 60;

        // Check against keyword map
        for (const [keyword, mapping] of Object.entries(CATEGORY_MAP)) {
          if (combined.includes(keyword)) {
            detectedCategory = mapping.category;
            detectedSubcategory = mapping.subcategory;
            confidence = 80;
            break;
          }
        }

        // Generate relevant tags from title words
        const titleWords = titleLower
          .replace(/[^a-z0-9\s-]/g, ' ')
          .split(/\s+/)
          .filter(w => w.length > 2);

        const baseTags = [...new Set([
          ...titleWords.slice(0, 4),
          detectedCategory.toLowerCase(),
          detectedSubcategory.toLowerCase(),
          'trending',
          'bestseller',
          'new-arrival',
          'recommended',
        ])].slice(0, 10);

        suggestions = {
          category: detectedCategory,
          subcategory: detectedSubcategory,
          tags: baseTags,
          confidence: confidence,
          reasoning: "Based on keyword matching against product title and description",
        };
      }

      console.log("✅ Category suggestions ready");

      return {
        success: true,
        productTitle: title,
        suggestions,
        usedLLM,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("❌ Category suggestion error:", error.message);
      throw new Error(`Failed to suggest categories: ${error.message}`);
    }
  }
}

module.exports = new CategoryTagSuggestionService();
