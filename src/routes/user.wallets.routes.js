const express = require('express');
const routes = express.Router();
const isAuth = require('../config/auth');
const {
  createWallet,
  getAllUserWallets,
  transferFunds,
  createRedirectUrl
} = require('../controller/user.wallets');

// Authenticated routes
routes.post('/create-wallet', isAuth, createWallet);
routes.get('/get-all-wallets', isAuth, getAllUserWallets);
routes.post('/transfer-funds', isAuth, transferFunds);
routes.post('/create-payment-link', isAuth, createRedirectUrl);

module.exports = routes;
