const mongoose = require('mongoose');

const userSnapshotSchema = new mongoose.Schema({
  username: {
    type: String,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    enum: ['user', 'buyer', 'customer', 'seller', 'admin'],
    default: 'user',
  },
}, {
  collection: 'users',
  timestamps: true,
  strict: false,
});

module.exports = mongoose.models.User || mongoose.model('User', userSnapshotSchema);
