const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { HumanMessage } = require('@langchain/core/messages');

async function initSocketServer(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || "*",
            methods: ["GET", "POST"]
        }
    });

    io.use((socket, next) => {
        const cookieHeader = socket.handshake.headers.cookie || '';
        const cookies = cookie.parse(cookieHeader);
        const { token } = cookies;

        if (!token) {
            console.log("❌ Authentication failed: No token provided");
            return next(new Error('Authentication error: No token provided'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            socket.token = token;
            console.log("✅ User authenticated:", decoded.userId || decoded.id);
            next();
        } catch (err) {
            console.log("❌ Authentication failed: Invalid token -", err.message);
            return next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`\n👤 Client connected: ${socket.id}`);
        console.log(`📝 User Info:`, socket.user);

        socket.on('message', async (data) => {
            try {
                console.log(`\n💬 Message from user: "${data}"`);
                
                // Lazy load agent only when needed
                const agent = require('../agent/agent');

                const agentResponse = await agent.invoke(
                    {
                        messages: [new HumanMessage(data)]  // ✅ Use HumanMessage
                    },
                    {
                        configurable: {
                            metadata: {
                                token: socket.token
                            }
                        }
                    }
                );

                console.log("✅ Agent processing completed");

                // Extract the final response message
                const finalMessage = agentResponse.messages[agentResponse.messages.length - 1];
                const responseText = finalMessage.content;

                // Optional: Send response back to client
                socket.emit('response', { 
                    success: true, 
                    message: responseText,
                    timestamp: new Date().toISOString()
                });
            } catch (err) {
                console.error('❌ Agent error:', err.message);
                socket.emit('error', { 
                    success: false,
                    message: 'Failed to process message',
                    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
                    timestamp: new Date().toISOString()
                });
            }
        });

        socket.on('disconnect', () => {
            console.log(`👋 Client disconnected: ${socket.id}\n`);
        });

        socket.on('error', (error) => {
            console.error('🔴 Socket error:', error);
        });
    });

    return io;
}

module.exports = { initSocketServer };