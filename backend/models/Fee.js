const mongoose = require('mongoose');

const paymentHistorySchema = new mongoose.Schema({
    paidAmount: { type: Number, default: 0 },
    date: { type: Date, default: Date.now },
    paymentMethod: { type: String, default: 'Cash' },
    transactionId: { type: String, default: '' },
    bankName: { type: String, default: '' },
    remarks: { type: String, default: '' },
    receiptNo: { type: String, required: true }
}, { _id: true });

const extraExpenseSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    description: { type: String, trim: true }
}, { _id: true });

const feeSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true, index: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', index: true },

    month: { type: String, required: true },
    year: { type: String, required: true },

    monthlyTuitionFee: { type: Number, default: 0 },
    registrationFee: { type: Number, default: 0 },
    fine: { type: Number, default: 0 },

    otherExpenses: { type: [extraExpenseSchema], default: [] },

    totalFee: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    pendingAmount: { type: Number, default: 0 },

    status: {
        type: String,
        enum: ['pending', 'partial', 'paid', 'overdue'],
        default: 'pending',
        index: true
    },

    dueDate: { type: Date },

    paymentHistory: { type: [paymentHistorySchema], default: [] }
}, {
    timestamps: true
});

feeSchema.index({ studentId: 1, month: 1, year: 1 }, { unique: true });

module.exports = mongoose.model('Fee', feeSchema);
