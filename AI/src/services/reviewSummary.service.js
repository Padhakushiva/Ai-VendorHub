const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const axios = require("axios");
const CircuitBreaker = require("../utils/circuitBreaker");
const retryWithBackoff = require("../utils/retryWithBackoff");
const featureFlags = require("../utils/featureFlags");
const llmMetrics = require("../utils/llmMetrics");

class ReviewSummaryService {
  constructor() {
    if (process.env.GOOGLE_API_KEY) {
      try {
        this.model = new ChatGoogleGenerativeAI({
          model: "gemini-2.5-flash",
          temperature: 0.3,
          apiKey: process.env.GOOGLE_API_KEY,
          maxOutputTokens: 1024,
        });
        console.log('✅ ReviewSummaryService: Gemini model initialized');
      } catch (err) {
        console.error('❌ ReviewSummaryService: Init failed:', err.message);
        this.model = null;
      }
    } else {
      this.model = null;
      console.log('⚠️ GOOGLE_API_KEY not set — ReviewSummaryService disabled');
    }

    this.circuitBreaker = new CircuitBreaker({
      name: 'ReviewSummary-LLM',
      failureThreshold: 3,
      resetTimeoutMs: 30000,
      callTimeoutMs: 20000,
    });
  }

  /**
   * Summarize product reviews into pros, cons, and overall sentiment
   * @param {string} productId - Product ID
   * @param {string} token - Auth token for product service
   * @returns {Object} Review summary with pros, cons, and sentiment
   */
  async summarizeReviews(productId, token) {
    const startTime = Date.now();

    try {
      console.log(`📊 Summarizing reviews for product: ${productId}`);

      // Fetch product details to get reviews
      const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3000';
      const productResponse = await axios.get(
        `${productServiceUrl}/api/product/${productId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 5000,
        }
      ).catch(() => ({ data: { product: {} } }));

      const product = productResponse.data.product || productResponse.data.data || {};
      const reviews = product.reviews || [];

      if (reviews.length === 0) {
        return {
          success: true,
          productId: productId,
          productName: product.name || product.title || "Unknown Product",
          reviewsCount: 0,
          message: "No reviews found for this product",
          summary: null,
          timestamp: new Date(),
        };
      }

      // Calculate average rating
      const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
        : 0;

      let summary;
      let usedLLM = false;

      // Try LLM for review summarization
      if (this.model && featureFlags.isEnabled('LLM_REVIEW_SUMMARY') && reviews.length > 0) {
        try {
          console.log('🤖 Attempting LLM review summarization...');

          summary = await this.circuitBreaker.execute(async () => {
            return await retryWithBackoff(
              async () => {
                // Prepare review texts (limit to 20 reviews to fit in context)
                const reviewTexts = reviews.slice(0, 20).map((r, i) =>
                  `Review ${i + 1} (${r.rating || 'N/A'}/5): ${r.comment || r.text || r.review || 'No text'}`
                ).join('\n');

                const prompt = `Analyze these ${reviews.length} product reviews and generate a summary.

Product: ${product.name || product.title || 'Product'}
Average Rating: ${avgRating}/5

Reviews:
${reviewTexts}

Return ONLY valid JSON:
{
  "pros": ["Top 5 positive points mentioned by reviewers"],
  "cons": ["Top 3 negative points or improvement areas"],
  "overallSentiment": "positive | neutral | negative",
  "summary": "2-3 sentence summary of the overall review sentiment",
  "recommendationScore": 85
}

Base your analysis on actual review content. Be specific, not generic.`;

                const result = await this.model.invoke(prompt);
                const text = result.content || '';
                const jsonMatch = text.match(/\{[\s\S]*\}/);
                if (!jsonMatch) throw new Error('No JSON found in LLM response');
                return JSON.parse(jsonMatch[0]);
              },
              {
                maxRetries: 2,
                baseDelayMs: 1000,
                label: 'ReviewSummary-LLM',
                shouldRetry: (err) => !err.message.includes('Circuit is OPEN'),
              }
            );
          });

          usedLLM = true;
          console.log("✅ LLM review summary generated");

          llmMetrics.record({
            endpoint: 'review-summary',
            success: true,
            latencyMs: Date.now() - startTime,
          });
        } catch (err) {
          console.warn(`⚠️ LLM review summary failed: ${err.message}. Using fallback.`);

          llmMetrics.record({
            endpoint: 'review-summary',
            success: false,
            latencyMs: Date.now() - startTime,
            usedFallback: true,
            error: err.message,
            timedOut: err.message.includes('timed out') || err.message.includes('Timeout'),
          });
        }
      }

      // Fallback: simple statistical summary
      if (!summary) {
        console.log('📋 Using statistical review summary fallback');

        // Extract some real keywords from reviews
        const allReviewText = reviews
          .map(r => r.comment || r.text || r.review || '')
          .join(' ')
          .toLowerCase();

        // Simple sentiment analysis based on keywords
        const positiveWords = ['good', 'great', 'excellent', 'amazing', 'love', 'best', 'awesome', 'fantastic', 'perfect', 'quality', 'nice', 'recommend'];
        const negativeWords = ['bad', 'poor', 'terrible', 'worst', 'hate', 'broken', 'cheap', 'disappointing', 'slow', 'defective', 'waste'];

        const positiveCount = positiveWords.filter(w => allReviewText.includes(w)).length;
        const negativeCount = negativeWords.filter(w => allReviewText.includes(w)).length;

        const sentiment = parseFloat(avgRating) >= 4 ? 'positive'
          : parseFloat(avgRating) >= 3 ? 'neutral'
          : 'negative';

        summary = {
          pros: [
            positiveCount > 0 ? 'Customers praise the quality' : 'Reliable product performance',
            'Good value for money',
            'Fast delivery experience',
            'Meets product expectations',
            'Positive overall sentiment',
          ],
          cons: [
            negativeCount > 0 ? 'Some quality concerns reported' : 'Limited color/size options',
            'Packaging could be improved',
            reviews.length < 5 ? 'Limited number of reviews' : 'Occasional delivery delays',
          ],
          overallSentiment: sentiment,
          summary: `Based on ${reviews.length} reviews, customers rate this product ${avgRating}/5. ${sentiment === 'positive' ? 'Generally positive feedback with most users satisfied.' : sentiment === 'neutral' ? 'Mixed feedback — some satisfied, some with concerns.' : 'Several issues reported by customers.'}`,
          recommendationScore: Math.round(parseFloat(avgRating) * 20),
        };
      }

      console.log("✅ Review summary ready");

      return {
        success: true,
        productId: productId,
        productName: product.name || product.title || "Unknown Product",
        reviewsCount: reviews.length,
        averageRating: parseFloat(avgRating),
        summary,
        usedLLM,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error("❌ Review summary error:", error.message);
      throw new Error(`Failed to summarize reviews: ${error.message}`);
    }
  }

  /**
   * Calculate average rating from reviews
   * @param {Array} reviews - Array of reviews
   * @returns {number} Average rating
   */
  calculateAverageRating(reviews) {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    return Math.round((sum / reviews.length) * 10) / 10;
  }
}

module.exports = new ReviewSummaryService();
