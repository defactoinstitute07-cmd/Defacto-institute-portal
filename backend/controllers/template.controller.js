const NotificationTemplate = require('../models/NotificationTemplate');

// Get all templates
exports.getAllTemplates = async (req, res) => {
    try {
        const templates = await NotificationTemplate.find();
        res.json(templates);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching templates', error: error.message });
    }
};

// Update a template
exports.updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { subject, body, isActive } = req.body;

        const template = await NotificationTemplate.findByIdAndUpdate(
            id,
            { subject, body, isActive },
            { returnDocument: 'after' }
        );

        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        res.json({ message: 'Template updated successfully', template });
    } catch (error) {
        res.status(500).json({ message: 'Error updating template', error: error.message });
    }
};

// Seed default templates helper
exports.seedDefaults = async () => {
    const defaults = [
        {
            name: 'Student Registration',
            eventType: 'studentRegistration',
            subject: 'Welcome to {{instituteName}}',
            body: 'Hello {{studentName}}, your registration is successful. Roll No: {{rollNo}}, Password: {{password}}. Please login to your portal.',
            placeholders: ['studentName', 'rollNo', 'password', 'instituteName']
        },
        {
            name: 'Fee Generated',
            eventType: 'feeGenerated',
            subject: 'Fee Invoice Generated: {{month}} {{year}}',
            body: 'Hello {{studentName}}, a new fee of ₹{{amount}} has been generated for {{month}} {{year}}. Due date: {{dueDate}}. Please check your portal.',
            placeholders: ['studentName', 'amount', 'month', 'year', 'dueDate']
        },
        {
            name: 'Fee Payment',
            eventType: 'feePayment',
            subject: 'Payment Received — Receipt {{receiptNo}}',
            body: 'Hello {{studentName}}, we have received your payment of ₹{{amountPaid}} for receipt {{receiptNo}}. Thank you!',
            placeholders: ['studentName', 'amountPaid', 'receiptNo']
        },
        {
            name: 'Fee Overdue',
            eventType: 'feeOverdue',
            subject: 'Reminder: Fee Overdue for {{month}}',
            body: 'Hello {{studentName}}, your fee of ₹{{pendingAmount}} for {{month}} is overdue. \n Please settle it by {{deadline}} Thank you.',
            placeholders: ['studentName', 'pendingAmount', 'month', 'deadline', 'instituteName']
        },
        {
            name: 'Exam Result',
            eventType: 'examResult',
            subject: 'Exam Result Published: {{examName}}',
            body: 'Hello {{studentName}}, the results for {{examName}} held on {{examDate}} have been published. \nYour score: {{score}}/{{totalMarks}}. Status: {{passStatus}}.',
            placeholders: ['studentName', 'examName', 'examDate', 'score', 'totalMarks', 'passStatus', 'instituteName']
        },
        {
            name: 'Teacher Registration',
            eventType: 'teacherRegistration',
            subject: 'Welcome to {{instituteName}} - Faculty Account',
            body: 'Hello {{teacherName}}, welcome to our team. Your faculty account has been created. Username: {{email}}, Password: {{password}}. Please login at {{portalUrl}}.',
            placeholders: ['teacherName', 'email', 'password', 'portalUrl', 'instituteName']
        },
    ];

    for (const def of defaults) {
        const exists = await NotificationTemplate.findOne({ eventType: def.eventType });
        if (!exists) {
            await NotificationTemplate.create(def);
        }
    }
};
