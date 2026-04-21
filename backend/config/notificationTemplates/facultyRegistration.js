const { generateEmailLayout } = require('./emailLayout');

const legacyBody = [
    'Hello {{teacherName}},',
    '',
    'Your faculty account has been created successfully.',
    'Email: {{email}}',
    'Password: {{password}}',
    'Teacher Portal: {{teacherPortalUrl}}',
    '',
    'Please log in and complete your faculty profile.'
].join('\n');

module.exports = {
    name: 'Faculty Registration',
    eventType: 'teacherRegistration',
    subject: 'Welcome to {{instituteName}} - Faculty Account',
    body: generateEmailLayout({
        eyebrow: 'Faculty Access',
        title: 'Welcome to {{instituteName}}',
        subtitle: 'Your teacher account is ready.',
        messageBody: 'Your faculty account has been created successfully. Use the details below to sign in to the teacher portal.',
        rows: [
            { label: 'Email', value: '{{email}}' },
            { label: 'Password', value: '{{password}}' }
        ],
        ctaText: 'Open Teacher Portal',
        ctaLink: 'https://student.defactoinstitute.in/'
    }),
    subjectPush: 'संकाय (Faculty) खाता बनाया गया',
    bodyPush: 'आपका स्वागत है {{teacherName}}। आपका संकाय (Faculty) खाता बन गया है।',
    placeholders: ['teacherName', 'email', 'password', 'teacherPortalUrl', 'portalUrl', 'instituteName'],
    legacyBodies: [legacyBody]
};
