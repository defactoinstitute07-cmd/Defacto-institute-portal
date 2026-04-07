const mongoose = require('mongoose');

const examSchema = new mongoose.Schema({
    name: { type: String, required: true },
    classLevel: { type: String, required: true, trim: true, default: 'General', index: true },
    subject: { type: String, required: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null, index: true },
    chapter: { type: String, required: true },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    linkedBatchCount: { type: Number, default: 1, min: 1 },
    date: { type: Date },
    totalMarks: { type: Number, required: true, default: 20 },
    passingMarks: { type: Number, required: true, default: 15 },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    status: { type: String, enum: ['scheduled', 'completed', 'cancelled'], default: 'scheduled' }
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);
