/**
 * Guarded debug logger. Only logs when process.env.DEBUG_LOGS=true.
 */
function debugLog(...args) {
  if (process.env.DEBUG_LOGS === 'true') {
    console.warn(...args);
  }
}

module.exports = { debugLog };
