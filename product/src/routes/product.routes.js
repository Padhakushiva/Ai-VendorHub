const express = require('express');
const router = express.Router();
const productController = require('../controllers/product.controller');
const homepageController = require('../controllers/homepage.controller');
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

//GET api/products/compare?ids=id1,id2 - Compare products side-by-side
router.get('/compare', productController.compareProducts);

//GET api/products/trending - Get trending products by popularity score
router.get('/trending', productController.getTrendingProducts);

//GET api/products/homepage - Public dynamic homepage content
router.get('/homepage', homepageController.getPublicHomepage);

//GET api/products/homepage/admin - Admin content management list
router.get('/homepage/admin', createAuthMiddleware(['admin']), homepageController.getAdminHomepageSections);

//POST api/products/homepage - Create homepage banner/product row (ADMIN ONLY)
router.post('/homepage', createAuthMiddleware(['admin']), homepageController.createHomepageSection);

//PATCH api/products/homepage/:id - Update homepage banner/product row (ADMIN ONLY)
router.patch('/homepage/:id', createAuthMiddleware(['admin']), homepageController.updateHomepageSection);

//DELETE api/products/homepage/:id - Delete homepage banner/product row (ADMIN ONLY)
router.delete('/homepage/:id', createAuthMiddleware(['admin']), homepageController.deleteHomepageSection);

//GET api/products/recently-viewed - Get authenticated user's recently viewed products
router.get(
  '/recently-viewed',
  createAuthMiddleware(['user', 'buyer', 'customer', 'seller', 'admin']),
  productController.getRecentlyViewedProducts
);

//GET api/products/wishlist - Get authenticated user's wishlist
router.get(
  '/wishlist',
  createAuthMiddleware(['user', 'buyer', 'customer']),
  productController.getWishlist
);

//POST api/products/wishlist/:productId - Add product to wishlist
router.post(
  '/wishlist/:productId',
  createAuthMiddleware(['user', 'buyer', 'customer']),
  productController.addToWishlist
);

//DELETE api/products/wishlist/:productId - Remove product from wishlist
router.delete(
  '/wishlist/:productId',
  createAuthMiddleware(['user', 'buyer', 'customer']),
  productController.removeFromWishlist
);

//POST api/products/:id/view - Track product view and recently viewed list
router.post(
  '/:id/view',
  createAuthMiddleware(['user', 'buyer', 'customer', 'seller', 'admin']),
  productController.trackProductView
);

//GET api/products/:id/related - Get related products
router.get('/:id/related', productController.getRelatedProducts);

//POST api/products/:id/variants - Add product variant
router.post(
  '/:id/variants',
  createAuthMiddleware(['admin', 'seller']),
  parseNestedFormData,
  productController.addProductVariant
);

//PATCH api/products/:id/variants/:variantId - Update product variant
router.patch(
  '/:id/variants/:variantId',
  createAuthMiddleware(['admin', 'seller']),
  parseNestedFormData,
  productController.updateProductVariant
);

//GET api/products/:id - Get product by ID
router.get('/:id', productController.getProductById);

//PATCH api/products/:id - Update product by ID (SELLER - own products, ADMIN - any product)
router.patch(
  '/:id',
  createAuthMiddleware(['admin', 'seller']),
  upload.array('images', 5),
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
