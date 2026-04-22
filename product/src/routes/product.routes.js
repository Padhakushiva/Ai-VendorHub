const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const createAuthMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { validateProductCreation } = require('../validators/product.validator');

// POST /api/product/ - Create product with images
// Note: multer must run before validator for multipart form data to be parsed
router.post(
  '/',
  createAuthMiddleware(['admin', 'seller']),
  upload.array('photo', 5),
  validateProductCreation,
  productController.createProduct
);

module.exports = router;