const moodShoppingService = require('../services/moodShopping.service');

/**
 * POST /ai/mood-shopping
 * Body: { mood: "minimal desk setup", maxBudget: 5000 }
 */
exports.getMoodProducts = async (req, res) => {
  try {
    const { mood, maxBudget } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!mood || typeof mood !== 'string' || mood.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Mood/intent is required (e.g., "minimal desk setup", "gaming aesthetic")',
      });
    }

    const result = await moodShoppingService.getMoodProducts(
      mood.trim(),
      maxBudget ? Number(maxBudget) : null,
      token
    );
    res.status(200).json(result);
  } catch (error) {
    console.error('Mood Shopping Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get mood-based products',
    });
  }
};
