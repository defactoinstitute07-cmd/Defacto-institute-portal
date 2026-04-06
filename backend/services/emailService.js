const nodemailer = require('nodemailer');

const createTransporter = (user, pass) => nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user,
        pass
    }
});

const THEME_MAP = {
    success: {
        band: '#065f46',
        accent: '#10b981',
        soft: '#ecfdf5',
        label: 'Success Update'
    },
    alert: {
        band: '#991b1b',
        accent: '#ef4444',
        soft: '#fef2f2',
        label: 'Important Alert'
    },
    info: {
        band: '#1e3a8a',
        accent: '#3b82f6',
        soft: '#eff6ff',
        label: 'Information'
    }
};

const detectTheme = (messageType = '', eventType = '') => {
    const normalizedType = String(messageType || '').toLowerCase();
    const normalizedEvent = String(eventType || '').toLowerCase();

    if (['success', 'paid', 'completed'].includes(normalizedType) || ['feepayment'].includes(normalizedEvent)) {
        return 'success';
    }

    if (['alert', 'warning', 'danger', 'overdue'].includes(normalizedType) || ['feeoverdue', 'surchargeadded'].includes(normalizedEvent)) {
        return 'alert';
    }

    return 'info';
};

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toHtmlMessage = (message = '') => {
    const text = String(message || '').trim();
    if (!text) return '';

    const hasHtmlTag = /<\/?[a-z][\s\S]*>/i.test(text);
    if (hasHtmlTag) return text;

    return escapeHtml(text)
        .replace(/\n\n+/g, '</p><p>')
        .replace(/\n/g, '<br/>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
};

const buildNotificationEmailTemplate = ({
    subject,
    bodyMessage,
    recipientName,
    recipientRole,
    theme = 'info',
    instituteName,
    instituteLogo,
    studentPortalUrl,
    teacherPortalUrl,
    eventType
}) => {
    const palette = THEME_MAP[theme] || THEME_MAP.info;
    const safeInstituteName = escapeHtml(instituteName || 'Institute ERP');
    const safeRecipientName = escapeHtml(recipientName || 'User');
    const safeSubject = escapeHtml(subject || 'Notification');
    const roleLabel = recipientRole === 'teacher' ? 'Teacher' : 'Student';
    const safeRoleLabel = escapeHtml(roleLabel);
    const safeTeacherPortal = escapeHtml(teacherPortalUrl || '#');
    const safeStudentPortal = escapeHtml(studentPortalUrl || '#');
    const logoMarkup = instituteLogo
        ? `<img src="${escapeHtml(instituteLogo)}" alt="${safeInstituteName} Logo" class="logo"/>`
        : `<div class="brand-pill">${safeInstituteName}</div>`;

    const isStudentRegistration = String(eventType || '').toLowerCase() === 'studentregistration';
    const portalBlock = isStudentRegistration
        ? `
            <div class="cta-wrap">
                <a class="cta" href="https://student.defactoinstitute.in" target="_blank" rel="noopener noreferrer">Open Student Portal</a>
            </div>
          `
        : `
            <div class="app-note">Please check in your app for the latest details and action items.</div>
          `;

    const teacherInstruction = recipientRole === 'teacher'
        ? `
            <div class="teacher-note">
                Teacher access note: Please log in only through your dedicated Teacher Portal.
                <a href="${safeTeacherPortal}" target="_blank" rel="noopener noreferrer">Open Teacher Portal</a>
            </div>
          `
        : '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
        body {
            margin: 0;
            padding: 0;
            background: #f8fafc;
            font-family: 'Segoe UI', Arial, sans-serif;
            color: #0f172a;
            line-height: 1.6;
        }
        .wrap {
            width: 100%;
            padding: 24px 14px;
            box-sizing: border-box;
        }
        .card {
            max-width: 620px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e2e8f0;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
        }
        .header {
            background: ${palette.band};
            padding: 22px 24px;
        }
        .logo {
            max-height: 44px;
            max-width: 170px;
            display: block;
            margin-bottom: 10px;
        }
        .brand-pill {
            display: inline-block;
            background: rgba(255, 255, 255, 0.15);
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
            padding: 6px 10px;
            border-radius: 6px;
            margin-bottom: 10px;
        }
        .header-title {
            color: #ffffff;
            font-size: 20px;
            margin: 0;
            font-weight: 800;
            letter-spacing: -0.01em;
        }
        .header-meta {
            margin-top: 8px;
            display: inline-block;
            padding: 4px 10px;
            font-size: 11px;
            font-weight: 700;
            color: #ffffff;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 999px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }
        .content {
            padding: 24px;
        }
        .greeting {
            font-size: 15px;
            font-weight: 700;
            margin: 0 0 14px 0;
            color: #0f172a;
        }
        .message {
            font-size: 14px;
            color: #334155;
            margin: 0;
        }
        .theme-strip {
            margin-top: 18px;
            border-left: 4px solid ${palette.accent};
            background: ${palette.soft};
            padding: 12px;
            border-radius: 8px;
            font-size: 13px;
            color: #334155;
        }
        .cta-wrap {
            margin-top: 18px;
        }
        .cta {
            display: inline-block;
            background: ${palette.band};
            color: #ffffff !important;
            text-decoration: none;
            font-weight: 700;
            font-size: 13px;
            padding: 10px 16px;
            border-radius: 8px;
        }
        .app-note {
            margin-top: 18px;
            font-size: 13px;
            color: #475569;
            font-weight: 600;
        }
        .teacher-note {
            margin-top: 14px;
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: #f8fafc;
            font-size: 12.5px;
            color: #334155;
        }
        .teacher-note a {
            margin-left: 6px;
            color: ${palette.band};
            font-weight: 700;
            text-decoration: none;
        }
        .footer {
            padding: 14px 24px 22px;
            border-top: 1px solid #f1f5f9;
            font-size: 11.5px;
            color: #94a3b8;
            text-align: center;
        }
        @media (max-width: 640px) {
            .wrap { padding: 12px 8px; }
            .header { padding: 18px 16px; }
            .content { padding: 18px 16px; }
            .header-title { font-size: 17px; }
        }
    </style>
</head>
<body>
    <div class="wrap">
        <div class="card">
            <div class="header">
                ${logoMarkup}
                <h1 class="header-title">${safeSubject}</h1>
                <div class="header-meta">${escapeHtml(palette.label)} • ${safeRoleLabel}</div>
            </div>
            <div class="content">
                <p class="greeting">Hello ${safeRecipientName},</p>
                <div class="message">${bodyMessage}</div>
                <div class="theme-strip">This is a ${escapeHtml(palette.label.toLowerCase())} notification from ${safeInstituteName}.</div>
                ${portalBlock}
                ${teacherInstruction}
            </div>
            <div class="footer">
                This is an automated message from ${safeInstituteName}. Please do not reply to this email.
            </div>
        </div>
    </div>
</body>
</html>
`;
};

exports.sendEmail = async ({
    student,
    teacher,
    message,
    admin,
    subjectOverride,
    attachments,
    messageType = 'info',
    eventType = '',
    recipientRole,
    portalUrl,
    teacherPortalUrl
}) => {
    const recipient = student || teacher;

    try {
        if (!recipient || !recipient.email) {
            console.log('[Email] Skipped - No recipient email found');
            return { success: false, reason: 'No email address' };
        }

        const adminEmail = admin?.gmailEmail;
        const adminAppPassword = admin?.gmailAppPassword;
        const envEmail = process.env.GMAIL_USER || process.env.GMAIL_EMAIL;
        const envAppPassword = process.env.GMAIL_APP_PASSWORD;

        const credentialCandidates = [];
        if (adminEmail && adminAppPassword) {
            credentialCandidates.push({ email: adminEmail, appPassword: adminAppPassword, source: 'admin' });
        }
        if (envEmail && envAppPassword) {
            credentialCandidates.push({ email: envEmail, appPassword: envAppPassword, source: 'env' });
        }

        if (credentialCandidates.length === 0) {
            console.log('[Email] Warning: Gmail Email or App Password not configured.');
            return { success: false, reason: 'Credentials not configured' };
        }

        let lastError = null;

        for (const creds of credentialCandidates) {
            try {
                const transporter = createTransporter(creds.email, creds.appPassword);

                const resolvedRole = recipientRole || (teacher ? 'teacher' : 'student');
                const studentPortal = portalUrl || process.env.STUDENT_PORTAL_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
                const dedicatedTeacherPortal = teacherPortalUrl || process.env.TEACHER_PORTAL_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
                const theme = detectTheme(messageType, eventType);
                const htmlBody = buildNotificationEmailTemplate({
                    subject: subjectOverride || 'Notification from Institute',
                    bodyMessage: toHtmlMessage(message),
                    recipientName: recipient.name,
                    recipientRole: resolvedRole,
                    theme,
                    instituteName: admin?.coachingName || 'Institute ERP',
                    instituteLogo: admin?.instituteLogo || '',
                    studentPortalUrl: studentPortal,
                    teacherPortalUrl: dedicatedTeacherPortal,
                    eventType
                });

                const mailOptions = {
                    from: creds.email,
                    to: recipient.email,
                    subject: subjectOverride || 'New Notification from Institute',
                    html: htmlBody,
                    text: String(message || '').replace(/<[^>]*>/g, ''),
                    attachments: attachments || []
                };

                const result = await transporter.sendMail(mailOptions);
                console.log(`[Email] Notification sent via ${creds.source} credentials`);
                return { success: true, messageId: result.messageId };
            } catch (error) {
                lastError = error;
                console.error(`[Email] Send failed via ${creds.source} credentials`);
            }
        }

        return { success: false, error: lastError?.message || 'Email send failed' };
    } catch (error) {
        console.error('[Email] Failed to send notification email');
        return { success: false, error: error.message };
    }
};
