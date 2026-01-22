/**
 * Webhook Service - Reusable webhook verification and processing utility
 * Supports multiple payment providers (Flutterwave, Stripe, etc.)
 */

const crypto = require('crypto');

class WebhookService {
  /**
   * Verify webhook signature for Flutterwave
   * @param {string} signature - The signature from webhook header
   * @param {string} secret - The secret key from env
   * @returns {boolean}
   */
  static verifyFlutterwaveSignature(signature, secret) {
    if (!signature || !secret) {
      console.warn('⚠️ Missing signature or secret for Flutterwave verification');
      return false;
    }
    return signature === secret;
  }

  /**
   * Verify webhook signature for Stripe
   * @param {string} signature - Signature from header
   * @param {string} body - Raw request body
   * @param {string} secret - Signing secret from env
   * @returns {boolean}
   */
  static verifyStripeSignature(signature, body, secret) {
    if (!signature || !secret || !body) {
      console.warn('⚠️ Missing signature, body or secret for Stripe verification');
      return false;
    }
    try {
      const hash = crypto
        .createHmac('sha256', secret)
        .update(body)
        .digest('hex');
      return signature.includes(hash);
    } catch (error) {
      console.error('Stripe signature verification error:', error);
      return false;
    }
  }

  /**
   * Safely extract data from varied webhook payload structures
   * @param {object} payload - The webhook payload
   * @returns {object} Normalized data object
   */
  static normalizePayload(payload = {}) {
    const data = payload.data || payload;
    
    return {
      status: (data.status || payload.status || '').toString().toLowerCase(),
      tx_ref: data.tx_ref || payload.tx_ref || data.reference || payload.reference || '',
      amount: Number(data.amount || payload.amount || 0),
      currency: data.currency || payload.currency || 'NGN',
      customer: data.customer || payload.customer || {},
      transactionId: data.id || payload.id || data.transaction_id || payload.transaction_id || '',
      description: data.description || payload.description || '',
      metadata: data.metadata || payload.metadata || {},
    };
  }

  /**
   * Check if a transaction status indicates success
   * @param {string} status - Transaction status
   * @returns {boolean}
   */
  static isSuccessStatus(status = '') {
    const successStatuses = ['successful', 'success', 'completed', 'paid'];
    return successStatuses.includes(status.toLowerCase());
  }

  /**
   * Log webhook activity for debugging
   * @param {object} options - Logging options
   */
  static logWebhookActivity(options = {}) {
    const timestamp = new Date().toISOString();
    const level = options.level || 'info';
    const provider = options.provider || 'unknown';
    const message = options.message || '';
    const data = options.data || {};

    const logEntry = {
      timestamp,
      level,
      provider,
      message,
      ...data,
    };

    if (level === 'error') {
      console.error(`[${provider}] ERROR:`, logEntry);
    } else if (level === 'warn') {
      console.warn(`[${provider}] WARN:`, logEntry);
    } else {
      console.log(`[${provider}] INFO:`, logEntry);
    }

    return logEntry;
  }
}

module.exports = WebhookService;
