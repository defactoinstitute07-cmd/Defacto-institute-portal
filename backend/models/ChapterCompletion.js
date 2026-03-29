const mongoose = require('mongoose');

const chapterCompletionSchema = new mongoose.Schema({
    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
        required: true,
        index: true
    },
    subject: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    chapterName: {
        type: String,
        required: true,
        trim: true
    },
    isCompleted: {
        type: Boolean,
        default: true,
        index: true
    },
    completedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        default: null
    },
    completedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

chapterCompletionSchema.index({ batchId: 1, subject: 1, chapterName: 1 }, { unique: true });

module.exports = mongoose.model('ChapterCompletion', chapterCompletionSchema);
