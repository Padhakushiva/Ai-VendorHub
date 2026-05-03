const agent = require('./agent');
const { HumanMessage } = require('@langchain/core/messages');

// NOTE: This test requires a valid JWT token from the Auth Service
// Get a token by:
// 1. Running Auth service on port 3001
// 2. Call POST /api/auth/register with user credentials
// 3. Call POST /api/auth/login to get JWT token
// 4. Replace VALID_JWT_TOKEN below with the actual token

async function runAgent() {
    try {
        // Replace this with a valid JWT token obtained from Auth Service
        const VALID_JWT_TOKEN = process.env.TEST_JWT_TOKEN || 'your-valid-jwt-token-here';

        if (VALID_JWT_TOKEN === 'your-valid-jwt-token-here') {
            console.log('❌ Error: No valid JWT token provided');
            console.log('\nHow to get a token:');
            console.log('1. Start Auth service: cd Auth && npm start');
            console.log('2. Register/Login to get JWT token');
            console.log('3. Set TEST_JWT_TOKEN=<your-token> npm test');
            console.log('\nAlternatively, update VALID_JWT_TOKEN in this file directly.');
            return;
        }

        console.log("🤖 Agent starting...\n");
        console.log("📝 Query: 'Mujhe laptop search karo'\n");

        const result = await agent.invoke(
            {
                messages: [new HumanMessage("Mujhe laptop search karo")]
            },
            {
                configurable: {
                    metadata: {
                        token: VALID_JWT_TOKEN
                    }
                }
            }
        );

        console.log("✅ Agent Response:\n");
        result.messages.forEach((msg, index) => {
            console.log(`${index}. ${msg.constructor.name}:`);
            console.log(`   Content: ${msg.content}`);
            if (msg.tool_calls) {
                console.log(`   Tool Calls:`, JSON.stringify(msg.tool_calls, null, 2));
            }
            console.log();
        });

    } catch (error) {
        console.error("❌ Error:", error.message);
        console.error("\nNote: Ensure all services are running:");
        console.error("  - Auth Service on port 3001");
        console.error("  - Product Service on port 3000");
        console.error("  - Cart Service on port 3002");
        console.error("  - AI Service on port 3005");
    }
}

runAgent();