const mongoose = require("mongoose");

const aiConversationMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant", "system"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    intent: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    products: [{
      productId: String,
      title: String,
      score: Number,
      reasons: [String],
    }],
    actions: [{
      type: String,
      productId: String,
      status: String,
      message: String,
      at: Date,
    }],
  },
  { timestamps: true, _id: false },
);

const aiConversationSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      required: true,
      index: true,
    },
    messages: {
      type: [aiConversationMessageSchema],
      default: [],
    },
    lastIntent: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    lastProductIds: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true },
);

aiConversationSchema.index({ userId: 1, sessionId: 1 }, { unique: true });
aiConversationSchema.index({ updatedAt: -1 });

module.exports = mongoose.models.AIConversation
  || mongoose.model("AIConversation", aiConversationSchema);
