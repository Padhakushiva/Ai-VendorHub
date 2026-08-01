const { StateGraph, MessagesAnnotation } = require("@langchain/langgraph")
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai")
const { SystemMessage, HumanMessage, ToolMessage, AIMessage } = require("@langchain/core/messages")
const { searchProducts, getProductRecommendations, getSimilarProducts } = require("./ecommerce-tools")
const axios = require("axios")
const featureFlags = require("../utils/featureFlags")
const CircuitBreaker = require("../utils/circuitBreaker")
const llmMetrics = require("../utils/llmMetrics")
const { parseQuery, STOP_WORDS } = require("../utils/queryParser")
const { getPrompt } = require("../services/prompt.service")
const { classifyMarketplaceRequest, buildScopeMessage } = require("../utils/domainGuard")

// ✅ GEMINI MODEL (guarded by feature flag and API key)
let model = null;
let modelWithTools = null;

if (process.env.GOOGLE_API_KEY) {
    try {
        model = new ChatGoogleGenerativeAI({
            model: "gemini-flash-latest",
            temperature: 0.5,
            apiKey: process.env.GOOGLE_API_KEY,
            maxOutputTokens: 2048,
        });
        console.log('✅ Ecommerce Agent: Gemini model initialized');

        // Bind tools to model for structured tool calling
        const tools = [searchProducts, getProductRecommendations, getSimilarProducts]
        try {
            modelWithTools = model.bindTools(tools);
            console.log('✅ Ecommerce Agent: Tools bound to model successfully');
        } catch (bindErr) {
            console.warn('⚠️ Tool binding failed, will use direct API calls:', bindErr.message);
            modelWithTools = null;
        }
    } catch (err) {
        console.error('❌ Ecommerce Agent: Model init failed:', err.message);
    }
} else {
    console.log('⚠️ GOOGLE_API_KEY not set — ecommerce agent model disabled');
}

// Circuit breaker for agent LLM calls
const agentCircuitBreaker = new CircuitBreaker({
    name: 'Agent-LLM',
    failureThreshold: 3,
    resetTimeoutMs: 30000,
    callTimeoutMs: 15000,
});

const tools = [searchProducts, getProductRecommendations, getSimilarProducts]

// Tool name → tool function map
const toolMap = {
    searchProducts,
    getProductRecommendations,
    getSimilarProducts,
}

// ✅ ECOMMERCE SYSTEM PROMPT - Constrains AI to only answer product-related queries
const ECOMMERCE_SYSTEM_PROMPT = getPrompt("ecommerceAgentSystem")

    // No longer using hardcoded keywords - trusting the LLM to handle intent natively

console.log("📋 E-commerce Tools Ready:")
console.log("  ✅ Search Products")
console.log("  ✅ Get Recommendations")
console.log("  ✅ Similar Products")

/**
 * Helper: Try to get a natural AI response from the LLM.
 * If the LLM is unavailable or rate-limited, return a simple formatted fallback.
 */
async function _tryLLMReply(llmModel, userQuery, products, altProductsText, isNotFoundWithAlternatives) {
    // Build context
    let productContext = '';
    if (products.length > 0) {
        productContext = products.map((p, i) => 
            `${i+1}. ${p.title} - ₹${p.price} (${p.currency}) | Stock: ${p.stock} | ${p.description}`
        ).join('\n');
    } else if (altProductsText) {
        productContext = altProductsText;
    }

    const replyPrompt = isNotFoundWithAlternatives
        ? `You are a friendly AI shopping assistant for Ai-VendorHub marketplace.
The customer asked: "${userQuery}"
Unfortunately, no products matching their exact request were found. However, we have these other products available:
${productContext}

Generate a warm, natural, conversational reply:
- Acknowledge that the specific item they asked for is not currently available
- Briefly mention the alternatives we do have and ask if they'd like to explore them
- Keep it concise (under 80 words), friendly, and natural
- Do NOT use markdown formatting (no **, *, bullets, headings)
- Do NOT mention APIs, databases, services, or technical details`
        : products.length > 0
        ? `You are a friendly AI shopping assistant for Ai-VendorHub marketplace.
The customer asked: "${userQuery}"
Here are the real products from our catalog:
${productContext}

Generate a warm, natural, conversational reply:
- Mention the top picks with their prices naturally in your sentences
- If one product stands out as the best match, highlight it and explain why
- Keep it concise (under 100 words), friendly, and natural
- Do NOT use markdown formatting (no **, *, bullets, headings)
- Do NOT list products in a numbered/bulleted format - weave them into natural conversation
- Do NOT mention APIs, databases, services, or technical details`
        : `You are a friendly AI shopping assistant for Ai-VendorHub marketplace.
The customer asked: "${userQuery}"
No products matching their request were found in our catalog.

Generate a warm, natural, conversational reply:
- Let them know we don't have that item right now
- Suggest they try different keywords or browse other categories
- Keep it concise (under 50 words), friendly, and natural
- Do NOT use markdown formatting (no **, *, bullets, headings)`;

    // Try LLM
    if (llmModel) {
        try {
            console.log('🤖 Fallback path: Attempting LLM natural reply...');
            const response = await llmModel.invoke([new SystemMessage(replyPrompt), new HumanMessage(userQuery)]);
            console.log('✅ Fallback path: LLM natural reply generated');
            return response.content;
        } catch (err) {
            console.warn(`⚠️ Fallback path: LLM reply also failed (${err.message}). Using simple format.`);
        }
    }

    // Ultimate fallback: simple formatted text (no LLM available at all)
    if (isNotFoundWithAlternatives) {
        return `Sorry, I couldn't find "${userQuery}" in our current catalog. But we do have some other great products you might like! Would you like me to show you what's available?`;
    }
    if (products.length > 0) {
        const topProduct = products[0];
        return `I found ${products.length} product${products.length > 1 ? 's' : ''} for you! The top match is ${topProduct.title} at ₹${topProduct.price}. Would you like more details on any of these?`;
    }
    return `Sorry, I couldn't find any products matching "${userQuery}" right now. Try searching with different keywords or browse our categories!`;
}

const graph = new StateGraph(MessagesAnnotation)

    // ========================================
    // NODE 1: INTENT DETECTION & VALIDATION
    // ========================================
    .addNode("intent_check", async (state, config) => {
        // Intent check is now handled implicitly by the Langchain model using the system prompt.
        // We pass all queries to the chat node to provide a truly AI-driven experience
        // rather than relying on hardcoded keyword arrays.
        return state
    })

    // ========================================
    // NODE 2: CHAT WITH MODEL & TOOL CALLING
    // ========================================
    .addNode("chat", async (state, config) => {
        console.log(`\n${'='.repeat(60)}`)
        console.log(`🤖 CHAT NODE: Processing query`)
        console.log(`${'='.repeat(60)}`)

        try {
            const token = config?.configurable?.metadata?.token || config?.metadata?.token || process.env.AUTH_TOKEN
            const userQuery = state.messages[0].content

            console.log(`📝 Query: "${userQuery}"`)

            const classification = await classifyMarketplaceRequest(userQuery)
            if (!classification.allowed) {
                state.messages.push(new AIMessage({
                    content: buildScopeMessage(classification),
                    tool_calls: []
                }))
                return state
            }

            // ─── Path A: Use LLM with tool calling ───
            if (modelWithTools && featureFlags.isEnabled('LLM_AGENT_TOOLS')) {
                try {
                    console.log('🤖 Using Gemini with tool calling...')
                    const startTime = Date.now()

                    const response = await agentCircuitBreaker.execute(async () => {
                        const messages = [
                            new SystemMessage(ECOMMERCE_SYSTEM_PROMPT),
                            ...state.messages,
                        ]
                        return await modelWithTools.invoke(messages)
                    })

                    console.log(`📥 LLM Response received in ${Date.now() - startTime}ms`)

                    llmMetrics.record({
                        endpoint: 'agent-chat',
                        success: true,
                        latencyMs: Date.now() - startTime,
                    })

                    // If the model wants to call tools, add the response and let the tools node handle it
                    if (response.tool_calls && response.tool_calls.length > 0) {
                        console.log(`🔧 Model requested ${response.tool_calls.length} tool call(s)`)
                        state.messages.push(response)
                        return state
                    }

                    // Otherwise, it's a direct text response
                    const aiMessage = new AIMessage({
                        content: response.content || "I'm unable to process that request right now.",
                        tool_calls: [],
                    })
                    state.messages.push(aiMessage)
                    return state

                } catch (llmErr) {
                    console.warn(`⚠️ LLM tool calling failed: ${llmErr.message}. Falling back to direct search.`)
                    llmMetrics.record({
                        endpoint: 'agent-chat',
                        success: false,
                        latencyMs: Date.now() - Date.now(),
                        error: llmErr.message,
                        usedFallback: true,
                    })
                    // Fall through to Path B
                }
            }

            // ─── Path B: Direct product API search (fallback) ───
            console.log('📋 Using direct product search (fallback path)')

            // Use advanced query parser for keyword extraction
            const parsed = parseQuery(userQuery)
            const keywords = parsed.keywords
            const keyword = keywords.length > 0 ? keywords.join(' ') : ''

            console.log(`🔑 Extracted keywords: [${keywords.join(', ')}]`)

            // Build the search URL
            const productServiceUrl = process.env.PRODUCT_SERVICE_URL || 'http://localhost:3000'
            let searchUrl = `${productServiceUrl}/api/product?limit=10`
            if (keyword) {
                searchUrl += `&q=${encodeURIComponent(keyword)}`
            }
            if (parsed.priceRange?.max) {
                searchUrl += `&maxPrice=${parsed.priceRange.max}`
            }
            if (parsed.priceRange?.min) {
                searchUrl += `&minPrice=${parsed.priceRange.min}`
            }
            if (parsed.category) {
                searchUrl += `&category=${encodeURIComponent(parsed.category)}`
            }

            console.log(`📡 Fetching from: ${searchUrl}`)
            let response = await axios.get(searchUrl, {
                headers: { Authorization: `Bearer ${token}` },
                timeout: 5000
            })
            
            let products = response.data.data || response.data.products || []

            // If no products found with strict keyword, but we have a category, try category only
            if (products.length === 0 && parsed.category) {
                console.log(`⚠️ No products found with keyword "${keyword}". Retrying with category "${parsed.category}" only...`)
                let fallbackUrl = `${productServiceUrl}/api/product?limit=10&category=${encodeURIComponent(parsed.category)}`
                if (parsed.priceRange?.max) fallbackUrl += `&maxPrice=${parsed.priceRange.max}`
                if (parsed.priceRange?.min) fallbackUrl += `&minPrice=${parsed.priceRange.min}`
                
                response = await axios.get(fallbackUrl, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 5000
                })
                products = response.data.data || response.data.products || []
            }
            
            let broadSearchUsed = false;
            // SMART FALLBACK: If everything failed, fetch broadly and let the LLM filter semantically
            if (products.length === 0) {
                broadSearchUsed = true;
                console.log(`⚠️ Still 0 products. Doing a broad search for local filtering...`)
                let broadUrl = `${productServiceUrl}/api/product?limit=20`
                if (parsed.priceRange?.max) broadUrl += `&maxPrice=${parsed.priceRange.max}`
                if (parsed.priceRange?.min) broadUrl += `&minPrice=${parsed.priceRange.min}`
                
                response = await axios.get(broadUrl, {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 5000
                })
                products = response.data.data || response.data.products || []
            }

            // In-memory smart filtering using synonyms
            if (products.length > 0 && keywords.length > 0) {
                const { expandSynonyms } = require("../utils/queryParser");
                const targetWords = keywords.flatMap(k => expandSynonyms(k));
                
                const matchedProducts = products.filter(p => {
                    const text = `${p.title} ${p.description} ${p.category} ${(p.tags||[]).join(' ')}`.toLowerCase();
                    return targetWords.some(w => text.includes(w.toLowerCase()));
                });

                if (matchedProducts.length > 0) {
                    products = matchedProducts; // We found actual matches
                } else {
                    // No products match the requested keyword in our broad/category search
                    console.log(`⚠️ Fallback search yielded products, but none matched keywords: [${targetWords.join(', ')}]`);
                    // Try LLM to generate a natural "not found but here are alternatives" response
                    const altProductInfo = products.slice(0, 5).map((p, i) => `${i+1}. ${p.title} - ₹${p.price?.amount || 0}`).join('\n');
                    const fallbackReply = await _tryLLMReply(model, userQuery, [], altProductInfo, true);
                    state.messages.push(new AIMessage({ content: fallbackReply, tool_calls: [] }));
                    return state;
                }
            }

            if (products.length === 0) {
                console.log(`⚠️ No products found for "${keyword || 'any'}"`)
                const emptyReply = await _tryLLMReply(model, userQuery, [], '', false);
                state.messages.push(new AIMessage({ content: emptyReply, tool_calls: [] }));
                return state
            }

            console.log(`✅ Found ${products.length} products`)

            // Build product info for LLM context
            const productInfo = products.map((p, i) => ({
                _id: p._id,
                title: p.title,
                price: p.price || { amount: 0, currency: 'INR' },
                stock: p.stock || 0,
                images: p.images || [],
                category: p.category || '',
                description: (p.description || '').substring(0, 120)
            }));

            // Build a simpler list for the LLM prompt
            const llmProductList = productInfo.map(p => ({
                title: p.title,
                price: p.price?.amount || 0,
                currency: p.price?.currency || 'INR',
                stock: p.stock,
                description: p.description
            }));

            // Try to get a natural AI response from LLM
            const naturalReply = await _tryLLMReply(model, userQuery, llmProductList, '', false);

            console.log(`✅ Response ready`)

            state.messages.push(new AIMessage({
                content: naturalReply,
                tool_calls: [],
                additional_kwargs: { products: productInfo }
            }))
            return state

        } catch (error) {
            console.error(`❌ Error: ${error.message}`)

            state.messages.push(new AIMessage({
                content: `Sorry, I encountered an error accessing the product database: ${error.message}\n\nPlease try again.`,
                tool_calls: []
            }))
            return state
        }
    })

    // ========================================
    // NODE 3: EXECUTE TOOLS
    // ========================================
    .addNode("tools", async (state, config) => {
        console.log(`\n${'='.repeat(60)}`)
        console.log(`🔧 TOOLS NODE: Executing tool calls`)
        console.log(`${'='.repeat(60)}`)

        const lastMessage = state.messages[state.messages.length - 1]
        const toolCalls = lastMessage.tool_calls || []

        if (toolCalls.length === 0) {
            console.log("⚠️ No tool calls to execute")
            return state
        }

        const token = config?.configurable?.metadata?.token || config?.metadata?.token || process.env.AUTH_TOKEN

        const toolResults = await Promise.all(
            toolCalls.map(async (call) => {
                const toolName = call.name
                const toolInput = call.args || {}

                console.log(`\n📍 Executing tool: ${toolName}`)
                console.log(`   Input: ${JSON.stringify(toolInput)}`)

                const toolFunc = toolMap[toolName]

                if (!toolFunc) {
                    console.error(`❌ Tool not found: ${toolName}`)
                    return new ToolMessage({
                        content: `Tool "${toolName}" not found`,
                        name: toolName,
                        tool_call_id: call.id,
                    })
                }

                try {
                    const result = await toolFunc.invoke(
                        toolInput,
                        { configurable: { token } }
                    )
                    const resultStr = typeof result === 'string' ? result : JSON.stringify(result)
                    console.log(`   ✅ Success: ${resultStr.substring(0, 150)}...`)

                    return new ToolMessage({
                        content: resultStr,
                        name: toolName,
                        tool_call_id: call.id,
                    })
                } catch (error) {
                    console.error(`   ❌ Failed: ${error.message}`)
                    return new ToolMessage({
                        content: `Error: ${error.message}`,
                        name: toolName,
                        tool_call_id: call.id,
                    })
                }
            })
        )

        state.messages.push(...toolResults)
        return state
    })

    // ========================================
    // EDGES & ROUTING
    // ========================================
    .addEdge("__start__", "intent_check")

    .addConditionalEdges(
        "intent_check",
        async (state) => {
            const lastMessage = state.messages[state.messages.length - 1]

            // If last message is an AIMessage from intent check (rejection), end
            if (lastMessage instanceof AIMessage && lastMessage.content.includes("E-commerce Shopping Assistant")) {
                return "__end__"
            }

            // Otherwise, proceed to chat
            return "chat"
        }
    )

    .addConditionalEdges(
        "chat",
        async (state) => {
            const lastMessage = state.messages[state.messages.length - 1]
            const hasToolCalls = lastMessage.tool_calls && lastMessage.tool_calls.length > 0

            if (hasToolCalls) {
                console.log(`   → Tool calls detected, routing to tools node`)
                return "tools"
            }
            console.log(`   → No tool calls, ending`)
            return "__end__"
        }
    )

    // After tools execute, go back to chat for the model to process results
    .addEdge("tools", "chat")

const agent = graph.compile()

module.exports = agent

/**
 * ============================================================
 * E-COMMERCE AI AGENT — v3 (Hardened)
 * ============================================================
 *
 * Features:
 * ✅ AI Smart Search with LangChain tool calling (re-enabled)
 * ✅ Circuit breaker protects against Gemini hangs
 * ✅ Graceful fallback to direct API search when LLM fails
 * ✅ Advanced query parser with multi-keyword extraction
 * ✅ Feature flag toggle for LLM features
 * ✅ Intent detection blocks non-ecommerce queries
 * ✅ Metrics tracking for all LLM calls
 *
 * Flow:
 *   __start__ → intent_check → chat ↔ tools → __end__
 */
