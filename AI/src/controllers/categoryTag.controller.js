const categoryTagService = require('../services/categoryTag.service');

/**
 * Suggest category, subcategory, and tags for a product
 * POST /ai/suggest-category-tags
 */
exports.suggestCategoryAndTags = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Product title is required',
      });
    }

    const result = await categoryTagService.suggestCategoryAndTags({
      title,
      description,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Category Tag Suggestion Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to suggest categories and tags',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
