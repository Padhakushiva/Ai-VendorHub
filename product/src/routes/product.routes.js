const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const createAuthMiddleware = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');
const { parseNestedFormData, validateProductCreation } = require('../validators/product.validator');

// POST /api/product/ - Create product with images

router.post(
  '/',
  createAuthMiddleware(['admin', 'seller']),
  upload.array('images', 5),
  parseNestedFormData,
  validateProductCreation,
  productController.createProduct
);

//GET  api/products - Get all products with pagination and filtering
router.get('/', productController.getProducts);

//GET api/products/seller - Get products by seller (SELLER ONLY)
router.get('/seller', createAuthMiddleware(['seller']), productController.getProductsBySeller);

//GET api/products/:id - Get product by ID
router.get('/:id', productController.getProductById);

//PATCH api/products/:id - Update product by ID (SELLER - own products, ADMIN - any product)
router.patch(
  '/:id',
  createAuthMiddleware(['admin', 'seller']),
  upload.none(),
  parseNestedFormData,
  productController.updateProduct
);


//DELETE api/products/:id - Delete product by ID (SELLER - own products, ADMIN - any product)
// Soft delete if orders exist (status='archived'), hard delete if no orders
router.delete(
  '/:id',
  createAuthMiddleware(['admin', 'seller']),
  productController.deleteProduct
);

module.exports = router;