const agent = require('./agent');
const { HumanMessage } = require('@langchain/core/messages');

async function runAgent() {
    try {
        console.log("🤖 Agent start ho raha hai...\n");

        const result = await agent.invoke({
            messages: [new HumanMessage("Mujhe laptop search karo")]
        });

        console.log("✅ Agent Response:\n");
        result.messages.forEach((msg, index) => {
            console.log(`${index}. ${msg.constructor.name}:`);
            console.log(`   Content: ${msg.content}`);
            if (msg.tool_calls) {
                console.log(`   Tool Calls:`, msg.tool_calls);
            }
            console.log();
        });

    } catch (error) {
        console.error("❌ Error:", error.message);
    }
}

runAgent();