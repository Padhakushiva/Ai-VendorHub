const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { HumanMessage } = require('@langchain/core/messages');

async function initSocketServer(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CORS_ORIGIN || "*",
            methods: ["GET", "POST"],
            credentials: true,
        }
    });

    // ────────────────────────────────────────
    // Authentication middleware
    // Supports:
    //   1. Cookie-based JWT (`token` cookie)
    //   2. Auth header in handshake query/headers
    //   3. Token passed in handshake auth object
    // ────────────────────────────────────────
    io.use((socket, next) => {
        let token = null;

        // 1. Try cookie
        const cookieHeader = socket.handshake.headers.cookie || '';
        if (cookieHeader) {
            const cookies = cookie.parse(cookieHeader);
            token = cookies.token || null;
        }

        // 2. Try Authorization header
        if (!token) {
            const authHeader = socket.handshake.headers.authorization || '';
            if (authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        // 3. Try handshake auth object (socket.io v4+)
        if (!token && socket.handshake.auth?.token) {
            token = socket.handshake.auth.token;
        }

        // 4. Try query parameter
        if (!token && socket.handshake.query?.token) {
            token = socket.handshake.query.token;
        }

        if (!token) {
            console.log("❌ Authentication failed: No token provided");
            return next(new Error('Authentication error: No token provided. Send token via cookie, Authorization header, auth object, or query param.'));
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            socket.token = token;
            console.log("✅ User authenticated:", decoded.userId || decoded.id || decoded._id);
            next();
        } catch (err) {
            console.log("❌ Authentication failed: Invalid token -", err.message);
            return next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`\n👤 Client connected: ${socket.id}`);
        console.log(`📝 User Info:`, socket.user);

        // Send welcome message
        socket.emit('connected', {
            success: true,
            message: 'Connected to AI Shopping Assistant',
            socketId: socket.id,
            timestamp: new Date().toISOString(),
        });

        // ─── Handle 'message' event ───
        socket.on('message', async (data) => {
            await handleAgentQuery(socket, data);
        });

        // ─── Handle 'chat' event (alias for backward compatibility) ───
        socket.on('chat', async (data) => {
            await handleAgentQuery(socket, data);
        });

        socket.on('disconnect', () => {
            console.log(`👋 Client disconnected: ${socket.id}\n`);
        });

        socket.on('error', (error) => {
            console.error('🔴 Socket error:', error);
        });
    });

    /**
     * Process user query through the ecommerce agent.
     */
    async function handleAgentQuery(socket, data) {
        try {
            // Extract query from various formats
            const messageText = typeof data === 'string'
                ? data
                : (data.query || data.message || JSON.stringify(data));

            console.log(`\n💬 Message from user: "${messageText}"`);

            // Emit typing indicator
            socket.emit('typing', { isTyping: true });

            // Load e-commerce agent
            const ecommerceAgent = require('../agent/ecommerce-agent');

            const agentResponse = await ecommerceAgent.invoke(
                {
                    messages: [new HumanMessage(messageText)]
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

            // Stop typing indicator
            socket.emit('typing', { isTyping: false });

            // Extract the final response message
            const finalMessage = agentResponse.messages[agentResponse.messages.length - 1];
            const responseText = finalMessage.content;

            // Send response back to client
            socket.emit('response', {
                success: true,
                message: responseText,
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            console.error('❌ Agent error:', err.message);

            socket.emit('typing', { isTyping: false });
            socket.emit('error', {
                success: false,
                message: 'Failed to process message',
                error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
                timestamp: new Date().toISOString()
            });
        }
    }

    return io;
}

module.exports = { initSocketServer };