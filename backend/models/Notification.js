const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipientEmail: { type: String, required: true },
    recipientName: { type: String, required: true },
    subject: { type: String, required: true },
    type: {
        type: String,
        enum: [
            'student_registration',
            'student_login',
            'exam_result_published',
            'test_scheduled',
            'fee_generated',
            'fee_paid',
            'teacher_registration',
            'teacher_login',
            'teacher_salary_paid',
            'password_reset',
            'batch_assignment',
            'custom'
        ],
        required: true
    },
    template: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    status: {
        type: String,
        enum: ['pending', 'sent', 'failed'],
        default: 'pending'
    },
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    lastError: { type: String },
    sentAt: { type: Date },
    meta: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

// Index for the queue processor
notificationSchema.index({ status: 1, createdAt: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
