const { generateEmailLayout } = require('./emailLayout');

const legacyBody = [
    'Hello {{studentName}},',
    '',
    'Your fee of Rs {{pendingAmount}} for {{month}} {{year}} is overdue.',
    'Please settle it by {{deadline}}.',
    'Contact the institute if you need any support.'
].join('\n');

module.exports = {
    name: 'Standard Fee Overdue',
    eventType: 'feeOverdue',
    subject: 'Reminder: Fee Overdue for {{month}} {{year}}',
    body: generateEmailLayout({
        title: 'Fee Overdue Reminder',
        subtitle: '{{month}} {{year}}',
        messageBody: 'Your fee payment is overdue. Please clear the balance before the deadline to avoid any further action.',
        rows: [
            { label: 'Pending Amount', value: 'Rs {{pendingAmount}}', valueColor: '#c2410c' },
            { label: 'Deadline', value: '{{deadline}}' }
        ],
        ctaText: 'Clear Pending Fees',
        ctaLink: 'https://student.defactoinstitute.in/'
    }),
    subjectPush: 'शुल्क बकाया चेतावनी',
    bodyPush: '{{month}} {{year}} के लिए रु {{pendingAmount}} का शुल्क बकाया है।',
    placeholders: ['studentName', 'pendingAmount', 'month', 'year', 'deadline', 'dueDate', 'instituteName', 'portalUrl'],
    legacyBodies: [legacyBody]
};
