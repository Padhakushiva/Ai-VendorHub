const reviewSummaryService = require('../services/reviewSummary.service');

/**
 * Summarize reviews for a product
 * POST /ai/review-summary/:productId
 */
exports.summarizeReviews = async (req, res) => {
  try {
    const { productId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];

    if (!productId) {
      return res.status(400).json({
        success: false,
        message: 'Product ID is required',
      });
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required',
      });
    }

    const result = await reviewSummaryService.summarizeReviews(productId, token);

    res.status(200).json(result);
  } catch (error) {
    console.error('Review Summary Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to summarize reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
