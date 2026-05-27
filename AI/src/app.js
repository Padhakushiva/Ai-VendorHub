const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');

const featureFlags = require('./utils/featureFlags');
const llmMetrics = require('./utils/llmMetrics');

const app = express();
const corsOptions = {
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : true,
    credentials: true,
};

// Import routes
const aiRoutes = require('./routes/ai.routes');

// Middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        service: 'AI Service',
        port: 3005,
        scope: 'Ai-VendorHub marketplace tasks only',
        featureFlags: featureFlags.getAll(),
        metrics: llmMetrics.getMetrics(),
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'AI Service is running',
        service: 'AI Marketplace Assistant',
        version: '3.1.0',
        scope: 'Limited to Ai-VendorHub marketplace/product/seller tasks',
        features: [
            'AI Product Search Assistant',
            'Product Page AI Insights',
            'Conversational Shopping Assistant',
            'Similar Product Recommendations',
            'Product Comparison',
            'Smart Budget Shopping',
            'Mood-based Shopping',
            'AI Product Description Generator',
            'AI Category & Tag Suggestion',
            'Review Summary Generator',
            'AI Metrics and Feature Flags'
        ],
        endpoints: {
            'POST /ai/search-intent': 'Search using natural language',
            'GET /ai/product/:productId/insights': 'AI panel for product detail page',
            'POST /ai/chat': 'Conversational shopping assistant',
            'GET /ai/similar/:productId': 'Find similar products',
            'POST /ai/compare': 'Compare products',
            'POST /ai/smart-budget': 'Create product bundle within budget',
            'POST /ai/mood-shopping': 'Mood/vibe based product recommendations',
            'POST /ai/generate-description': 'Generate product descriptions with bullet points',
            'POST /ai/suggest-category-tags': 'Suggest categories and tags for products',
            'POST /ai/review-summary/:productId': 'Summarize product reviews',
            'GET /ai/metrics': 'LLM metrics and feature flags',
            'GET /ai/scope': 'AI scope limits'
        },
        unableToUnderstandMessage: 'If request is unclear or outside marketplace scope, AI returns a clear clarification/scope-limited message.'
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
            'POST /ai/search-intent': 'Search using natural language',
            'GET /ai/product/:productId/insights': 'AI panel for product detail page',
            'POST /ai/chat': 'Conversational shopping assistant',
            'GET /ai/similar/:productId': 'Find similar products',
            'POST /ai/compare': 'Compare products',
            'POST /ai/smart-budget': 'Budget bundle recommendations',
            'POST /ai/mood-shopping': 'Mood-based shopping',
            'POST /ai/generate-description': 'Generate product descriptions',
            'POST /ai/suggest-category-tags': 'Suggest categories and tags',
            'POST /ai/review-summary/:productId': 'Summarize reviews',
            'GET /ai/metrics': 'AI metrics',
            'GET /ai/scope': 'AI scope'
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
