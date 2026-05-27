const mongoose = require('mongoose');


const addressSchema = new mongoose.Schema({
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
});

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
            variantId: String,
            title: String,
            image: String,
            productSnapshot: mongoose.Schema.Types.Mixed,
            variantSnapshot: mongoose.Schema.Types.Mixed,
            quantity: {
                type: Number,
                default: 1,
                min: 1
            },
            price: {
                amount: {
                    type: Number,
                    required: true
                },
                currency: {
                    type: String,
                    required: true,
                    enum: [ "USD", "INR" ]
                }
            },
            finalPrice: {
                amount: Number,
                currency: String
            },
            reservationStatus: {
                type: String,
                enum: [ "reserved", "released", "deducted", "failed" ],
            },
        }
    ],
    status: {
        type: String,
        enum: [ "PENDING", "CONFIRMED", "PAID", "PACKED", "CANCELLED", "SHIPPED", "DELIVERED", "EXPIRED" ],
        default: "PENDING",
        index: true,
    },
    totalPrice: {
        amount: {
            type: Number,
            required: true
        },
        currency: {
            type: String,
            required: true,
            enum: [ "USD", "INR" ]
        }
    },
    shippingAddress: {
        type: addressSchema,
        required: true
    },
    paymentSummary: {
        paymentId: String,
        razorpayOrderId: String,
        transactionId: String,
        method: String,
        status: {
            type: String,
            enum: [ "pending", "completed", "failed", "refunded", "skipped" ],
            default: "pending",
        },
        paidAt: Date,
        failedAt: Date,
    },
    timeline: [
        {
            status: String,
            at: Date,
            note: String,
        }
    ],
    expiresAt: Date,
}, { timestamps: true });

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ "items.product": 1, createdAt: -1 });

const orderModel = mongoose.models.order || mongoose.model("order", orderSchema);

module.exports = orderModel;
