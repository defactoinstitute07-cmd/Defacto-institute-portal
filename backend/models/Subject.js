const mongoose = require('mongoose');

const chapterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    durationDays: {
        type: Number,
        required: true,
        min: 1
    },
    status: {
        type: String,
        enum: ['ongoing', 'completed'],
        default: 'ongoing'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    completedAt: {
        type: Date,
        default: null
    },
    projectedStartDate: {
        type: Date,
        default: null
    },
    projectedCompletionDate: {
        type: Date,
        default: null
    }
}, { _id: true });

const subjectSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    code: {
        type: String,
        trim: true,
        uppercase: true,
        default: null
    },
    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
        required: true,
        index: true
    },
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        default: null,
        index: true
    },
    totalChapters: {
        type: Number,
        default: null,
        min: 0
    },
    chapters: {
        type: [chapterSchema],
        default: []
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

subjectSchema.pre('validate', function () {
    if (!Array.isArray(this.chapters)) return;

    this.chapters.forEach((chapter) => {
        if (!chapter || typeof chapter.status !== 'string') return;
        const normalized = chapter.status.trim().toLowerCase();
        if (normalized === 'completed' || normalized === 'ongoing') {
            chapter.status = normalized;
        }
    });
});

subjectSchema.pre('save', function () {
    this.updatedAt = new Date();

    if (!this.code && this.name) {
        this.code = this.name
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 24)
            .toUpperCase();
    }
});

subjectSchema.index({ batchId: 1, name: 1 }, { unique: true });
subjectSchema.index({ batchId: 1, code: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Subject', subjectSchema);
