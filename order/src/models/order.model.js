const mongoose = require('mongoose');


const addressSchema = new mongoose.Schema({
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
});

const moneySchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: true,
        default: 0
    },
    currency: {
        type: String,
        required: true,
        enum: [ "USD", "INR" ],
        default: "INR"
    }
}, { _id: false });

const timelineSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true
    },
    status: String,
    message: String,
    at: {
        type: Date,
        default: Date.now
    },
    actor: {
        type: String,
        default: "system"
    }
}, { _id: false });

const orderSchema = new mongoose.Schema({

    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
    },
    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                required: true,
            },
            quantity: {
                type: Number,
                default: 1,
                min: 1
            },
            price: {
                type: moneySchema,
                required: true
            },
            unitPrice: moneySchema,
            finalPrice: moneySchema,
            title: String,
            image: String,
            variant: mongoose.Schema.Types.Mixed,
            variantId: mongoose.Schema.Types.ObjectId,
            productSnapshot: mongoose.Schema.Types.Mixed,
            reservationStatus: {
                type: String,
                enum: [ "PENDING", "RESERVED", "RELEASED", "FAILED" ],
                default: "PENDING"
            }
        }
    ],
    status: {
        type: String,
        enum: [ "PENDING", "PAID", "PACKED", "CONFIRMED", "CANCELLED", "SHIPPED", "DELIVERED", "EXPIRED" ],
    },
    totalPrice: {
        type: moneySchema,
        required: true
    },
    totals: {
        subtotal: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        shipping: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        currency: { type: String, enum: [ "USD", "INR" ], default: "INR" }
    },
    paymentSummary: {
        status: {
            type: String,
            enum: [ "PENDING", "PAID", "FAILED", "REFUNDED" ],
            default: "PENDING"
        },
        method: String,
        paymentId: String,
        subtotal: { type: Number, default: 0 },
        taxes: { type: Number, default: 0 },
        shipping: { type: Number, default: 0 },
        discount: { type: Number, default: 0 },
        total: { type: Number, default: 0 },
        currency: { type: String, enum: [ "USD", "INR" ], default: "INR" }
    },
    shippingAddress: {
        type: addressSchema,
        required: true
    },
    timeline: [ timelineSchema ],
    inventoryReservation: {
        status: {
            type: String,
            enum: [ "PENDING", "RESERVED", "CONFIRMED", "RELEASED", "FAILED", "SKIPPED" ],
            default: "PENDING"
        },
        reservedAt: Date,
        reservedUntil: Date,
        confirmedAt: Date,
        releasedAt: Date,
        error: String
    },
    orderExpiry: {
        expiresAt: Date,
        status: {
            type: String,
            enum: [ "ACTIVE", "EXPIRED", "DISABLED" ],
            default: "ACTIVE"
        }
    }
}, { timestamps: true });


const orderModel = mongoose.model("order", orderSchema);

module.exports = orderModel;
