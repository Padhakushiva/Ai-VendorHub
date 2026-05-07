const express = require('express');
const createAuthMiddleware = require('../middleware/auth.middleware');
const { validateAddItemToCart } = require('../middleware/validation.middleware');
const {
  addItemToCart,
  updateCartItemQuantity,
  getCart,
  clearCart,
} = require('../controllers/cart.controller');

const router = express.Router();


router.get("/",(req,res)=>{
    res.status(200).json({message:"Cart API is running"});
});


router.post('/items', createAuthMiddleware(['user']), validateAddItemToCart, addItemToCart);

router.patch('/items/:productId', createAuthMiddleware(['user']), updateCartItemQuantity);

router.get('/', createAuthMiddleware(['user']), getCart);

router.delete('/', createAuthMiddleware(['user']), clearCart);

module.exports = router;
