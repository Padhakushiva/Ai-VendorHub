const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
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
        enum: ['USD', 'INR'],
        default: 'INR',
    },

    },
    
    images: [
        {
            fileId: String,
            url: String,
            name: String,
        },
    ],
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;