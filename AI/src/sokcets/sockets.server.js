const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cookie = require('cookie');
const { HumanMessage } = require('@langchain/core/messages');

async function initSocketServer(httpServer) {
    const io = new Server(httpServer, {});

    io.use((socket, next) => {
        const cookieHeader = socket.handshake.headers.cookie || '';
        const cookies = cookie.parse(cookieHeader);
        const { token } = cookies;

        if (!token) {
            return next(new Error('Authentication error: No token provided'));
        }
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            socket.user = decoded;
            socket.token = token;
            next();
        } catch (err) {
            return next(new Error('Invalid token'));
        }
    });

    io.on('connection', (socket) => {
        console.log(socket.user, socket.token);
        console.log('A client connected:', socket.id);

        socket.on('message', async (data) => {
            try {
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

                console.log("Agent response: ", agentResponse);

                // Optional: Send response back to client
                socket.emit('response', agentResponse);
            } catch (err) {
                console.error('Agent error:', err.message);
                socket.emit('error', { message: 'Failed to process message' });
            }
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected:', socket.id);
        });
    });

    return io;
}

module.exports = { initSocketServer };