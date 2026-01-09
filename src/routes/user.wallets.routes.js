const routes = require('express').Router();
const isAuth = require('../config/auth');
const { createWallet, getAllUserWallets } = require('../controller/user.wallets');

// Route to create a wallet for the authenticated user
routes.post('/create-wallet', isAuth, createWallet);
routes.get('/get-all-wallets', isAuth, getAllUserWallets);


module.exports = routes;