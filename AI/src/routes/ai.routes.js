const express = require('express');
const router = express.Router();

// ── Existing controllers ────────────────────────────────────────────────────
const searchIntentController = require('../controllers/searchIntent.controller');
const descriptionGenerator = require('../controllers/description.controller');
const categoryTagSuggestion = require('../controllers/categoryTag.controller');
const reviewSummary = require('../controllers/reviewSummary.controller');

// ── New feature controllers ─────────────────────────────────────────────────
const similarProductController = require('../controllers/similarProduct.controller');
const productComparisonController = require('../controllers/productComparison.controller');
const smartBudgetController = require('../controllers/smartBudget.controller');
const moodShoppingController = require('../controllers/moodShopping.controller');
const conversationalShoppingController = require('../controllers/conversationalShopping.controller');

// ── EXISTING ROUTES ─────────────────────────────────────────────────────────

// 1. AI Smart Search Intent
router.post('/search-intent', searchIntentController.generateSearchIntent);

// 2. AI Product Description Generator
router.post('/generate-description', descriptionGenerator.generateDescription);

// 3. AI Category & Tag Suggestion
router.post('/suggest-category-tags', categoryTagSuggestion.suggestCategoryAndTags);

// 4. AI Review Summary
router.post('/review-summary/:productId', reviewSummary.summarizeReviews);

// ── NEW ROUTES ──────────────────────────────────────────────────────────────

// 5. Conversational Shopping Assistant
//    POST /ai/chat  { message, sessionId? }
router.post('/chat', conversationalShoppingController.chat);

// 6. Similar Product Recommendation
//    GET /ai/similar/:productId
router.get('/similar/:productId', similarProductController.getSimilarProducts);

// 7. AI Product Comparison
//    POST /ai/compare  { productIds: ["id1","id2",...] }
router.post('/compare', productComparisonController.compareProducts);

// 8. Smart Budget Shopping
//    POST /ai/smart-budget  { budget: 5000, purpose: "gaming setup" }
router.post('/smart-budget', smartBudgetController.optimizeBudget);

// 9. Mood / Intent Based Shopping
//    POST /ai/mood-shopping  { mood: "minimal desk setup", maxBudget?: 5000 }
router.post('/mood-shopping', moodShoppingController.getMoodProducts);

module.exports = router;
