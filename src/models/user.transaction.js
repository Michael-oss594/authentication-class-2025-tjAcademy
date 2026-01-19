const mongoose = require('mongoose');

const transaction = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        require: true
    },
walletId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    require: true
},
referenceNumber: {
    type: String,
    require: true,
    unique: true
},
type: {
    type: String,
    enum: ['credit', 'debit', 'transfer'],
    require: true
},
amount: {
    type: mongoose.Schema.Types.Decimal128,
    require: true
},
currency: {
    type: String,
    require: true,
    default: 'NGN'
},
balanceAfter: {
    type: mongoose.Schema.Types.Decimal128,
    require: true
},
balanceBefore: {
    type: mongoose.Schema.Types.Decimal128,
    require: true
},
description: {
    type: String,
    default: '',
},
status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
},

}, { timestamps: true,
    versionKey: false
});

const Transaction = mongoose.model('Transaction', transaction);

module.exports = Transaction;