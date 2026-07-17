// services/logger.js
const { ActivityLog } = require('../models');

class Logger {
  /**
   * Create a log entry
   * @param {Object} params
   * @param {string} params.type - info, warning, error, success, debug
   * @param {string} params.category - user, listing, order, system, auth, admin
   * @param {string} params.message - Log message
   * @param {Object} params.details - Additional details (JSON)
   * @param {number} params.user_id - User ID (optional)
   * @param {number} params.listing_id - Listing ID (optional)
   * @param {number} params.order_id - Order ID (optional)
   * @param {string} params.ip_address - IP address (optional)
   * @param {string} params.user_agent - User agent (optional)
   * @param {string} params.session_id - Session ID (optional)
   */
  static async log(params) {
    try {
      // Don't log in test environment
      if (process.env.NODE_ENV === 'test') return;

      // Don't log debug in production unless explicitly enabled
      if (process.env.NODE_ENV === 'production' && params.type === 'debug') {
        if (!process.env.ENABLE_DEBUG_LOGS) return;
      }

      const log = await ActivityLog.create({
        type: params.type || 'info',
        category: params.category || 'system',
        message: params.message,
        details: params.details || null,
        user_id: params.user_id || null,
        listing_id: params.listing_id || null,
        order_id: params.order_id || null,
        ip_address: params.ip_address || null,
        user_agent: params.user_agent || null,
        session_id: params.session_id || null,
        is_read: false,
      });

      // In production, also send to console for debugging
      if (process.env.NODE_ENV === 'production') {
        console.log(`[${params.type.toUpperCase()}] ${params.category}: ${params.message}`);
      }

      return log;
    } catch (error) {
      console.error('Failed to create log:', error);
      // Don't throw - logging should never break the app
    }
  }

  // ============================================
  // CONVENIENCE METHODS
  // ============================================

  static async info(message, params = {}) {
    return this.log({ ...params, type: 'info', message });
  }

  static async warning(message, params = {}) {
    return this.log({ ...params, type: 'warning', message });
  }

  static async error(message, params = {}) {
    return this.log({ ...params, type: 'error', message });
  }

  static async success(message, params = {}) {
    return this.log({ ...params, type: 'success', message });
  }

  static async debug(message, params = {}) {
    return this.log({ ...params, type: 'debug', message });
  }

  // ============================================
  // CATEGORY-SPECIFIC METHODS
  // ============================================

  static async userActivity(message, params = {}) {
    return this.log({ ...params, category: 'user', message });
  }

  static async listingActivity(message, params = {}) {
    return this.log({ ...params, category: 'listing', message });
  }

  static async orderActivity(message, params = {}) {
    return this.log({ ...params, category: 'order', message });
  }

  static async systemActivity(message, params = {}) {
    return this.log({ ...params, category: 'system', message });
  }

  static async authActivity(message, params = {}) {
    return this.log({ ...params, category: 'auth', message });
  }

  static async adminActivity(message, params = {}) {
    return this.log({ ...params, category: 'admin', message });
  }
}

module.exports = Logger;