/**
 * Feature Flags for AI Service
 *
 * Toggle LLM-heavy features on/off in production without redeployment.
 * Flags can be overridden via environment variables (prefix: FF_).
 *
 * Usage:
 *   const featureFlags = require('./utils/featureFlags');
 *   if (featureFlags.isEnabled('LLM_SEARCH_INTENT')) { ... }
 */

// Default flag values
const defaults = {
  // Master switch — disables ALL LLM calls when false
  LLM_ENABLED: true,

  // Per-feature toggles
  LLM_SEARCH_INTENT: true,         // Use Gemini for search-intent parsing
  LLM_DESCRIPTION_GENERATOR: true, // Use Gemini for product descriptions
  LLM_CATEGORY_SUGGESTION: true,   // Use Gemini for category/tag suggestions
  LLM_REVIEW_SUMMARY: true,        // Use Gemini for review summarization
  LLM_AGENT_TOOLS: true,           // Use Gemini tool-calling in ecommerce agent
  LLM_BACKGROUND_IMPROVEMENT: true,// Allow background AI improvement tasks
};

class FeatureFlags {
  constructor() {
    this.flags = { ...defaults };
    this._loadFromEnv();
    this._logState();
  }

  /**
   * Override defaults from environment variables.
   * Example: FF_LLM_ENABLED=false  →  flags.LLM_ENABLED = false
   */
  _loadFromEnv() {
    for (const key of Object.keys(this.flags)) {
      const envKey = `FF_${key}`;
      const envVal = process.env[envKey];
      if (envVal !== undefined) {
        this.flags[key] = envVal === 'true' || envVal === '1';
      }
    }

    // If master switch is off, disable everything
    if (!this.flags.LLM_ENABLED) {
      for (const key of Object.keys(this.flags)) {
        if (key !== 'LLM_ENABLED') {
          this.flags[key] = false;
        }
      }
    }

    // If GOOGLE_API_KEY is missing, disable all LLM features
    if (!process.env.GOOGLE_API_KEY) {
      for (const key of Object.keys(this.flags)) {
        this.flags[key] = false;
      }
      console.warn('⚠️ GOOGLE_API_KEY not set — all LLM feature flags forced OFF');
    }
  }

  _logState() {
    console.log('🚩 Feature Flags:');
    for (const [key, value] of Object.entries(this.flags)) {
      const icon = value ? '✅' : '❌';
      console.log(`   ${icon} ${key}: ${value}`);
    }
  }

  /**
   * Check if a feature is enabled.
   * @param {string} flagName
   * @returns {boolean}
   */
  isEnabled(flagName) {
    if (!(flagName in this.flags)) {
      console.warn(`⚠️ Unknown feature flag: ${flagName}`);
      return false;
    }
    return this.flags[flagName];
  }

  /**
   * Programmatically set a flag (useful for testing / runtime toggling).
   * @param {string} flagName
   * @param {boolean} value
   */
  set(flagName, value) {
    if (!(flagName in this.flags)) {
      console.warn(`⚠️ Unknown feature flag: ${flagName}`);
      return;
    }
    this.flags[flagName] = Boolean(value);
    console.log(`🚩 Feature flag ${flagName} → ${this.flags[flagName]}`);
  }

  /**
   * Return all flags (for health/metrics endpoint).
   */
  getAll() {
    return { ...this.flags };
  }
}

module.exports = new FeatureFlags();
