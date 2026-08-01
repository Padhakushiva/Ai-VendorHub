const ecommerceAgent = require('../agent/ecommerce-agent');
const { HumanMessage } = require('@langchain/core/messages');

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

    // Invoke LangGraph Agent
    const agentResponse = await ecommerceAgent.invoke({
        messages: [new HumanMessage(message)]
    }, {
        configurable: { metadata: { token } }
    });

    // Extract the final conversational reply
    const finalMessage = agentResponse.messages[agentResponse.messages.length - 1];
    let reply = finalMessage.content;

    // Extract products from ToolMessages (LLM path) or additional_kwargs (fallback path)
    let extractedProducts = [];
    try {
        // Check ToolMessages first (from LLM tool-calling path)
        for (const msg of agentResponse.messages) {
            if (msg.name === 'searchProducts' || msg.name === 'getProductRecommendations' || msg.name === 'getSimilarProducts') {
                const toolOutput = JSON.parse(msg.content);
                if (toolOutput.products) extractedProducts = toolOutput.products;
                else if (toolOutput.recommendations) extractedProducts = toolOutput.recommendations;
                else if (toolOutput.similarProducts) extractedProducts = toolOutput.similarProducts;
            }
        }
        // If no products from tools, check the final AIMessage's additional_kwargs (from fallback path)
        if (extractedProducts.length === 0 && finalMessage.additional_kwargs?.products) {
            extractedProducts = finalMessage.additional_kwargs.products;
        }
    } catch (e) {
        console.warn("Could not extract products from agent response", e.message);
    }

    res.status(200).json({
        success: true,
        reply: reply,
        products: extractedProducts,
        message: message,
        totalFound: extractedProducts.length
    });
  } catch (error) {
    console.error('Conversational Shopping Error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to process message',
    });
  }
};
