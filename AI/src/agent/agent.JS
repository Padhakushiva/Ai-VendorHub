const { StateGraph, MessagesAnnotation } = require("@langchain/langgraph")
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai")
const { ToolMessage, AIMessage, HumanMessage } = require("@langchain/core/messages")
const tools = require("./tools")    


const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash",
    temperature: 0.5,
})


const graph = new StateGraph(MessagesAnnotation)
    .addNode("tools", async (state, config) => {

        const lastMessage = state.messages[ state.messages.length - 1 ]

        const toolsCall = lastMessage.tool_calls

        const toolCallResults = await Promise.all(toolsCall.map(async (call) => {

            const tool = tools[ call.name ]
            if (!tool) {
                throw new Error(`Tool ${call.name} not found`)
            }
            const toolInput = call.args

            console.log("🔧 Invoking tool:", call.name, "with input:", JSON.stringify(call, null, 2))

            try {
                const toolResult = await tool.func({ ...toolInput, token: config.metadata.token })
                console.log("✅ Tool result:", toolResult.substring(0, 100) + (toolResult.length > 100 ? '...' : ''))
                return new ToolMessage({ content: toolResult, name: call.name })
            } catch (error) {
                console.error(`❌ Tool execution error for ${call.name}:`, error.message)
                const errorMessage = `Tool ${call.name} failed: ${error.message}`
                return new ToolMessage({ content: errorMessage, name: call.name })
            }

        }))

        state.messages.push(...toolCallResults)

        return state
    })
    .addNode("chat", async (state, config) => {
        try {
            const response = await model.invoke(state.messages, { tools: [ tools.searchProduct, tools.addProductToCart ] })

            state.messages.push(new AIMessage({ content: response.text, tool_calls: response.tool_calls }))

            return state
        } catch (error) {
            console.error("❌ Model invocation error:", error.message)
            throw error
        }

    })
    .addEdge("__start__", "chat")
    .addConditionalEdges("chat", async (state) => {

        const lastMessage = state.messages[ state.messages.length - 1 ]

        if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
            return "tools"
        } else {
            return "__end__"
        }

    })
    .addEdge("tools", "chat")



const agent = graph.compile()


module.exports = agent






