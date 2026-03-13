const mongoose = require('mongoose');
const NotificationTemplate = require('./models/NotificationTemplate');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const templates = [
    {
        name: 'Standard Fee Generated',
        eventType: 'feeGenerated',
        subject: 'New Fee Generated - {{instituteName}}',
        body: 'Hello {{studentName}}, a new fee of ₹{{amount}} has been generated for {{month}} {{year}}. Due date: {{dueDate}}. Please check your portal for details.',
        placeholders: ['studentName', 'amount', 'month', 'year', 'dueDate', 'instituteName']
    },
    {
        name: 'Standard Fee Payment',
        eventType: 'feePayment',
        subject: 'Fee Payment Received - {{instituteName}}',
        body: 'Hello {{studentName}}, we have successfully received your payment of ₹{{amountPaid}} for receipt {{receiptNo}}. Thank you!',
        placeholders: ['studentName', 'amountPaid', 'receiptNo', 'instituteName']
    },
    {
        name: 'Standard Batch Assignment',
        eventType: 'batchAssignment',
        subject: 'Batch Assigned - {{instituteName}}',
        body: 'Hello {{studentName}}, you have been assigned to a new batch: {{batchName}}. Timing: {{timing}}.',
        placeholders: ['studentName', 'batchName', 'timing', 'instituteName']
    },
    {
        name: 'Standard Fee Overdue',
        eventType: 'feeOverdue',
        subject: 'URGENT: Fee Overdue - {{instituteName}}',
        body: 'Hello {{studentName}}, your fee of ₹{{pendingAmount}} for {{month}} is overdue. Please clear it at the earliest to avoid any inconvenience.',
        placeholders: ['studentName', 'pendingAmount', 'month', 'instituteName']
    },
    {
        name: 'Standard Exam Result',
        eventType: 'examResult',
        subject: 'Exam Result Announced - {{instituteName}}',
        body: 'Hello {{studentName}}, the results for {{examName}} ({{examDate}}) have been announced. You scored: {{score}}/{{totalMarks}}. Status: {{passStatus}}.',
        placeholders: ['studentName', 'examName', 'examDate', 'score', 'totalMarks', 'passStatus', 'instituteName']
    }
];

const seedTemplates = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        for (const templateData of templates) {
            await NotificationTemplate.findOneAndUpdate(
                { eventType: templateData.eventType },
                templateData,
                { upsert: true, new: true }
            );
            console.log(`Template for ${templateData.eventType} seeded.`);
        }

        console.log('All templates seeded successfully.');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding templates:', error);
        process.exit(1);
    }
};

seedTemplates();
