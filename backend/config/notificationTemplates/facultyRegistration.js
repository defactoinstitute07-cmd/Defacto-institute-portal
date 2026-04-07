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
    body: `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Faculty Account</title>
    <style>
        body {
            margin: 0;
            padding: 24px 12px;
            background: #f8fafc;
            font-family: Arial, sans-serif;
            color: #0f172a;
        }

        .card {
            max-width: 560px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 5px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
        }

        .hero {
            padding: 28px;
            background: linear-gradient(135deg, #4f46e5, #1e1b4b);
            color: #ffffff;
        }

        .eyebrow {
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #c7d2fe;
        }

        .title {
            margin: 10px 0 0;
            font-size: 26px;
            line-height: 1.2;
        }

        .subtitle {
            margin: 8px 0 0;
            color: #e0e7ff;
            font-size: 14px;
        }

        .content {
            padding: 28px;
        }

        .greeting {
            margin: 0 0 12px;
            font-size: 18px;
            font-weight: 700;
        }

        .copy {
            margin: 0 0 22px;
            font-size: 15px;
            line-height: 1.7;
            color: #334155;
        }

        .panel {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 14px;
            padding: 18px;
            margin-bottom: 22px;
        }

        .row {
            margin-bottom: 10px;
            font-size: 14px;
            color: #334155;
        }

        .row:last-child {
            margin-bottom: 0;
        }

        .label {
            display: inline-block;
            min-width: 110px;
            font-weight: 700;
            color: #0f172a;
        }

        .cta {
            display: inline-block;
            padding: 13px 20px;
            border-radius: 999px;
            background: #4f46e5;
            color: #ffffff !important;
            text-decoration: none;
            font-weight: 700;
        }

        .note {
            margin: 18px 0 0;
            font-size: 13px;
            color: #64748b;
        }

        .footer {
            padding: 0 28px 24px;
            font-size: 12px;
            color: #94a3b8;
        }

        .logo-box {

            /* border-white/10 */
            padding: 4px;
            /* p-1 */
            border-radius: 6px;
            /* rounded-md */
            margin-bottom: 16px;

            /* shadow-md */
            display: inline-block;
        }

        .logo-box img {
            height: 56px;
            /* h-14 */
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
                    src="https://res.cloudinary.com/dsks5swu1/image/upload/v1775542094/erp_uploads/w2nxiqtmiugmebfaag3k.png" />
            </div>
            <div class="eyebrow">Faculty Access</div>
            <h1 class="title">Welcome to {{instituteName}}</h1>
            <p class="subtitle">Your teacher account is ready.</p>
        </div>
        <div class="content">
            <p class="greeting">Hello {{teacherName}},</p>
            <p class="copy">Your faculty account has been created successfully. Use the details below to sign in to the
                teacher portal.</p>
            <div class="panel">
                <div class="row"><span class="label">Email</span> {{email}}</div>
                <div class="row"><span class="label">Password</span> {{password}}</div>
            </div>
            <a class="cta" href="https://teacher.defactoinstitute.in/" target="_blank" rel="noopener noreferrer">Open
                Teacher Portal</a>
            <p class="note">Please sign in and complete your faculty profile when you first log in.</p>
        </div>
        <div class="footer">This email was sent by {{instituteName}}.</div>
    </div>
</body>

</html>`,
    subjectPush: 'Faculty Account Created',
    bodyPush: 'Welcome {{teacherName}}. Your faculty account has been created.',
    placeholders: ['teacherName', 'email', 'password', 'teacherPortalUrl', 'portalUrl', 'instituteName'],
    legacyBodies: [legacyBody]
};
