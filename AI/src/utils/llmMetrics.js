/**
 * LLM Metrics Tracker
 *
 * Tracks success/failure rates, latency, and errors for all LLM calls.
 * Exposes data via getMetrics() for the /health and /ai/metrics endpoints.
 */

class LLMMetrics {
  constructor() {
    this.calls = [];         // Recent call records (ring buffer, max 200)
    this.maxHistory = 200;
    this.counters = {
      totalCalls: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      totalTimeouts: 0,
      totalFallbacks: 0,
    };
    this.byEndpoint = {};    // Per-endpoint breakdown
  }

  /**
   * Record a call.
   * @param {Object} params
   * @param {string} params.endpoint     - e.g. 'search-intent', 'description', etc.
   * @param {boolean} params.success     - Whether the LLM call succeeded
   * @param {number} params.latencyMs    - Duration in ms
   * @param {boolean} params.usedFallback - Whether fallback was used instead of LLM
   * @param {string} [params.error]      - Error message if failed
   * @param {boolean} [params.timedOut]  - Whether it was a timeout
   */
  record({ endpoint, success, latencyMs, usedFallback = false, error = null, timedOut = false }) {
    const entry = {
      endpoint,
      success,
      latencyMs,
      usedFallback,
      error,
      timedOut,
      timestamp: new Date().toISOString(),
    };

    // Ring buffer
    this.calls.push(entry);
    if (this.calls.length > this.maxHistory) {
      this.calls.shift();
    }

    // Global counters
    this.counters.totalCalls++;
    if (success) this.counters.totalSuccesses++;
    else this.counters.totalFailures++;
    if (timedOut) this.counters.totalTimeouts++;
    if (usedFallback) this.counters.totalFallbacks++;

    // Per-endpoint counters
    if (!this.byEndpoint[endpoint]) {
      this.byEndpoint[endpoint] = {
        calls: 0,
        successes: 0,
        failures: 0,
        totalLatencyMs: 0,
        fallbacks: 0,
      };
    }
    const ep = this.byEndpoint[endpoint];
    ep.calls++;
    if (success) ep.successes++;
    else ep.failures++;
    ep.totalLatencyMs += latencyMs || 0;
    if (usedFallback) ep.fallbacks++;
  }

  /**
   * Get aggregated metrics for health monitoring.
   */
  getMetrics() {
    const now = Date.now();
    const last5Min = this.calls.filter(
      (c) => now - new Date(c.timestamp).getTime() < 5 * 60 * 1000
    );

    const endpointSummaries = {};
    for (const [ep, data] of Object.entries(this.byEndpoint)) {
      endpointSummaries[ep] = {
        ...data,
        avgLatencyMs: data.calls > 0 ? Math.round(data.totalLatencyMs / data.calls) : 0,
        successRate: data.calls > 0
          ? ((data.successes / data.calls) * 100).toFixed(1) + '%'
          : 'N/A',
      };
    }

    return {
      global: {
        ...this.counters,
        successRate: this.counters.totalCalls > 0
          ? ((this.counters.totalSuccesses / this.counters.totalCalls) * 100).toFixed(1) + '%'
          : 'N/A',
      },
      last5Minutes: {
        calls: last5Min.length,
        successes: last5Min.filter((c) => c.success).length,
        failures: last5Min.filter((c) => !c.success).length,
      },
      byEndpoint: endpointSummaries,
      recentErrors: this.calls
        .filter((c) => !c.success)
        .slice(-5)
        .map((c) => ({
          endpoint: c.endpoint,
          error: c.error,
          timestamp: c.timestamp,
        })),
    };
  }

  /**
   * Reset all metrics.
   */
  reset() {
    this.calls = [];
    this.counters = {
      totalCalls: 0,
      totalSuccesses: 0,
      totalFailures: 0,
      totalTimeouts: 0,
      totalFallbacks: 0,
    };
    this.byEndpoint = {};
  }
}

module.exports = new LLMMetrics();
