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
            id: String,
            url: String,
            thumbnail: String,
        },
    ],
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    }
});

productSchema.index({ title: 'text', description: 'text' });

const Product = mongoose.model('Product', productSchema);

module.exports = Product;