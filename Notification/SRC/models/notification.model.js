const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: String,
    index: true,
    trim: true,
  },
  email: {
    type: String,
    index: true,
    lowercase: true,
    trim: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  html: String,
  channel: {
    type: String,
    enum: ['email', 'in_app', 'sms', 'push'],
    default: 'email',
  },
  type: {
    type: String,
    default: 'general',
    index: true,
  },
  event: {
    type: String,
    index: true,
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal',
    index: true,
  },
  status: {
    type: String,
    enum: ['unread', 'read'],
    default: 'unread',
    index: true,
  },
  deliveryStatus: {
    type: String,
    enum: ['pending', 'sent', 'failed', 'skipped'],
    default: 'pending',
    index: true,
  },
  readAt: Date,
  sentAt: Date,
  failedAt: Date,
  retryCount: {
    type: Number,
    default: 0,
  },
  error: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: true });

notificationSchema.index({ user: 1, status: 1, createdAt: -1 });
notificationSchema.index({ event: 1, 'metadata.paymentId': 1 });
notificationSchema.index({ event: 1, 'metadata.orderId': 1 });

module.exports = mongoose.model('Notification', notificationSchema);
