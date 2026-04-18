const mongoose = require('mongoose');



const addressSchema = new mongoose.Schema({

});
const UserSchema = new mongoose.Schema({
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
    role:{
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    addresses:[
        addressSchema
    ]
})

const userModel = mongoose.model('User', UserSchema);

module.exports = userModel;