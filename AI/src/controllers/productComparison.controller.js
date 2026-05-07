const productComparisonService = require('../services/productComparison.service');

/**
 * POST /ai/compare
 * Body: { productIds: ["id1", "id2", ...] }
 */
exports.compareProducts = async (req, res) => {
  try {
    const { productIds } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!productIds || !Array.isArray(productIds) || productIds.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'productIds array with at least 2 IDs is required',
      });
    }

    const result = await productComparisonService.compareProducts(productIds, token);
    res.status(200).json(result);
  } catch (error) {
    console.error('Product Comparison Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to compare products',
    });
  }
};
