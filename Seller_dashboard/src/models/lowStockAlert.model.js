const mongoose = require('mongoose');

const lowStockAlertSchema = new mongoose.Schema({
    seller: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    product: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
    productTitle: { type: String },
    stock: { type: Number },
    method: { type: String, enum: ['email', 'db'], default: 'db' },
    notified: { type: Boolean, default: false }
}, { timestamps: true });

const LowStockAlert = mongoose.models.LowStockAlert || mongoose.model('LowStockAlert', lowStockAlertSchema);
module.exports = LowStockAlert;
