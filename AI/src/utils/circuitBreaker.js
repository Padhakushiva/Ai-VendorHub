/**
 * Circuit Breaker for LLM calls
 * 
 * States:
 *   CLOSED  — requests pass through normally
 *   OPEN    — requests fail immediately (circuit tripped)
 *   HALF_OPEN — one probe request allowed to test recovery
 *
 * Prevents cascading failures when the Gemini API is down or hanging.
 */

class CircuitBreaker {
  /**
   * @param {Object} options
   * @param {number} options.failureThreshold - Number of consecutive failures before opening circuit (default: 3)
   * @param {number} options.resetTimeoutMs   - How long the circuit stays OPEN before moving to HALF_OPEN (default: 30 000 ms)
   * @param {number} options.callTimeoutMs    - Max duration for a single call before it's considered a failure (default: 15 000 ms)
   * @param {string} options.name             - Friendly label used in logs
   */
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 3;
    this.resetTimeoutMs = options.resetTimeoutMs || 30000;
    this.callTimeoutMs = options.callTimeoutMs || 15000;
    this.name = options.name || 'CircuitBreaker';

    // Internal state
    this.state = 'CLOSED';          // CLOSED | OPEN | HALF_OPEN
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.successCount = 0;
    this.totalCalls = 0;
    this.totalFailures = 0;
    this.totalSuccesses = 0;
    this.totalTimeouts = 0;
    this.totalCircuitBreaks = 0;
  }

  /**
   * Execute a function through the circuit breaker.
   * @param {Function} fn - Async function to execute
   * @returns {Promise<*>} Result of fn()
   * @throws {Error} If circuit is OPEN or fn fails
   */
  async execute(fn) {
    this.totalCalls++;

    // --- OPEN state: fail fast ---
    if (this.state === 'OPEN') {
      // Check if enough time has passed to try again
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.state = 'HALF_OPEN';
        console.log(`⚡ [${this.name}] Circuit → HALF_OPEN (probing)`);
      } else {
        this.totalCircuitBreaks++;
        throw new Error(`[${this.name}] Circuit is OPEN — failing fast (resets in ${Math.ceil((this.resetTimeoutMs - (Date.now() - this.lastFailureTime)) / 1000)}s)`);
      }
    }

    // --- CLOSED / HALF_OPEN: execute the call ---
    try {
      const result = await this._executeWithTimeout(fn);
      this._onSuccess();
      return result;
    } catch (error) {
      this._onFailure(error);
      throw error;
    }
  }

  /** @private */
  async _executeWithTimeout(fn) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        this.totalTimeouts++;
        reject(new Error(`[${this.name}] Call timed out after ${this.callTimeoutMs}ms`));
      }, this.callTimeoutMs);
    });

    try {
      const result = await Promise.race([fn(), timeoutPromise]);
      clearTimeout(timeoutId);
      return result;
    } catch (err) {
      clearTimeout(timeoutId);
      throw err;
    }
  }

  /** @private */
  _onSuccess() {
    this.totalSuccesses++;
    this.failureCount = 0;
    this.successCount++;

    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      console.log(`✅ [${this.name}] Circuit → CLOSED (recovered)`);
    }
  }

  /** @private */
  _onFailure(error) {
    this.totalFailures++;
    this.failureCount++;
    this.successCount = 0;
    this.lastFailureTime = Date.now();

    if (error.message?.includes('timed out')) {
      console.warn(`⏱️ [${this.name}] Timeout (failure ${this.failureCount}/${this.failureThreshold})`);
    } else {
      console.warn(`❌ [${this.name}] Failure ${this.failureCount}/${this.failureThreshold}: ${error.message}`);
    }

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      console.error(`🔴 [${this.name}] Circuit → OPEN (will reset in ${this.resetTimeoutMs / 1000}s)`);
    }
  }

  /**
   * Return health metrics for monitoring
   */
  getMetrics() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      totalCalls: this.totalCalls,
      totalSuccesses: this.totalSuccesses,
      totalFailures: this.totalFailures,
      totalTimeouts: this.totalTimeouts,
      totalCircuitBreaks: this.totalCircuitBreaks,
      successRate: this.totalCalls > 0
        ? ((this.totalSuccesses / this.totalCalls) * 100).toFixed(1) + '%'
        : 'N/A',
    };
  }

  /**
   * Manually reset the circuit to CLOSED
   */
  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    console.log(`🔄 [${this.name}] Circuit manually reset → CLOSED`);
  }
}

module.exports = CircuitBreaker;
