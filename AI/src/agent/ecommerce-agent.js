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
            model: "gemini-2.5-flash",
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
            const token = config?.metadata?.token || process.env.AUTH_TOKEN
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
                    let noMatchText = `Sorry, I couldn't find any products matching "${userQuery}" in our database.\n\nHowever, we do have some other great items you might like:\n\n`;
                    products.slice(0, 5).forEach((p, idx) => {
                        noMatchText += `${idx + 1}. **${p.title}** - ₹${p.price?.amount || 0}\n`;
                    });
                    noMatchText += `\nWould you like to explore any of these?`;
                    
                    state.messages.push(new AIMessage({
                        content: noMatchText,
                        tool_calls: []
                    }))
                    return state;
                }
            }

            if (products.length === 0) {
                console.log(`⚠️ No products found for "${keyword || 'any'}"`)
                state.messages.push(new AIMessage({
                    content: `Sorry, I couldn't find products matching "${userQuery}". Try different keywords or broader filters.\n\nSome tips:\n• Use simpler terms (e.g., "phone" instead of specific model)\n• Adjust your price range\n• Try browsing categories\n\nHow else can I help you?`,
                    tool_calls: []
                }))
                return state
            }

            console.log(`✅ Found ${products.length} products`)

            // Format products for display
            let responseText = `Found ${products.length} product${products.length > 1 ? 's' : ''} matching your search:\n\n`

            products.forEach((p, idx) => {
                responseText += `${idx + 1}. **${p.title}**\n`
                responseText += `   💰 Price: ₹${p.price?.amount || 0} (${p.price?.currency || 'INR'})\n`
                responseText += `   📦 Stock: ${p.stock} units\n`
                if (p.description) {
                    responseText += `   📝 ${p.description.substring(0, 100)}...\n`
                }
                responseText += `\n`
            })

            responseText += `\nWould you like more details or want to refine your search?`

            console.log(`✅ Response ready`)

            state.messages.push(new AIMessage({
                content: responseText,
                tool_calls: []
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

        const token = config?.metadata?.token || process.env.AUTH_TOKEN

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
                    const result = await toolFunc.invoke({
                        ...toolInput,
                        token,
                    })
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
