const { generateEmailLayout } = require('./emailLayout');

const legacyBody = [
    'Hello {{studentName}},',
    '',
    'A new test has been announced for {{subject}}.',
    'Test Date: {{date}}',
    'Max Marks: {{totalMarks}}',
    '',
    'Please prepare well for the test!'
].join('\n');

module.exports = {
    name: 'Test Announcement',
    eventType: 'testAnnouncement',
    subject: 'New Test Announced: {{subject}}',
    body: generateEmailLayout({
        eyebrow: 'Announcement',
        title: 'New Test Scheduled',
        subtitle: '{{subject}}',
        messageBody: 'A new test has been scheduled for your batch. Please check the details below and prepare accordingly.',
        rows: [
            { label: 'Subject', value: '{{subject}}' },
            { label: 'Test Date', value: '{{date}}' },
            { label: 'Total Marks', value: '{{totalMarks}}' }
        ],
        ctaText: 'View Syllabus',
        ctaLink: 'https://student.defactoinstitute.in/'
    }),
    subjectPush: 'नई परीक्षा की घोषणा',
    bodyPush: '{{subject}} के लिए परीक्षा {{date}} को निर्धारित की गई है।',
    placeholders: ['studentName', 'subject', 'date', 'totalMarks', 'instituteName', 'portalUrl', 'examName', 'passingMarks'],
    legacyBodies: [legacyBody]
};
