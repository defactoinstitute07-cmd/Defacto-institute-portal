const mongoose = require('mongoose');

const EmailTemplateSchema = new mongoose.Schema({
    event: {
        type: String,
        required: true,
        unique: true, // e.g., 'student_registration', 'student_login', etc.
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
            'password_reset'
        ]
    },
    displayName: {
        type: String,
        required: true
    },
    enabled: {
        type: Boolean,
        default: true
    },
    subject: {
        type: String,
        required: true
    },
    body: {
        type: String,
        required: true
    },
    variables: [{
        type: String // e.g., ['studentName', 'rollNo', 'password']
    }]
}, { timestamps: true });

module.exports = mongoose.model('EmailTemplate', EmailTemplateSchema);
