const descriptionService = require('../services/description.service');

/**
 * Generate product description with bullet points and tags
 * POST /ai/generate-description
 */
exports.generateDescription = async (req, res) => {
  try {
    const { title, category, basicDescription, price } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        message: 'Product title is required',
      });
    }

    const result = await descriptionService.generateDescription({
      title,
      category,
      basicDescription,
      price,
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Description Generation Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate description',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
