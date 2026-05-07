/**
 * Retry with exponential backoff
 *
 * Retries a function up to `maxRetries` times with exponentially increasing
 * delays and optional jitter to prevent thundering-herd effects.
 *
 * @param {Function} fn           - Async function to retry
 * @param {Object}   options
 * @param {number}   options.maxRetries    - Max number of retries (default: 3)
 * @param {number}   options.baseDelayMs   - Initial delay in ms (default: 1 000)
 * @param {number}   options.maxDelayMs    - Maximum delay cap in ms (default: 10 000)
 * @param {boolean}  options.jitter        - Add random jitter (default: true)
 * @param {string}   options.label         - Label used in console logs
 * @param {Function} options.shouldRetry   - Predicate: (error) => boolean. Return false to stop retrying.
 * @returns {Promise<*>}
 */
async function retryWithBackoff(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 10000,
    jitter = true,
    label = 'retryWithBackoff',
    shouldRetry = () => true,
  } = options;

  let lastError;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt >= maxRetries) {
        console.error(`❌ [${label}] All ${maxRetries + 1} attempts failed. Last error: ${error.message}`);
        break;
      }

      if (!shouldRetry(error)) {
        console.warn(`⚠️ [${label}] Non-retryable error: ${error.message}`);
        break;
      }

      // Exponential backoff with optional jitter
      let delay = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      if (jitter) {
        delay = delay * (0.5 + Math.random() * 0.5); // 50-100% of computed delay
      }

      console.warn(`🔄 [${label}] Attempt ${attempt + 1}/${maxRetries + 1} failed: ${error.message}. Retrying in ${Math.round(delay)}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

module.exports = retryWithBackoff;
