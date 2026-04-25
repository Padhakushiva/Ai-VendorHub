const cartModel = require('../models/cart.model');
const productService = require('../services/product.service');
const mongoose = require('mongoose');

async function addItemToCart(req,res) {
    const {productId,quantity}=req.body;

    const user=req.user;

    const availability = await productService.checkAvailability(productId, quantity);
    if (!availability || availability.available === false) {
        return res.status(409).json({
            message: 'Product unavailable',
        });
    }

    if (process.env.ENABLE_SOFT_STOCK_RESERVATION === 'true') {
        await productService.reserveSoftStock(productId, quantity, user._id);
    }

    let cart=await cartModel.findOne({user:user._id});
    
    if(!cart){
        cart=new cartModel({
            user:user._id,
            items:[]
        });
    }

    const existingItemIndex=cart.items.findIndex(item=>item.productId.toString()===productId);

    if(existingItemIndex>=0){
        cart.items[existingItemIndex].quantity+=quantity;
    } else {
        cart.items.push({productId,quantity});
    }

    await cart.save();
    res.status(200).json({
        message:"Item added to cart successfully",  
        cart:cart,
    });
}

async function updateCartItemQuantity(req,res) {
    const { productId } = req.params;
    const { quantity } = req.body;
    const user = req.user;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return res.status(400).json({
            message: 'Invalid product ID format',
        });
    }

    if (!Number.isInteger(quantity)) {
        return res.status(400).json({
            message: 'Quantity is required and must be an integer',
        });
    }

    const cart = await cartModel.findOne({ user: user._id });
    if (!cart) {
        return res.status(404).json({
            message: 'Cart not found',
        });
    }

    const existingItemIndex = cart.items.findIndex(
        item => item.productId.toString() === productId
    );

    if (existingItemIndex < 0) {
        return res.status(404).json({
            message: 'Item not found in cart',
        });
    }

    if (quantity <= 0) {
        cart.items.splice(existingItemIndex, 1);
    } else {
        cart.items[existingItemIndex].quantity = quantity;
    }

    const recalculatedTotals = await productService.recomputeCartTotals(cart.items);
    cart.totals = recalculatedTotals;

    await cart.save();

    return res.status(200).json({
        message: 'Cart item quantity updated successfully',
        cart,
    });
}


async function getCart(req,res) {
    const user=req.user;

    const cart=await cartModel.findOne({user:user._id});

    if(!cart){
        return res.status(404).json({
            message: 'Cart not found',
        });
    }

    const totals = await productService.recomputeCartTotals(cart.items);
    cart.totals = totals;

    await cart.save();

    res.status(200).json({
        cart,
        totals,
    })
}

async function clearCart(req,res) {
    const user = req.user;

    const cart = await cartModel.findOne({ user: user._id });

    if (!cart) {
        return res.status(404).json({
            message: 'Cart not found',
        });
    }

    cart.items = [];
    cart.totals = {
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: 0,
    };

    await cart.save();

    return res.status(200).json({
        message: 'Cart cleared successfully',
        cart,
    });
}


module.exports = {
    addItemToCart,
    updateCartItemQuantity,
    getCart,
    clearCart,
}