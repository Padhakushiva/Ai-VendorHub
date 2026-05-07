const smartBudgetService = require('../services/smartBudget.service');

/**
 * POST /ai/smart-budget
 * Body: { budget: 5000, purpose: "gaming setup" }
 */
exports.optimizeBudget = async (req, res) => {
  try {
    const { budget, purpose } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!budget || isNaN(Number(budget)) || Number(budget) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'A valid budget amount (number > 0) is required',
      });
    }

    if (!purpose || typeof purpose !== 'string' || purpose.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Purpose is required (e.g., "gaming setup", "study desk")',
      });
    }

    const result = await smartBudgetService.optimizeBudget(
      Number(budget),
      purpose.trim(),
      token
    );
    res.status(200).json(result);
  } catch (error) {
    console.error('Smart Budget Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to optimize budget',
    });
  }
};
