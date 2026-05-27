const mongoose = require('mongoose');

const lowStockAlertSchema = new mongoose.Schema({
    seller: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User' },
    product: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Product' },
    productTitle: { type: String },
    stock: { type: Number },
    method: { type: String, enum: ['email', 'db'], default: 'db' },
    notified: { type: Boolean, default: false },
    status: { type: String, enum: ['open', 'resolved'], default: 'open', index: true },
    read: { type: Boolean, default: false },
    readAt: Date,
    resolvedAt: Date,
}, { timestamps: true });

lowStockAlertSchema.index({ seller: 1, status: 1, createdAt: -1 });
lowStockAlertSchema.index({ seller: 1, product: 1, status: 1 });

const LowStockAlert = mongoose.models.LowStockAlert || mongoose.model('LowStockAlert', lowStockAlertSchema);
module.exports = LowStockAlert;
