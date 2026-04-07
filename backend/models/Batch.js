const mongoose = require('mongoose');

const batchSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    course: { type: String, trim: true },
    capacity: { type: Number, default: 30 },
    subjects: [{ type: String, trim: true }],
    // Legacy freeform display slots (kept for backward compat)
    timeSlots: [{ type: String, trim: true }],
    fees: { type: Number, default: 0 },
    enrolledCount: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    classroom: { type: String, trim: true },
    schedule: [{
        day: { type: String, required: true },
        time: { type: String, required: true },
        subject: { type: String, required: true },
        room: { type: String },
        isMerged: { type: Boolean, default: false }
    }],
    createdAt: { type: Date, default: Date.now }
});

batchSchema.index({ isActive: 1, name: 1 });

module.exports = mongoose.model('Batch', batchSchema);
