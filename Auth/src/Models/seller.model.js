const mongoose = require('mongoose');


const SellerSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,

        select: false  // Password won't be returned by default, but we can explicitly select it
    },
    fullName: {
        firstName: {
            type: String,
            required: true
        },
        lastName: {
            type: String,
            required: true
        }
    },
    role: {
        type: String,
        enum: ['user','seller'],
        default: 'user'
        
    }
});

const sellerModel = mongoose.models.Seller || mongoose.model('Seller', SellerSchema);

module.exports = sellerModel;