const mongoose = require("mongoose");

let connectionPromise = null;

async function connectDB() {
  const uri = process.env.MONGO_URI || process.env.AI_MONGO_URI;
  if (!uri) {
    console.warn("AI persistent memory disabled: MONGO_URI is not configured");
    return false;
  }

  if (mongoose.connection.readyState === 1) return true;
  if (connectionPromise) return connectionPromise;

  connectionPromise = mongoose
    .connect(uri)
    .then(() => {
      console.log("AI Service connected to MongoDB");
      return true;
    })
    .catch((error) => {
      console.warn("AI persistent memory disabled: MongoDB connection failed:", error.message);
      connectionPromise = null;
      return false;
    });

  return connectionPromise;
}

function isConnected() {
  return mongoose.connection.readyState === 1;
}

module.exports = {
  connectDB,
  isConnected,
};
