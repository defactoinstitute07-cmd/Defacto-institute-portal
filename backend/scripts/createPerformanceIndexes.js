const mongoose = require('mongoose');
const { loadBackendEnv } = require('../config/env');
const connectDB = require('../config/db');

const Student = require('../models/Student');
const Exam = require('../models/Exam');
const ExamResult = require('../models/ExamResult');
const Fee = require('../models/Fee');
const Notification = require('../models/Notification');

loadBackendEnv();

async function createPerformanceIndexes() {
    await connectDB();

    const indexPlans = [
        {
            label: 'Student',
            collection: Student.collection,
            indexes: [
                { key: { batchId: 1, status: 1, joinedAt: -1 }, name: 'student_batch_status_joinedAt' },
                { key: { admissionDate: -1 }, name: 'student_admissionDate_desc' },
                { key: { batchId: 1, 'portalAccess.signupStatus': 1 }, name: 'student_batch_signupStatus' },
                { key: { batchId: 1, lastActiveAt: -1 }, name: 'student_batch_lastActiveAt' }
            ]
        },
        {
            label: 'Exam',
            collection: Exam.collection,
            indexes: [
                { key: { classLevel: 1, date: 1 }, name: 'exam_classLevel_date' },
                { key: { subjectId: 1, date: 1 }, name: 'exam_subject_date' },
                { key: { status: 1, date: 1 }, name: 'exam_status_date' }
            ]
        },
        {
            label: 'ExamResult',
            collection: ExamResult.collection,
            indexes: [
                { key: { studentId: 1, uploadedAt: -1 }, name: 'examResult_student_uploadedAt' },
                { key: { studentId: 1, isPresent: 1 }, name: 'examResult_student_present' },
                { key: { examId: 1, uploadedAt: -1 }, name: 'examResult_exam_uploadedAt' }
            ]
        },
        {
            label: 'Fee',
            collection: Fee.collection,
            indexes: [
                { key: { batchId: 1, status: 1, dueDate: 1 }, name: 'fee_batch_status_dueDate' },
                { key: { studentId: 1, status: 1 }, name: 'fee_student_status' },
                { key: { month: 1, year: 1, batchId: 1 }, name: 'fee_month_year_batch' },
                { key: { status: 1, createdAt: -1 }, name: 'fee_status_createdAt' }
            ]
        },
        {
            label: 'Notification',
            collection: Notification.collection,
            indexes: [
                { key: { createdAt: -1, status: 1, deliveryType: 1, type: 1 }, name: 'notification_history_filters' },
                { key: { 'emailResult.status': 1, createdAt: -1 }, name: 'notification_emailStatus_createdAt' },
                { key: { 'pushResult.status': 1, createdAt: -1 }, name: 'notification_pushStatus_createdAt' },
                { key: { recipientType: 1, createdAt: -1 }, name: 'notification_recipientType_createdAt' }
            ]
        }
    ];

    for (const plan of indexPlans) {
        await plan.collection.createIndexes(plan.indexes);
        console.log(`Indexes ensured for ${plan.label}`);
    }
}

createPerformanceIndexes()
    .then(async () => {
        console.log('Performance indexes are ready.');
        await mongoose.connection.close();
        process.exit(0);
    })
    .catch(async (error) => {
        console.error('Failed to create performance indexes:', error);
        try {
            await mongoose.connection.close();
        } catch {}
        process.exit(1);
    });
