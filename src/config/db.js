const mongoose = require('mongoose');
require('dotenv').config();


const DB_URL = process.env.DB_URL || 'mongodb+srv://mikky:fOhG7nh13WSTliXw@cluster0.u1z3xfi.mongodb.net/myauthClass';

const connectDB = async () => {
    try {
        await mongoose.connect(DB_URL); 
        console.log('MongoDB connected successfully');
    } catch (error) {
        console.error('MongoDB connection failed:', error);
        process.exit(1);
    }
};
module.exports = connectDB;
