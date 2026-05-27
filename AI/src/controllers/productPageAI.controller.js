const productPageAIService = require("../services/productPageAI.service");

exports.getProductAI = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1] || req.cookies?.token;
    const result = await productPageAIService.getProductAI(req.params.productId, token);
    return res.status(result.success ? 200 : 404).json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to generate product AI panel",
    });
  }
};
