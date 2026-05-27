const featureFlags = require("../utils/featureFlags");
const llmMetrics = require("../utils/llmMetrics");
const { getScope } = require("../services/prompt.service");

exports.getMetrics = async (req, res) => {
  res.status(200).json({
    success: true,
    service: "AI Service",
    metrics: llmMetrics.getMetrics(),
    featureFlags: featureFlags.getAll(),
    timestamp: new Date(),
  });
};

exports.getFeatureFlags = async (req, res) => {
  res.status(200).json({
    success: true,
    featureFlags: featureFlags.getAll(),
  });
};

exports.updateFeatureFlags = async (req, res) => {
  const updates = req.body || {};
  Object.entries(updates).forEach(([key, value]) => {
    featureFlags.set(key, Boolean(value));
  });

  res.status(200).json({
    success: true,
    message: "Feature flags updated",
    featureFlags: featureFlags.getAll(),
  });
};

exports.getScope = async (req, res) => {
  res.status(200).json({
    success: true,
    scope: getScope(),
    message: "AI is limited to Ai-VendorHub marketplace tasks.",
  });
};
