const mongoose = require('mongoose');

const moneySchema = new mongoose.Schema({
    amount: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' },
}, { _id: false });

const cartItemSchema = new mongoose.Schema({
    productId:{
        type:mongoose.Schema.Types.ObjectId,
        required:true,
        ref: 'Product'
    },
    variantId:{
        type:mongoose.Schema.Types.ObjectId,
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
        variant: {
            sku: String,
            color: String,
            size: String,
            ram: String,
            storage: String,
            price: {
                amount: Number,
                currency: { type: String, default: 'INR' }
            },
        },
        seller: mongoose.Schema.Types.ObjectId,
        stock: Number,
        images: [mongoose.Schema.Types.Mixed]
    },
    priceAtAdded: moneySchema,
    currentPrice: moneySchema,
    priceChanged: { type: Boolean, default: false },
    unitPrice: moneySchema,
    lineTotal: moneySchema,
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
    saveForLater: [{
        productId:{
            type:mongoose.Schema.Types.ObjectId,
            required:true,
            ref: 'Product'
        },
        variantId:{
            type:mongoose.Schema.Types.ObjectId,
        },
        quantity:{
            type:Number,
            required:true,
            min:1
        },
        productSnapshot: {
            title: String,
            price: moneySchema,
            variant: {
                sku: String,
                color: String,
                size: String,
                ram: String,
                storage: String,
                price: moneySchema,
            },
            seller: mongoose.Schema.Types.ObjectId,
            stock: Number,
            images: [mongoose.Schema.Types.Mixed]
        },
        priceAtAdded: moneySchema,
        currentPrice: moneySchema,
        priceChanged: { type: Boolean, default: false },
        savedAt: {
            type: Date,
            default: Date.now
        }
    }],
    cartStatus: {
        type: String,
        enum: ['healthy', 'needs_review', 'out_of_stock', 'invalid_items'],
        default: 'healthy'
    },
    cartIssues: [{
        productId: mongoose.Schema.Types.ObjectId,
        variantId: mongoose.Schema.Types.ObjectId,
        issueType: String,
        message: String,
        detectedAt: {
            type: Date,
            default: Date.now
        }
    }],
    lastValidatedAt: Date,
    lastActivityAt: Date,
    totals: {
        subtotal: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
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
