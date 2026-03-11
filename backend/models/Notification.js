const mongoose = require('mongoose');

const channelResultSchema = new mongoose.Schema({
    status: {
        type: String,
        enum: ['sent', 'failed', 'logged', 'partial'],
        required: true
    },
    providerMessageId: {
        type: String,
        default: ''
    },
    error: {
        type: String,
        default: ''
    },
    meta: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    }
}, { _id: false });

const notificationSchema = new mongoose.Schema({
    message: {
        type: String,
        required: true,
        trim: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
    },
    deliveryType: {
        type: String,
        enum: ['push', 'whatsapp', 'both'],
        required: true,
        index: true
    },
    status: {
        type: String,
        enum: ['pending', 'sent', 'partial', 'failed', 'logged'],
        default: 'pending',
        index: true
    },
    pushResult: {
        type: channelResultSchema,
        default: undefined
    },
    whatsappResult: {
        type: channelResultSchema,
        default: undefined
    }
}, { timestamps: true });

notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
