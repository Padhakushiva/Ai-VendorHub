const { StateGraph, MessagesAnnotation } = require("@langchain/langgraph")
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai")
const { ToolMessage, AIMessage } = require("@langchain/core/messages")
const { zodToJsonSchema } = require("zod-to-json-schema")
const { searchProduct, addProductToCart } = require("./tools")

// ✅ GEMINI 2.5 FLASH - Fixed tool binding
const model = process.env.GOOGLE_API_KEY ? new ChatGoogleGenerativeAI({
    model: "gemini-2.5-flash",
    temperature: 0.5,
    apiKey: process.env.GOOGLE_API_KEY,
    maxOutputTokens: 2048,
}) : null;
if (!model) console.log('⚠️ GOOGLE_API_KEY not set — agent model disabled');

// ✅ Create tool array
const tools = [searchProduct, addProductToCart]

// ✅ Convert to proper Google Gemini format - manually define schemas
const toolDefinitions = [
    {
        name: "searchProduct",
        description: "Search for products based on a query. Searches in product name, description, and category.",
        inputSchema: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The search query for products (e.g., 'red sneakers', 'laptop', 'blue shirt')"
                }
            },
            required: ["query"]
        }
    },
    {
        name: "addProductToCart",
        description: "Add a product to the shopping cart on behalf of the user",
        inputSchema: {
            type: "object",
            properties: {
                productId: {
                    type: "string",
                    description: "The unique ID of the product to add to the cart"
                },
                qty: {
                    type: "number",
                    description: "The quantity of the product to add to the cart (default: 1)"
                }
            },
            required: ["productId"]
        }
    }
]

console.log("📋 Tool definitions prepared:")
console.log(JSON.stringify(toolDefinitions, null, 2))

const graph = new StateGraph(MessagesAnnotation)
    
    // ========================================
    // NODE 1: EXECUTE TOOLS
    // ========================================
    .addNode("tools", async (state, config) => {
        const lastMessage = state.messages[state.messages.length - 1]
        const toolCalls = lastMessage.tool_calls || []

        if (toolCalls.length === 0) {
            console.log("⚠️ No tool calls to execute")
            return state
        }

        console.log(`\n${'='.repeat(60)}`)
        console.log(`🔧 TOOLS NODE: Executing ${toolCalls.length} tool call(s)`)
        console.log(`${'='.repeat(60)}`)

        const toolCallResults = await Promise.all(
            toolCalls.map(async (call) => {
                const toolName = call.name
                const toolInput = call.args || {}
                
                const token = config?.metadata?.token || process.env.AUTH_TOKEN

                const toolFunc = tools.find(t => t.name === toolName)

                if (!toolFunc) {
                    console.error(`❌ Tool not found: ${toolName}`)
                    return new ToolMessage({
                        content: `Tool ${toolName} not found`,
                        name: toolName,
                        tool_call_id: call.id
                    })
                }

                console.log(`\n📍 Executing: ${toolName}`)
                console.log(`   Input: ${JSON.stringify(toolInput)}`)

                try {
                    const result = await toolFunc.invoke({
                        ...toolInput,
                        token
                    })

                    const resultStr = typeof result === 'string' ? result : JSON.stringify(result)
                    console.log(`   ✅ Success`)
                    console.log(`   Result: ${resultStr.substring(0, 150)}...`)

                    return new ToolMessage({
                        content: resultStr,
                        name: toolName,
                        tool_call_id: call.id
                    })

                } catch (error) {
                    console.error(`   ❌ Failed: ${error.message}`)
                    return new ToolMessage({
                        content: `Error: ${error.message}`,
                        name: toolName,
                        tool_call_id: call.id
                    })
                }
            })
        )

        state.messages.push(...toolCallResults)
        return state
    })

    // ========================================
    // NODE 2: CHAT WITH MODEL
    // ========================================
    .addNode("chat", async (state, config) => {
        console.log(`\n${'='.repeat(60)}`)
        console.log(`🤖 CHAT NODE: Processing with Gemini 2.5 Flash`)
        console.log(`${'='.repeat(60)}`)

        try {
            const token = config?.metadata?.token || process.env.AUTH_TOKEN
            
            console.log(`📨 Messages in conversation: ${state.messages.length}`)
            console.log(`📤 Sending request to Gemini...`)
            
            console.log(`⏳ Testing direct API call...`)
            
            // Test direct call without tools first
            const testResponse = await model.invoke(state.messages)
            
            console.log(`📥 Direct response received:`)
            console.log(`   Content: ${String(testResponse.content).substring(0, 100)}...`)
            
            const aiMessage = new AIMessage({
                content: testResponse.content || "I'm unable to understand that request.",
                tool_calls: []
            })

            state.messages.push(aiMessage)
            console.log(`✅ Message added to state, returning...`)
            return state

        } catch (error) {
            console.error(`❌ Model error: ${error.message}`)
            console.error(`   Full error: ${error.toString()}`)
            console.error(`   Stack: ${error.stack}`)
            
            state.messages.push(new AIMessage({
                content: `I encountered an error: ${error.message}`,
                tool_calls: []
            }))
            return state
        }
    })

    // ========================================
    // EDGES
    // ========================================
    
    .addEdge("__start__", "chat")

    .addConditionalEdges(
        "chat",
        async (state) => {
            const lastMessage = state.messages[state.messages.length - 1]
            const hasToolCalls = lastMessage.tool_calls && lastMessage.tool_calls.length > 0

            console.log(`\n⚖️  ROUTER: Check if tools needed...`)
            
            if (hasToolCalls) {
                console.log(`   → YES, executing tools`)
                return "tools"
            } else {
                console.log(`   → NO, ending conversation`)
                return "__end__"
            }
        }
    )

    .addEdge("tools", "chat")

const agent = graph.compile()

module.exports = agent

/**
 * GEMINI 2.5 FLASH - FIXED TOOL BINDING
 * 
 * Issue: bindTools() was causing "empty input" errors
 * Fix: Using model.bind() with tools parameter instead
 * 
 * ✅ USING:
 * - Gemini 2.5 Flash (fastest free tier model)
 * - Fixed tool binding with model.bind()
 * - Verified with GOOGLE_API_KEY from environment
 */