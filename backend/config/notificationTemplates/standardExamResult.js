const { generateEmailLayout } = require('./emailLayout');

const legacyBody = [
    'Hello {{studentName}},',
    '',
    'The result for {{examName}} held on {{examDate}} has been published.',
    'Your score: {{score}}/{{totalMarks}}',
    'Status: {{passStatus}}',
    '',
    'Please review your detailed result in the portal.'
].join('\n');

module.exports = {
    name: 'Standard Exam Result',
    eventType: 'examResult',
    subject: 'Exam Result Published: {{examName}}',
    body: generateEmailLayout({
        eyebrow: 'Exam Result',
        title: '{{examName}}',
        subtitle: 'Published on {{examDate}}',
        messageBody: 'Your result has been published. A quick summary is below, and the full breakdown is available in your portal.',
        rows: [
            { label: 'Your Score', value: '{{score}} / {{totalMarks}}' },
            { label: 'Status', value: '{{passStatus}}', valueColor: '#2563eb' }
        ],
        ctaText: 'View Full Result',
        ctaLink: 'https://student.defactoinstitute.in/'
    }),
    subjectPush: 'परीक्षा परिणाम घोषित ! ',
    bodyPush: '{{examName}} का परिणाम घोषित हो गया है—आप अपना स्कोर देख सकते हैं।',
    placeholders: ['studentName', 'examName', 'examDate', 'score', 'totalMarks', 'passStatus', 'instituteName', 'portalUrl'],
    legacyBodies: [legacyBody]
};
