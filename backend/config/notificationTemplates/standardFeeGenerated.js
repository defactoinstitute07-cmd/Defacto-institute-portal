const { generateEmailLayout } = require('./emailLayout');

const legacyBody = [
    'Hello {{studentName}},',
    '',
    'A new fee of Rs {{amount}} has been generated for {{month}} {{year}}.',
    'Due date: {{dueDate}}.',
    '',
    'Please check your portal for complete fee details.'
].join('\n');

module.exports = {
    name: 'Standard Fee Generated',
    eventType: 'feeGenerated',
    subject: 'Fee Invoice Generated: {{month}} {{year}}',
    body: generateEmailLayout({
        title: 'Fee Invoice Generated',
        subtitle: '{{month}} {{year}}',
        messageBody: 'A new fee invoice has been generated for your account. Please review the amount and pay it before the due date.',
        rows: [
            { label: 'Amount Due', value: 'Rs {{amount}}' },
            { label: 'Due Date', value: '{{dueDate}}' }
        ],
        ctaText: 'View Fee Details',
        ctaLink: 'https://student.defactoinstitute.in/'
    }),
    subjectPush: '{{month}} {{year}} के लिए फीस जारी की गई है',
    bodyPush: 'The fee for {{studentName}} for {{month}} {{year}} has been generated.',
    placeholders: ['studentName', 'amount', 'month', 'year', 'dueDate', 'instituteName', 'portalUrl'],
    legacyBodies: [legacyBody]
};
