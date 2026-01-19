const routes = require('express').Router();
const isAuth = require('../config/auth');
const express = require('express');
const router = express.Router();
const { createWallet, getAllUserWallets, transferFunds, createRedirectUrl, flutterwaveWebhook } = require('../controller/user.wallets');

// Route to create a wallet for the authenticated user
routes.post('/create-wallet', isAuth, createWallet);
routes.get('/get-all-wallets', isAuth, getAllUserWallets);
routes.post('/transfer-funds', isAuth, transferFunds);
routes.post('/create-payment-link', isAuth, createRedirectUrl);
router.post('/webhooks/flutterwave', flutterwaveWebhook);


module.exports = routes;