const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const CircuitBreaker = require("../utils/circuitBreaker");
const retryWithBackoff = require("../utils/retryWithBackoff");
const featureFlags = require("../utils/featureFlags");
const llmMetrics = require("../utils/llmMetrics");

class DescriptionGeneratorService {
  constructor() {
    if (process.env.GOOGLE_API_KEY) {
      try {
        this.model = new ChatGoogleGenerativeAI({
          model: "gemini-2.5-flash",
          temperature: 0.7,
          apiKey: process.env.GOOGLE_API_KEY,
          maxOutputTokens: 2048,
        });
        console.log('✅ DescriptionGeneratorService: Gemini model initialized');
      } catch (err) {
        console.error('❌ DescriptionGeneratorService: Init failed:', err.message);
        this.model = null;
      }
    } else {
      this.model = null;
      console.log('⚠️ GOOGLE_API_KEY not set — DescriptionGeneratorService disabled');
    }

    this.circuitBreaker = new CircuitBreaker({
      name: 'Description-LLM',
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      callTimeoutMs: 20000,
    });
  }

  /**
   * Generate product description with bullet points and tags
   * @param {Object} productData - Basic product information
   * @returns {Object} Generated description, bullet points, and tags
   */
  async generateDescription(productData) {
    const startTime = Date.now();

    try {
      const { title, category, basicDescription, price } = productData;

      if (!title) {
        throw new Error("Product title is required");
      }

      console.log(`📝 Generating description for: "${title}"`);

      let generatedContent;
      let usedLLM = false;

      // Try LLM generation if enabled
      if (this.model && featureFlags.isEnabled('LLM_DESCRIPTION_GENERATOR')) {
        try {
          console.log('🤖 Attempting LLM description generation...');

          generatedContent = await this.circuitBreaker.execute(async () => {
            return await retryWithBackoff(
              async () => {
                const prompt = `You are an expert e-commerce product copywriter. Generate a compelling product listing for:

Product: ${title}
Category: ${category || 'General'}
Basic Info: ${basicDescription || 'N/A'}
Price: ₹${price || 'N/A'}

Return ONLY a valid JSON object with:
{
  "fullDescription": "A compelling 2-3 sentence product description",
  "bulletPoints": ["5 key selling points as bullet points"],
  "tags": ["8-10 relevant product tags"],
  "seoKeywords": ["5-7 SEO keywords"]
}

Write in a professional, engaging tone. Be specific to the product.`;

                const result = await this.model.invoke(prompt);
                const text = result.content || '';
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error('No JSON found in LLM response');
                return JSON.parse(jsonMatch[0]);
              },
              {
                maxRetries: 2,
                baseDelayMs: 1000,
                label: 'Description-LLM',
                shouldRetry: (err) => !err.message.includes('Circuit is OPEN'),
              }
            );
          });

          usedLLM = true;
          console.log("✅ LLM description generated successfully");

          llmMetrics.record({
            endpoint: 'generate-description',
            success: true,
            latencyMs: Date.now() - startTime,
          });
        } catch (err) {
          console.warn(`⚠️ LLM description failed: ${err.message}. Using fallback.`);

          llmMetrics.record({
            endpoint: 'generate-description',
            success: false,
            latencyMs: Date.now() - startTime,
            usedFallback: true,
            error: err.message,
            timedOut: err.message.includes('timed out') || err.message.includes('Timeout'),
          });
        }
      }

      // Fallback: generate a reasonable description locally
      if (!generatedContent) {
        console.log('📋 Using fallback description generator');
        const titleWords = title.toLowerCase().split(/\s+/);

        generatedContent = {
          fullDescription: basicDescription
            ? `${basicDescription} Discover the ${title} — a premium ${category || 'product'} designed to deliver exceptional quality at an unbeatable price of ₹${price || 'Best Price'}.`
            : `Introducing the ${title} — a top-tier ${category || 'product'} crafted for performance and style. Available at ₹${price || 'Best Price'}, it combines quality materials with cutting-edge design.`,
          bulletPoints: [
            `Premium ${category || 'product'} with superior build quality`,
            'Designed for maximum performance and durability',
            'Great value for money with competitive pricing',
            'Trusted by thousands of satisfied customers',
            'Fast and reliable delivery across India',
          ],
          tags: [
            category || 'general',
            ...titleWords.filter(w => w.length > 2).slice(0, 3),
            'trending',
            'bestseller',
            'recommended',
            'top-rated',
            'value-for-money',
          ].filter(Boolean),
          seoKeywords: [
            title.toLowerCase(),
            `buy ${title.toLowerCase()}`,
            category?.toLowerCase() || 'product',
            `${title.toLowerCase()} price`,
            `${title.toLowerCase()} online`,
          ].filter(Boolean),
        };
      }

      return {
        success: true,
        productTitle: title,
        generatedContent,
        usedLLM,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("❌ Description generation error:", error.message);
      throw new Error(`Failed to generate description: ${error.message}`);
    }
  }
}

module.exports = new DescriptionGeneratorService();
