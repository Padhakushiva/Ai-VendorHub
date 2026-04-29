const cartModel = require('../models/cart.model');
const productService = require('../services/product.service');
const axios = require('axios');
const mongoose = require('mongoose');

async function addItemToCart(req,res) {
    const {productId,quantity}=req.body;
    const requestedQuantity = Number(quantity);
    const user=req.user;

    try {
        // Check availability
        const availability = await productService.checkAvailability(productId, requestedQuantity);
        
        if (!availability.available) {
            return res.status(409).json({
                message: 'Product unavailable',
                stock: availability.stock,
                requested: requestedQuantity,
                error: availability.error
            });
        }

        // Get fresh product data
        const productResponse = await axios.get(
            `http://localhost:3000/api/product/${productId}`
        );
        const product = productResponse.data.data;

        let cart = await cartModel.findOne({user:user.id});
        
        if(!cart){
            cart=new cartModel({
                user:user.id,
                items:[]
            });
        }

        const existingItemIndex = cart.items.findIndex(item => item.productId.toString() === productId);

        if(existingItemIndex >= 0){
            const newQuantity = cart.items[existingItemIndex].quantity + requestedQuantity;
            
            // Validate new quantity against stock
            if (newQuantity > product.stock) {
                return res.status(409).json({
                    message: `Insufficient stock. Max available: ${product.stock}`,
                    stock: product.stock,
                    requested: newQuantity
                });
            }
            
            cart.items[existingItemIndex].quantity = newQuantity;
            // ✅ UPDATE snapshot when adding to existing item
            cart.items[existingItemIndex].productSnapshot = {
                title: product.title,
                price: product.price,
                seller: product.seller,
                stock: product.stock,
                images: product.images
            };
        } else {
            cart.items.push({
                productId,
                quantity: requestedQuantity,
                productSnapshot: {
                    title: product.title,
                    price: product.price,
                    seller: product.seller,
                    stock: product.stock,
                    images: product.images
                }
            });
        }

        const recalculatedTotals = await productService.recomputeCartTotals(cart.items);
        cart.totals = recalculatedTotals;

        await cart.save();
        
        res.status(200).json({
            message:"Item added to cart successfully",  
            cart:cart,
            stock: product.stock
        });
    } catch (err) {
        console.error('Error adding item to cart:', err.message);
        res.status(500).json({
            message: 'Error adding item to cart',
            error: err.message
        });
    }
}

async function updateCartItemQuantity(req,res) {
    const { productId } = req.params;
    const { quantity } = req.body;
    const user = req.user;

    try {
        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                message: 'Invalid product ID format',
            });
        }

        if (!Number.isInteger(quantity) || quantity < 0) {
            return res.status(400).json({
                message: 'Quantity is required and must be a non-negative integer',
            });
        }

        const cart = await cartModel.findOne({ user: user.id });
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

        // If quantity is 0, remove from cart
        if (quantity === 0) {
            cart.items.splice(existingItemIndex, 1);
        } else {
            // Validate new quantity against stock
            const availability = await productService.checkAvailability(productId, quantity);
            
            if (!availability.available) {
                return res.status(409).json({
                    message: `Insufficient stock. Max available: ${availability.stock}`,
                    stock: availability.stock,
                    requested: quantity
                });
            }
            
            // ✅ Fetch complete product data for snapshot
            const productResponse = await axios.get(
                `http://localhost:3000/api/product/${productId}`
            );
            const product = productResponse.data.data;
            
            cart.items[existingItemIndex].quantity = quantity;
            cart.items[existingItemIndex].productSnapshot = {
                title: product.title,
                price: product.price,
                seller: product.seller,
                stock: product.stock,
                images: product.images
            };
        }

        const recalculatedTotals = await productService.recomputeCartTotals(cart.items);
        cart.totals = recalculatedTotals;

        await cart.save();

        return res.status(200).json({
            message: 'Cart item quantity updated successfully',
            cart,
        });
    } catch (err) {
        console.error('Error updating cart item:', err.message);
        res.status(500).json({
            message: 'Error updating cart item',
            error: err.message
        });
    }
}


async function getCart(req,res) {
    const user=req.user;

    try {
        let cart=await cartModel.findOne({user:user.id});

        if(!cart){
            cart=new cartModel({
                user:user.id,
                items:[]
            });
            await cart.save();
        }

        // Revalidate stock for all items
        const validatedItems = [];
        
        for (let item of cart.items) {
            const availability = await productService.checkAvailability(item.productId, item.quantity);
            
            if (availability.available) {
                // ✅ Fetch complete product data
                const productResponse = await axios.get(
                    `http://localhost:3000/api/product/${item.productId}`
                );
                const product = productResponse.data.data;
                
                validatedItems.push({
                    productId: item.productId,
                    quantity: item.quantity,
                    productSnapshot: {
                        title: product.title,
                        price: product.price,
                        seller: product.seller,
                        stock: product.stock,
                        images: product.images
                    }
                });
            } else {
                console.warn(`Product ${item.productId} no longer available or insufficient stock`);
                // Remove unavailable items
            }
        }

        cart.items = validatedItems;
        const totals = await productService.recomputeCartTotals(cart.items);
        cart.totals = totals;
        
        await cart.save();

        res.status(200).json({
            cart,
            totals,
            message: 'Cart retrieved successfully'
        });
    } catch (err) {
        console.error('Error fetching cart:', err.message);
        res.status(500).json({
            message: 'Error fetching cart',
            error: err.message
        });
    }
}

async function clearCart(req,res) {
    const user = req.user;

    const cart = await cartModel.findOne({ user: user.id });

    if (!cart) {
        return res.status(404).json({
            message: 'Cart not found',
        });
    }

    cart.items = [];
    cart.totals = {
        subtotal: 0,
        tax: 0,
        shipping: 0,
        total: 0,
        currency: 'INR'
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