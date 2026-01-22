/**
 * Webhook Routes
 * Handles all payment provider webhooks
 */

const express = require('express');
const webhookRouter = express.Router();
const {
  handleFlutterwaveWebhook,
  webhookHealthCheck,
  getWebhookLogs,
} = require('../controller/webhook.controller');

// ✅ Health check - no auth required
webhookRouter.get('/health', webhookHealthCheck);

// ✅ Flutterwave webhook - no auth required, signature verified in controller
webhookRouter.post('/flutterwave', handleFlutterwaveWebhook);

// ✅ Development: View recent webhook logs (development only)
webhookRouter.get('/logs', getWebhookLogs);

module.exports = webhookRouter;
