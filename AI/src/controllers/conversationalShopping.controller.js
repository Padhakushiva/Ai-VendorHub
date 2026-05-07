const conversationalShoppingService = require('../services/conversationalShopping.service');

/**
 * POST /ai/chat
 * Body: { message: "suggest products for coding", sessionId: "optional" }
 */
exports.chat = async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    const result = await conversationalShoppingService.chat(
      message.trim(),
      sessionId || null,
      token
    );
    res.status(200).json(result);
  } catch (error) {
    console.error('Conversational Shopping Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process message',
    });
  }
};
