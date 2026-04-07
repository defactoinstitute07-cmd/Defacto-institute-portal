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
    classLevel: {
        type: String,
        trim: true,
        default: ''
    },
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
    batchIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch'
    }],
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
    syllabus: {
        originalName: { type: String, trim: true, default: '' },
        url: { type: String, trim: true, default: '' },
        mimeType: { type: String, trim: true, default: '' },
        uploadedAt: { type: Date, default: null },
        status: {
            type: String,
            enum: ['pending', 'completed'],
            default: 'pending'
        }
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

    if (Array.isArray(this.batchIds)) {
        const deduped = Array.from(new Set(this.batchIds.map((id) => String(id))));
        this.batchIds = deduped.map((id) => new mongoose.Types.ObjectId(id));
    }

    if (!this.code && this.name) {
        this.code = this.name
            .replace(/[^a-zA-Z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '')
            .slice(0, 24)
            .toUpperCase();
    }

    if (!this.classLevel && this.name) {
        this.classLevel = 'General';
    }
});

subjectSchema.index({ classLevel: 1, name: 1 });
subjectSchema.index({ batchIds: 1 });
subjectSchema.index({ code: 1 }, { sparse: true });

module.exports = mongoose.model('Subject', subjectSchema);
