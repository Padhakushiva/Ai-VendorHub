const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    productId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref: 'Product'
    },
    quantity:{
        type:Number,
        required:true,
        min:1
    },
    productSnapshot: {
        title: String,
        price: {
            amount: Number,
            currency: { type: String, default: 'INR' }
        },
        seller: mongoose.Schema.Types.ObjectId,
        stock: Number,
        images: [String]
    },
    addedAt: {
        type: Date,
        default: Date.now
    }
});

const cartSchema = new mongoose.Schema({
    user:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref: 'User'
    },
    items:[cartItemSchema],
    totals: {
        subtotal: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        shipping: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        currency: { type: String, default: 'INR' }
    }
},{
    timestamps:true,
})

const cartModel = mongoose.model('Cart',cartSchema);

module.exports = cartModel;