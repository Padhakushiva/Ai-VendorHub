const express = require('express');
const router = express.Router();

const searchIntentController = require('../controllers/searchIntent.controller');
const descriptionGenerator = require('../controllers/description.controller');
const categoryTagSuggestion = require('../controllers/categoryTag.controller');
const reviewSummary = require('../controllers/reviewSummary.controller');
const conversationalShopping = require('../controllers/conversationalShopping.controller');
const similarProduct = require('../controllers/similarProduct.controller');
const productComparison = require('../controllers/productComparison.controller');
const smartBudget = require('../controllers/smartBudget.controller');
const moodShopping = require('../controllers/moodShopping.controller');
const systemController = require('../controllers/system.controller');
const productPageAI = require('../controllers/productPageAI.controller');
const { requireAuth } = require('../middleware/auth.middleware');

// AI Service observability and runtime controls
router.get('/metrics', systemController.getMetrics);
router.get('/feature-flags', systemController.getFeatureFlags);
router.post('/feature-flags', systemController.updateFeatureFlags);
router.get('/scope', systemController.getScope);

// AI Product Search Intent
router.post('/search-intent', requireAuth, searchIntentController.generateSearchIntent);

// Product detail page AI panel
router.get('/product/:productId/insights', requireAuth, productPageAI.getProductAI);

// Conversational Shopping Assistant
router.post('/chat', requireAuth, conversationalShopping.chat);

// Similar Product Recommendations
router.get('/similar/:productId', requireAuth, similarProduct.getSimilarProducts);

// Product Comparison
router.post('/compare', requireAuth, productComparison.compareProducts);

// Smart Budget Shopping
router.post('/smart-budget', requireAuth, smartBudget.optimizeBudget);

// Mood-based Shopping
router.post('/mood-shopping', requireAuth, moodShopping.getMoodProducts);

// AI Product Description Generator
router.post('/generate-description', descriptionGenerator.generateDescription);

// AI Category & Tag Suggestion
router.post('/suggest-category-tags', categoryTagSuggestion.suggestCategoryAndTags);

// AI Review Summary
router.post('/review-summary/:productId', requireAuth, reviewSummary.summarizeReviews);

module.exports = router;
