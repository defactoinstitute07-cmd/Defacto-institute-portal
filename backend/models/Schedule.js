const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    course: { type: String, trim: true },
    subject: { type: String, required: true, trim: true },
    teacher: { type: String, trim: true, default: 'Faculty Pending' },
    day: { type: String, required: true },
    timeSlot: { type: String, required: true },
    roomAllotted: { type: String, required: true },
    isMerged: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

scheduleSchema.index({ day: 1, timeSlot: 1, roomAllotted: 1 });
scheduleSchema.index({ batchId: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);
