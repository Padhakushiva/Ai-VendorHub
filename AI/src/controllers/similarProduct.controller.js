const similarProductService = require('../services/similarProduct.service');

/**
 * GET /ai/similar/:productId
 */
exports.getSimilarProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const token = req.headers.authorization?.split(' ')[1];

    if (!productId) {
      return res.status(400).json({ success: false, message: 'Product ID is required' });
    }

    const result = await similarProductService.getSimilarProducts(productId, token);
    res.status(result.success === false ? 404 : 200).json(result);
  } catch (error) {
    console.error('Similar Products Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to find similar products',
    });
  }
};
