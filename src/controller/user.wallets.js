const UserWallet = require('../models/user.wallets');
const User = require('../models/user.models');
const sendEmail = require('../config/email');
const Wallet = require('../models/user.wallets');
const Transaction = require('../models/user.transaction');
const mongoose = require('mongoose');
const Flutterwave = require('flutterwave-node-v3');
const axios = require('axios');


// create wallet for user
const createWallet = async (req, res) => {
    try {
        const userId = req.user._id;
        const { phoneNumber, currency } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "User ID is require"});
        }

        if (!phoneNumber) {
            return res.status(400).json({ message: "Phone number is required"});
        }

        const existingUser = await User.findById(userId);
        if (!existingUser) {
            return res.status(404).json({ message: "User not found"});
        }

        // remove +234 or leading 0 from phone number
        const normalizedPhone = phoneNumber.replace(/^(\+234|0)/, '');

        existingUser.phoneNumber = phoneNumber;
        await existingUser.save();

        const newWallet = new UserWallet({
            userId: userId,
            balance: 0,
            currency: currency,
            accountNumber: normalizedPhone,
        });
        await newWallet.save();
        res.status(201).json({ message: "Wallet created successfully", wallet: newWallet });
    } catch (error) {
        console.error("Error creating wallet:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

// Get All User Wallets
const getAllUserWallets = async (req, res) => {
    try {
        const userId = req.user._id;
        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }
        const wallets = await UserWallet.find({ userId }).populate('userId', 'email phoneNumber');
        res.status(200).json({ wallets });
    } catch (error) {
        console.error("Error fetching wallets:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};

//Transfer Funds Between Wallets with MongoDB Transactions and DB Locking
const transferFunds = async (req, res) => {
    const { accountNumberFrom, accountNumberTo, amount } = req.body;
    const userId = req.user?._id;

    if (!userId) {
        return res.status(400).json({ message: "User must be logged in" });
    }

    if (!accountNumberFrom || !accountNumberTo || !amount) {
        return res.status(400).json({ message: "All fields are required" });
    }

    if (amount <= 0) {
        return res.status(400).json({ message: "Transfer amount must be greater than zero" });
    }

    if (accountNumberFrom === accountNumberTo) {
        return res.status(400).json({ message: "Cannot transfer to the same account" });
    }

    // Start a session for transaction
    const session = await mongoose.startSession();
   

    try {
        // Start a session for transaction
         session.startTransaction();

        // Lock the sender and receiver wallets by using "findOneAndUpdate" with session
        const senderWallet = await UserWallet.findOneAndUpdate(
        { accountNumber: accountNumberFrom },
            {}, // No Update, just locking
            { session, new: true }
        );
        
        if (!senderWallet) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Sender wallet not found" });
        }

        const receiverWallet = await UserWallet.findOneAndUpdate(
        { accountNumber: accountNumberTo },
            {}, // No Update, just locking
            { session, new: true }
        );

        if (!receiverWallet) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Receiver wallet not found" });
        }

        if (senderWallet.balance < amount) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: "Insufficient funds" });
        }

        // Perform transfer, withdraw from the sender
        await UserWallet.updateOne(
            { accountNumber: accountNumberFrom },
            { $inc: { balance: -amount } },
            { session }
        );

        // Deposit to receiver
        await UserWallet.updateOne(
            { accountNumber: accountNumberTo },
            { $inc: { balance: amount } },
            { session }
        );

        // If everything is successful, Commit the transaction
        await session.commitTransaction();
        
    return res.status(200).json({
         message: "Transfer successful",
    details:{
            from: accountNumberFrom,
            to: accountNumberTo,
            amount: amount
        }
     });
    } catch (error) {
        // If anything went wrong abort and rollback transaction 
        await session.abortTransaction();
        session.endSession();
        console.error("Error during fund transfer:", error);
        return res.status(500).json({ message: "Internal server error" });
    } finally {
        // Always end the session
        session.endSession();
    }
};

// Create redirect url with Flutterwave
const createRedirectUrl = async (req, res) => {
    try {
        const userId = req.user._id;
        const { amount, currency, redirectUrl } = req.body;

        if (!userId) {
            return res.status(400).json({ message: "User ID is required" });
        }

        if (!amount || !currency || !redirectUrl) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const txRef = `TX-${Date.now()}-${userId}`;

        const payload = {
            tx_ref: txRef,
            amount,
            currency,
            redirect_url: redirectUrl,
            customer: {
                email: user.email,
                phonenumber: user.phoneNumber,
                name: user.name
            },
            customizations: {
                title: "Wallet Funding",
                description: "Fund your Wallet"
            }
        };

        const response = await axios.post(
            'https://api.flutterwave.com/v3/payments',
            payload,
            {
                headers: {
                    Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return res.status(201).json({
            message: "Payment link created successfully",
            txRef,
            paymentLink: response.data.data.link,
            flutterwaveResponse: response.data
        });

    } catch (error) {
        console.error("Flutterwave Error:", error.response?.data || error.message);

        return res.status(500).json({
            message: "Something went wrong",
            error: error.response?.data || error.message
        });
    }
};


const flutterwaveWebhook = async (req, res) => {
    console.log("🔥 WEBHOOK HIT 🔥", JSON.stringify(req.body, null, 2));

    try {
        const secretHash = process.env.FLW_SECRET_HASH;
        const signature = req.headers['verif-hash'];

        if (!signature || signature !== secretHash) {
            return res.status(401).json({ message: "Invalid webhook signature" });
        }

        const payload = req.body;

        if (
            payload.event !== "charge.completed" ||
            payload.data.status !== "successful"
        ) {
            return res.status(200).json({ message: "Event ignored" });
        }

        const {
            tx_ref,
            amount,
            currency,
            customer,
            id: flutterwaveTransactionId
        } = payload.data;

        // 1️⃣ Prevent duplicate funding
        const existingTx = await Transaction.findOne({ flutterwaveTransactionId });
        if (existingTx) {
            return res.status(200).json({ message: "Already processed" });
        }

        // 2️⃣ Find user
        const user = await User.findOne({ email: customer.email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // 3️⃣ ATOMIC WALLET FUNDING ✅
        const wallet = await UserWallet.findOneAndUpdate(
            { userId: user._id, currency },
            {
                $setOnInsert: {
                    userId: user._id,
                    currency,
                    accountNumber: customer.phonenumber || null
                },
                $inc: {
                    balance: Number(amount)
                }
            },
            { new: true, upsert: true }
        );

        // 4️⃣ LOG TRANSACTION
        await Transaction.create({
            userId: user._id,
            walletId: wallet._id,
            amount: Number(amount),
            currency,
            type: "CREDIT",
            status: "SUCCESS",
            reference: tx_ref,
            flutterwaveTransactionId,
            description: "Wallet funding via Flutterwave"
        });

        return res.status(200).json({
            message: "Wallet funded successfully"
        });

    } catch (error) {
        console.error("Webhook Error:", error);
        return res.status(500).json({ message: "Webhook processing failed" });
    }
};


   
module.exports = { 
    createWallet, 
    getAllUserWallets,
    transferFunds,
    createRedirectUrl,
    flutterwaveWebhook
};