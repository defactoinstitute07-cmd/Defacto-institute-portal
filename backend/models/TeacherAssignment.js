const mongoose = require('mongoose');

const teacherAssignmentSchema = new mongoose.Schema({
    teacherId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teacher',
        required: true,
        index: true
    },
    batchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Batch',
        required: true,
        index: true
    },
    subjectId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Subject',
        required: true,
        index: true
    },
    assignedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        default: null
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

teacherAssignmentSchema.pre('save', function () {
    this.updatedAt = new Date();
});

teacherAssignmentSchema.index({ batchId: 1, subjectId: 1 }, { unique: true });
teacherAssignmentSchema.index({ teacherId: 1, isActive: 1, batchId: 1 });

module.exports = mongoose.model('TeacherAssignment', teacherAssignmentSchema);
