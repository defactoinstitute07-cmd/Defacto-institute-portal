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
    body: `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to ${INSTITUTE_NAME}</title>
    <style>
        body {
            margin: 0;
            padding: 24px 12px;
            background: #f4f4f5;
            font-family: "DM Sans", Arial, sans-serif;
            color: #000000;
        }

        .card {
            max-width: 560px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 5px;
            overflow: hidden;
            box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
        }

        .hero {
            padding: 28px 28px 22px;
            background: #000000;
            border-bottom: 4px solid #FFB800;
            color: #ffffff;
        }

        .eyebrow {
            display: inline-block;
            font-size: 12px;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            font-weight: 700;
            color: #FFB800;
            margin-bottom: 10px;
        }

        .title {
            margin: 0;
            font-size: 26px;
            line-height: 1.2;
            color: #ffffff;
        }

        .subtitle {
            margin: 10px 0 0;
            font-size: 14px;
            color: #a1a1aa;
        }

        .content {
            padding: 28px;
        }

        .copy {
            margin: 0 0 22px;
            font-size: 15px;
            line-height: 1.7;
            color: #3f3f46;
        }

        .panel {
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-left: 4px solid #FFB800;
            border-radius: 8px;
            padding: 18px;
            margin-bottom: 22px;
        }

        .panel-title {
            margin: 0 0 12px;
            font-size: 15px;
            font-weight: 700;
            color: #000000;
        }

        .instruction-list {
            margin: 0;
            padding-left: 18px;
            color: #27272a;
        }

        .instruction-list li {
            margin-bottom: 10px;
            font-size: 14px;
            line-height: 1.6;
        }

        .instruction-list li:last-child {
            margin-bottom: 0;
        }

        .cta {
            display: inline-block;
            padding: 13px 20px;
            border-radius: 8px;
            background: #FFB800;
            color: #000000 !important;
            text-decoration: none;
            font-weight: 700;
            transition: background 0.3s;
        }

        .cta:hover {
            background: #eab308;
        }

        .note {
            margin: 18px 0 0;
            font-size: 13px;
            color: #71717a;
        }

        .closing {
            margin: 18px 0 0;
            font-size: 14px;
            line-height: 1.7;
            color: #18181b;
        }

        .footer {
            padding: 0 28px 24px;
            font-size: 12px;
            color: #a1a1aa;
        }

        .logo-box {
            padding: 4px;
            border-radius: 6px;
            margin-bottom: 16px;
            display: inline-block;
        }

        .logo-box img {
            height: 56px;
            width: auto;
            object-fit: contain;
        }
    </style>
</head>

<body>
    <div class="card">
        <div class="hero">
            <div class="logo-box">
                <img
                    src="https://res.cloudinary.com/dmswb6fya/image/upload/f_auto,q_auto,c_limit,w_240/v1775635083/erp_uploads/fwp2aeerokjfljm2aw2a.png" />
            </div>
            <div class="eyebrow">Student Portal</div>
            <p class="subtitle">Your ERP profile setup guide is attached with this email.</p>
        </div>
        <div class="content">
            <p class="copy">Welcome to ${INSTITUTE_NAME}</p>
            <p class="note">The attached PDF includes the setup instructions—open it and use it to access your ERP portal.</p>
            <p class="closing">${CLOSING_LINES.join('<br/>')}</p>

        </div>
        </div>
</body>

</html>`,
    subjectPush: `Welcome to ${INSTITUTE_NAME}`,
    bodyPush: `Welcome to ${INSTITUTE_NAME}. Review the setup instructions in your email and use the portal link to set up your ERP profile.`,
    placeholders: ['portalUrl'],
    legacyBodies: [legacyBody],
    welcomeInstituteName: INSTITUTE_NAME,
    profileSetupPdfTitle: PROFILE_SETUP_TITLE,
    setupInstructions: SETUP_INSTRUCTIONS,
    closingLines: CLOSING_LINES
};
