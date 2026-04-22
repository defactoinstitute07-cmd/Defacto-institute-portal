const nodemailer = require('nodemailer');

const transporterCache = globalThis.__erpEmailTransporters || (globalThis.__erpEmailTransporters = new Map());

const getTransporter = (user, pass) => {
    const cacheKey = `${user}::${pass}`;
    if (!transporterCache.has(cacheKey)) {
        transporterCache.set(cacheKey, nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user,
                pass
            }
        }));
    }

    return transporterCache.get(cacheKey);
};

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const hasHtmlMarkup = (value = '') => /<\/?[a-z][\s\S]*>/i.test(String(value || ''));

const toHtmlMessage = (message = '') => {
    const text = String(message || '').trim();
    if (!text) return '';

    if (hasHtmlMarkup(text)) return text;

    return escapeHtml(text)
        .replace(/\n\n+/g, '</p><p>')
        .replace(/\n/g, '<br/>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
};

const decodeHtmlEntities = (value = '') => String(value || '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, '\'');

const toPlainTextMessage = (message = '') => {
    const text = String(message || '').trim();
    if (!text) return '';

    if (!hasHtmlMarkup(text)) return text;

    return decodeHtmlEntities(
        text
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<\s*br\s*\/?\s*>/gi, '\n')
            .replace(/<\/(p|div|section|article|tr|table|h[1-6])>/gi, '\n')
            .replace(/<\s*li[^>]*>/gi, '- ')
            .replace(/<\/li>/gi, '\n')
            .replace(/<[^>]*>/g, ' ')
    )
        .replace(/[ \t]+\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
};

exports.sendEmail = async ({
    student,
    teacher,
    message,
    admin,
    subjectOverride,
    attachments
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

        const htmlBody = toHtmlMessage(message);
        const textBody = toPlainTextMessage(htmlBody || message);
        let lastError = null;

        for (const creds of credentialCandidates) {
            try {
                const transporter = getTransporter(creds.email, creds.appPassword);

                const mailOptions = {
                    from: creds.email,
                    to: recipient.email,
                    subject: subjectOverride || 'New Notification from Institute',
                    html: htmlBody,
                    text: textBody,
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
