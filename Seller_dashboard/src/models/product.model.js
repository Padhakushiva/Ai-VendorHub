const mongoose = require('mongoose');

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
    category: {
        type: String,
        default: '',
        index: true,
    },
    brand: {
        type: String,
        default: '',
    },
    tags: [String],
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
    images: [
        {
            id: String,
            url: String,
            thumbnail: String,
        },
    ],
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    stock: {
        type: Number,
        required: true,
        min: 0,
    },
    variants: [
        {
            sku: String,
            name: String,
            attributes: mongoose.Schema.Types.Mixed,
            price: {
                amount: Number,
                currency: String,
            },
            stock: {
                type: Number,
                default: 0,
            },
            active: {
                type: Boolean,
                default: true,
            },
        },
    ],
    rating: {
        average: {
            type: Number,
            default: 0,
        },
        count: {
            type: Number,
            default: 0,
        },
    },
    metrics: {
        views: {
            type: Number,
            default: 0,
        },
        wishlistCount: {
            type: Number,
            default: 0,
        },
        wishlist: {
            type: Number,
            default: 0,
        },
        cartAdds: {
            type: Number,
            default: 0,
        },
        orders: {
            type: Number,
            default: 0,
        },
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'archived'],
        default: 'active',
        index: true,
    },
}, {
    timestamps: true,
});

productSchema.index({ title: 'text', description: 'text' });
productSchema.index({ seller: 1, status: 1 });
productSchema.index({ seller: 1, stock: 1 });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

module.exports = Product;
