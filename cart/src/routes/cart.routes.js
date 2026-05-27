const express = require('express');
const createAuthMiddleware = require('../middleware/auth.middleware');
const { validateAddItemToCart } = require('../middleware/validation.middleware');
const {
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  getCart,
  clearCart,
  validateCart,
  getCartStatus,
  getCartHealth,
  saveItemForLater,
  getSaveForLater,
  moveSavedItemToCart,
  publishAbandonedCartEvents,
} = require('../controllers/cart.controller');

const router = express.Router();
const userAuth = createAuthMiddleware(['user']);
const adminAuth = createAuthMiddleware(['admin']);


router.get("/health",(req,res,next)=>{
    const hasAuth = Boolean(req.cookies?.token || req.headers?.authorization);
    if (hasAuth) return userAuth(req, res, () => getCartHealth(req, res, next));
    res.status(200).json({message:"Cart API is running"});
});


router.post('/items', userAuth, validateAddItemToCart, addItemToCart);

router.patch('/items/:productId', userAuth, updateCartItemQuantity);

router.delete('/items/:productId', userAuth, removeCartItem);

router.post('/validate', userAuth, validateCart);

router.get('/status', userAuth, getCartStatus);

router.post('/items/:productId/save-for-later', userAuth, saveItemForLater);

router.get('/save-for-later', userAuth, getSaveForLater);

router.post('/save-for-later/:productId/move-to-cart', userAuth, moveSavedItemToCart);

router.post('/abandoned/scan', adminAuth, publishAbandonedCartEvents);

router.get('/', userAuth, getCart);

router.delete('/', userAuth, clearCart);

module.exports = router;
