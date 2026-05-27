const mongoose = require('mongoose');
require('./user.model');

const variantSchema = new mongoose.Schema({
    sku: {
        type: String,
        required: true,
        trim: true,
        uppercase: true,
    },
    color: { type: String, trim: true },
    size: { type: String, trim: true },
    ram: { type: String, trim: true },
    storage: { type: String, trim: true },
    price: {
        amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
            type: String,
            enum: ['USD', 'INR', 'EUR', 'GBP', 'JPY'],
            default: 'INR',
        },
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
    },
}, {
    timestamps: true,
});

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        default: '',
        trim: true,
    },
    price: {
       amount: {
            type: Number,
            required: true,
            min: 0,
        },
        currency: {
        type: String,
        enum: ['USD', 'INR', 'EUR', 'GBP', 'JPY'],
        default: 'INR',
        },

    },  
    category: {type:String},
    tags:[{type:String}],
    brand:{type:String},
    images: [
        {
            id: String,
            url: String,
            thumbnail: String,
        },
    ],
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
    },
    variants: [variantSchema],
    specifications: {
        type: Map,
        of: String,
        default: {},
    },
    rating: {
        average: {
            type: Number,
            min: 0,
            max: 5,
            default: 0,
        },
        count: {
            type: Number,
            min: 0,
            default: 0,
        },
    },
    metrics: {
        views: { type: Number, min: 0, default: 0 },
        wishlist: { type: Number, min: 0, default: 0 },
        cartAdds: { type: Number, min: 0, default: 0 },
        orders: { type: Number, min: 0, default: 0 },
        popularityScore: { type: Number, min: 0, default: 0, index: true },
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'archived'],
        default: 'active',
        index: true,
    },
    orders: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
    }],
}, {
    timestamps: true,
});

productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ seller: 1, status: 1, createdAt: -1 });
productSchema.index({ category: 1, brand: 1, 'price.amount': 1 });
productSchema.index({ tags: 1 });
productSchema.index({ 'rating.average': 1 });
productSchema.index({ 'metrics.popularityScore': -1, status: 1 });
productSchema.index({ 'variants.sku': 1 });

productSchema.methods.calculateAvailability = function calculateAvailability(threshold = 5) {
    const stock = Number(this.stock) || 0;
    const variantStock = Array.isArray(this.variants)
        ? this.variants.reduce((sum, variant) => sum + (Number(variant.stock) || 0), 0)
        : 0;
    const totalStock = stock + variantStock;

    if (totalStock <= 0) return 'out_of_stock';
    if (totalStock <= threshold) return 'low_stock';
    return 'in_stock';
};

productSchema.methods.calculatePopularityScore = function calculatePopularityScore() {
    const metrics = this.metrics || {};
    return ((metrics.views || 0) * 1)
        + ((metrics.wishlist || 0) * 2)
        + ((metrics.cartAdds || 0) * 3)
        + ((metrics.orders || 0) * 5);
};

productSchema.pre('save', function updateDerivedProductFields() {
    this.metrics = this.metrics || {};
    this.metrics.popularityScore = this.calculatePopularityScore();
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
