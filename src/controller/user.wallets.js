const UserWallet = require('../models/user.wallets');
const user = require('../models/user.models');
const sendEmail = require('../config/email');

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

        const existingUser = await user.findById(userId);
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

module.exports = { createWallet, getAllUserWallets };