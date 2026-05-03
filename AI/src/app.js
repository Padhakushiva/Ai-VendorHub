const express = require('express');
const cookieParser = require('cookie-parser');

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', service: 'AI Buddy Service', port: 3005 });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'AI Buddy Service is running',
        service: 'AI Buddy - Personal Shopping Assistant',
        version: '1.0.0',
        connection: 'Connect via WebSocket at ws://localhost:3005',
        description: 'Acts like a personal shopping assistant. Parse natural language queries and query Product Service, Can create cart items on behalf of user.'
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err.message);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        error: process.env.NODE_ENV === 'development' ? err : {}
    });
});

module.exports = app;