const mongoose = require("mongoose");

const weightedTermSchema = new mongoose.Schema(
  {
    key: { type: String, required: true },
    weight: { type: Number, default: 1 },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const aiUserMemorySchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    preferredCategories: {
      type: [weightedTermSchema],
      default: [],
    },
    preferredBrands: {
      type: [weightedTermSchema],
      default: [],
    },
    preferredTerms: {
      type: [weightedTermSchema],
      default: [],
    },
    budget: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      observed: { type: [Number], default: [] },
    },
    positiveProductIds: {
      type: [String],
      default: [],
    },
    negativeProductIds: {
      type: [String],
      default: [],
    },
    lastSearches: {
      type: [String],
      default: [],
    },
    embedding: {
      type: [Number],
      default: [],
    },
    summary: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

module.exports = mongoose.models.AIUserMemory
  || mongoose.model("AIUserMemory", aiUserMemorySchema);
