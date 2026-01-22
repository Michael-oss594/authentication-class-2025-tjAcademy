require('dotenv').config();
const express = require('express');
const app = express();
const morgan = require('morgan');
const connectDB = require('./src/config/db');

const port = process.env.PORT || 4000;

const userRoutes = require('./src/routes/user.routes');
const walletRoutes = require('./src/routes/user.wallets.routes');
const webhookRoutes = require('./src/routes/webhook.routes');

app.use(express.json());
app.use(morgan('dev'));
app.use(express.urlencoded({ extended: true }));

connectDB();

app.get('/', (req, res) => {
    res.send('Welcome To My Auth Class');
});

app.use('/api/users', userRoutes);
app.use('/api/wallets', walletRoutes);
app.use('/api/webhooks', webhookRoutes);

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});