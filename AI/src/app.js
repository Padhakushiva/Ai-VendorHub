const express = require('express');
const cookieParser = require('cookie-parser');
const featureFlags = require('./utils/featureFlags');
const llmMetrics = require('./utils/llmMetrics');

const app = express();

// Import routes
const aiRoutes = require('./routes/ai.routes');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint — includes LLM metrics & circuit breaker state
app.get('/', (req, res) => {
    res.json({
        status: 'OK',
        service: 'AI Service',
        port: 3005,
        uptime: Math.round(process.uptime()) + 's',
        featureFlags: featureFlags.getAll(),
        llmMetrics: llmMetrics.getMetrics(),
        timestamp: new Date().toISOString(),
    });
});

// Detailed metrics endpoint
app.get('/ai/metrics', (req, res) => {
    res.json({
        success: true,
        metrics: llmMetrics.getMetrics(),
        featureFlags: featureFlags.getAll(),
        memory: {
            rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + 'MB',
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
        },
        timestamp: new Date().toISOString(),
    });
});

// Feature flag toggle endpoint (for runtime toggling)
app.post('/ai/feature-flags', (req, res) => {
    const { flag, enabled } = req.body;
    if (!flag) {
        return res.status(400).json({ success: false, message: 'Flag name is required' });
    }
    featureFlags.set(flag, enabled);
    res.json({
        success: true,
        message: `Feature flag ${flag} set to ${featureFlags.isEnabled(flag)}`,
        flags: featureFlags.getAll(),
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'AI Service is running',
        service: 'AI Marketplace Assistant',
        version: '3.0.0',
        features: [
            'AI Smart Search (Gemini-powered with fallback)',
            'Conversational Shopping Assistant',
            'Similar Product Recommendation',
            'AI Product Comparison',
            'Smart Budget Shopping (Unique!)',
            'Mood/Intent Based Shopping',
            'AI Product Description Generator',
            'AI Category & Tag Suggestion',
            'Review Summary Generator',
            'Circuit Breaker & Retry protection',
            'Feature Flags for LLM toggle',
            'LLM Metrics & Health Monitoring',
        ],
        endpoints: {
            'GET /health': 'Health check with LLM metrics',
            'GET /ai/metrics': 'Detailed LLM metrics',
            'POST /ai/feature-flags': 'Toggle feature flags',
            'POST /ai/search-intent': 'AI Smart Search — natural language product search',
            'POST /ai/chat': 'Conversational Shopping Assistant',
            'GET /ai/similar/:productId': 'Similar Product Recommendations',
            'POST /ai/compare': 'AI Product Comparison',
            'POST /ai/smart-budget': 'Smart Budget Shopping — bundle products within budget',
            'POST /ai/mood-shopping': 'Mood/Intent Based Shopping',
            'POST /ai/generate-description': 'Generate product descriptions',
            'POST /ai/suggest-category-tags': 'Suggest categories and tags',
            'POST /ai/review-summary/:productId': 'Summarize product reviews',
        },
        documentation: 'See README.md or AI_FEATURES_GUIDE.md'
    });
});

// AI Routes
app.use('/ai', aiRoutes);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        availableEndpoints: {
            'GET /health': 'Health check with metrics',
            'GET /ai/metrics': 'LLM metrics dashboard',
            'POST /ai/search-intent': 'AI Smart Search',
            'POST /ai/chat': 'Conversational Shopping Assistant',
            'GET /ai/similar/:productId': 'Similar Product Recommendations',
            'POST /ai/compare': 'AI Product Comparison',
            'POST /ai/smart-budget': 'Smart Budget Shopping',
            'POST /ai/mood-shopping': 'Mood/Intent Based Shopping',
            'POST /ai/generate-description': 'Generate product descriptions',
            'POST /ai/suggest-category-tags': 'Suggest categories and tags',
            'POST /ai/review-summary/:productId': 'Summarize reviews',
        }
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