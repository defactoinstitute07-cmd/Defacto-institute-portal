const { generateEmailLayout } = require('./emailLayout');

const INSTITUTE_NAME = 'Defacto Institute';
const PROFILE_SETUP_TITLE = 'ERP Profile Setup Instructions';
const SETUP_INSTRUCTIONS = [
    'You can upload your profile picture only once, so choose it carefully.',
    'All photo records will be maintained by the institute, so do not upload any inappropriate image.',
    'The photo should be formal, and your face must be clearly visible.',
    'Do not upload marksheets or any other documents as your profile picture.',
    'Please reset your password.'
];
const CLOSING_LINES = [
    'Thank you,',
    'Technical Team',
    INSTITUTE_NAME
];
const legacyBody = [
    `Welcome to ${INSTITUTE_NAME}`,
    'Points for Setting Up Your Profile:',
    ...SETUP_INSTRUCTIONS,
    'Use the link below to set up your ERP profile.',
    '',
    ...CLOSING_LINES
].join('\n');

module.exports = {
    name: 'Student Registration',
    eventType: 'studentRegistration',
    subject: `Welcome to ${INSTITUTE_NAME}`,
    body: generateEmailLayout({
        eyebrow: 'Student Portal',
        title: 'ERP Profile Setup',
        subtitle: 'Your ERP profile setup guide is attached with this email.',
        messageBody: `Welcome to ${INSTITUTE_NAME}, {{studentName}}!<br/><br/>Please use the following credentials to access your portal and follow the instructions in the attached PDF.`,
        rows: [
            { label: 'Student ID', value: '{{rollNo}}' },
            { label: 'Password', value: '{{password}}' }
        ],
        ctaText: 'Access ERP Portal',
        ctaLink: 'https://student.defactoinstitute.in/',
        footerText: `Sent by ${INSTITUTE_NAME}.`
    }),
    subjectPush: 'छात्र पोर्टल में आपका स्वागत है',
    bodyPush: 'आपका ईआरपी (ERP) खाता बन गया है। कृपया अपना प्रोफाइल सेटअप करने के लिए लॉग इन करें।',
    placeholders: ['studentName', 'rollNo', 'password', 'portalUrl'],
    legacyBodies: [legacyBody]
};
