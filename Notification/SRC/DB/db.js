const mongoose = require('mongoose');

async function connectDB() {
  const mongoUri = process.env.MONGO_URI || process.env.DB_CONNECT;
  if (!mongoUri) {
    console.warn('Notification DB not connected: MONGO_URI is not configured');
    return null;
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  await mongoose.connect(mongoUri);
  console.log('Notification DB connected');
  return mongoose.connection;
}

module.exports = connectDB;
