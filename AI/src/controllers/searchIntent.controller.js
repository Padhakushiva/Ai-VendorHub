const searchIntentService = require('../services/searchIntent.service');

/**
 * Generate search intent from natural language query
 * POST /ai/search-intent
 */
exports.generateSearchIntent = async (req, res) => {
  try {
    const { query } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required',
      });
    }

    const result = await searchIntentService.generateSearchIntent(query, token);

    res.status(200).json(result);
  } catch (error) {
    console.error('Search Intent Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate search intent',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
