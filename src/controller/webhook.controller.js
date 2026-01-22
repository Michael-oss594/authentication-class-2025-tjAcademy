/**
 * Webhook Controller - Handles payment webhooks from various providers
 */

const User = require('../models/user.models');
const UserWallet = require('../models/user.wallets');
const Transaction = require('../models/user.transaction');
const WebhookService = require('../utils/webhookService');

/**
 * Handle Flutterwave Payment Webhook
 * Endpoint: POST /api/webhooks/flutterwave
 */
const handleFlutterwaveWebhook = async (req, res) => {
  WebhookService.logWebhookActivity({
    provider: 'flutterwave',
    message: 'Webhook received',
    data: { body: req.body, headers: req.headers },
  });

  try {
    // ✅ Step 1: Verify webhook signature
    const signature = req.headers['verif-hash'];
    const secret = process.env.FLW_SECRET_HASH;

    if (!WebhookService.verifyFlutterwaveSignature(signature, secret)) {
      WebhookService.logWebhookActivity({
        provider: 'flutterwave',
        level: 'warn',
        message: 'Invalid signature',
        data: { receivedSignature: signature, expectedSecret: !!secret },
      });
      return res.status(401).json({ success: false, message: 'Invalid signature' });
    }

    // ✅ Step 2: Normalize and extract payload
    const payload = req.body || {};
    const normalized = WebhookService.normalizePayload(payload);

    // ✅ Step 3: Validate transaction status
    if (!WebhookService.isSuccessStatus(normalized.status)) {
      WebhookService.logWebhookActivity({
        provider: 'flutterwave',
        message: 'Transaction not successful, ignoring',
        data: { status: normalized.status },
      });
      return res.status(200).json({ success: true, message: 'Event ignored' });
    }

    // ✅ Step 4: Validate required fields
    if (!normalized.tx_ref || !normalized.amount || !normalized.customer.email) {
      WebhookService.logWebhookActivity({
        provider: 'flutterwave',
        level: 'warn',
        message: 'Missing required fields',
        data: normalized,
      });
      return res.status(200).json({ success: true, message: 'Missing required fields' });
    }

    // ✅ Step 5: Check for duplicate transaction
    let existingTx = null;
    if (normalized.transactionId) {
      existingTx = await Transaction.findOne({
        flutterwaveTransactionId: normalized.transactionId,
      });
    }
    if (!existingTx && normalized.tx_ref) {
      existingTx = await Transaction.findOne({ reference: normalized.tx_ref });
    }

    if (existingTx) {
      WebhookService.logWebhookActivity({
        provider: 'flutterwave',
        message: 'Duplicate transaction detected',
        data: { tx_ref: normalized.tx_ref, transactionId: normalized.transactionId },
      });
      return res.status(200).json({ success: true, message: 'Already processed' });
    }

    // ✅ Step 6: Find user
    const user = await User.findOne({ email: normalized.customer.email });
    if (!user) {
      WebhookService.logWebhookActivity({
        provider: 'flutterwave',
        level: 'warn',
        message: 'User not found',
        data: { email: normalized.customer.email },
      });
      return res.status(200).json({ success: true, message: 'User not found' });
    }

    // ✅ Step 7: Update wallet balance
    const wallet = await UserWallet.findOneAndUpdate(
      { userId: user._id, currency: normalized.currency },
      { $inc: { balance: normalized.amount } },
      { new: true, upsert: true }
    );

    if (!wallet) {
      throw new Error('Failed to update wallet');
    }

    // ✅ Step 8: Log transaction
    const transaction = await Transaction.create({
      userId: user._id,
      walletId: wallet._id,
      amount: normalized.amount,
      currency: normalized.currency,
      type: 'CREDIT',
      status: 'SUCCESS',
      reference: normalized.tx_ref,
      flutterwaveTransactionId: normalized.transactionId,
      description: 'Wallet funding via Flutterwave',
      metadata: normalized.metadata,
    });

    WebhookService.logWebhookActivity({
      provider: 'flutterwave',
      message: 'Webhook processed successfully',
      data: {
        userId: user._id,
        walletId: wallet._id,
        transactionId: transaction._id,
        amount: normalized.amount,
        tx_ref: normalized.tx_ref,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Wallet funded successfully',
      data: {
        transactionId: transaction._id,
        walletBalance: wallet.balance,
        amount: normalized.amount,
      },
    });
  } catch (error) {
    WebhookService.logWebhookActivity({
      provider: 'flutterwave',
      level: 'error',
      message: 'Webhook processing failed',
      data: { error: error.message, stack: error.stack },
    });

    // Always return 200 to prevent Flutterwave retries
    return res.status(200).json({
      success: false,
      message: 'Webhook received and logged',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Health check endpoint for webhooks
 * Endpoint: GET /api/webhooks/health
 */
const webhookHealthCheck = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Webhook service is healthy',
    timestamp: new Date().toISOString(),
    endpoints: {
      flutterwave: '/api/webhooks/flutterwave',
      health: '/api/webhooks/health',
    },
  });
};

/**
 * Webhook logs (development only)
 * Endpoint: GET /api/webhooks/logs
 */
const getWebhookLogs = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ message: 'Not available in production' });
  }

  try {
    const limit = parseInt(req.query.limit) || 20;
    const logs = await Transaction.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('reference flutterwaveTransactionId amount currency status createdAt');

    res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  handleFlutterwaveWebhook,
  webhookHealthCheck,
  getWebhookLogs,
};
