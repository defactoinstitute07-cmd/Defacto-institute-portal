const nodemailer = require('nodemailer');

const transporterCache = globalThis.__erpEmailTransporters || (globalThis.__erpEmailTransporters = new Map());

/**
 * Creates / retrieves a cached Brevo SMTP transporter.
 * Falls back to Gmail SMTP when Brevo credentials are absent.
 */
const getTransporter = ({ brevoUser, brevoPass, gmailUser, gmailPass }) => {
    // Prefer Brevo, fall back to Gmail
    if (brevoUser && brevoPass) {
        const cacheKey = `brevo::${brevoUser}::${brevoPass}`;
        if (!transporterCache.has(cacheKey)) {
            transporterCache.set(cacheKey, nodemailer.createTransport({
                host: 'smtp-relay.brevo.com',
                port: 587,
                secure: false,
                auth: {
                    user: brevoUser,
                    pass: brevoPass
                }
            }));
        }
        return { transporter: transporterCache.get(cacheKey), fromEmail: brevoUser, source: 'brevo' };
    }

    if (gmailUser && gmailPass) {
        const cacheKey = `gmail::${gmailUser}::${gmailPass}`;
        if (!transporterCache.has(cacheKey)) {
            transporterCache.set(cacheKey, nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: gmailUser,
                    pass: gmailPass
                }
            }));
        }
        return { transporter: transporterCache.get(cacheKey), fromEmail: gmailUser, source: 'gmail' };
    }

    return null;
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

        // Build credential candidates in priority order: Brevo → Gmail
        const credentialCandidates = [];

        // 1. Admin-level Brevo credentials (from DB)
        if (admin?.brevoEmail && admin?.brevoSmtpKey) {
            credentialCandidates.push({
                brevoUser: admin.brevoEmail,
                brevoPass: admin.brevoSmtpKey,
                source: 'admin-brevo'
            });
        }

        // 2. Environment Brevo credentials
        const envBrevoUser = process.env.BREVO_SMTP_USER || process.env.BREVO_EMAIL;
        const envBrevoKey = process.env.BREVO_SMTP_KEY;
        if (envBrevoUser && envBrevoKey) {
            credentialCandidates.push({
                brevoUser: envBrevoUser,
                brevoPass: envBrevoKey,
                source: 'env-brevo'
            });
        }

        // 3. Admin-level Gmail credentials (legacy fallback)
        if (admin?.gmailEmail && admin?.gmailAppPassword) {
            credentialCandidates.push({
                gmailUser: admin.gmailEmail,
                gmailPass: admin.gmailAppPassword,
                source: 'admin-gmail'
            });
        }

        // 4. Environment Gmail credentials (legacy fallback)
        const envGmailUser = process.env.GMAIL_USER || process.env.GMAIL_EMAIL;
        const envGmailPass = process.env.GMAIL_APP_PASSWORD;
        if (envGmailUser && envGmailPass) {
            credentialCandidates.push({
                gmailUser: envGmailUser,
                gmailPass: envGmailPass,
                source: 'env-gmail'
            });
        }

        if (credentialCandidates.length === 0) {
            console.log('[Email] Warning: No email credentials configured (Brevo or Gmail).');
            return { success: false, reason: 'Credentials not configured' };
        }

        const htmlBody = toHtmlMessage(message);
        const textBody = toPlainTextMessage(htmlBody || message);
        let lastError = null;

        for (const creds of credentialCandidates) {
            try {
                const result = getTransporter(creds);
                if (!result) continue;

                const { transporter, fromEmail, source } = result;

                const mailOptions = {
                    from: fromEmail,
                    to: recipient.email,
                    subject: subjectOverride || 'New Notification from Institute',
                    html: htmlBody,
                    text: textBody,
                    attachments: attachments || []
                };

                const sendResult = await transporter.sendMail(mailOptions);
                console.log(`[Email] Notification sent via ${creds.source || source} credentials`);
                return { success: true, messageId: sendResult.messageId, provider: source };
            } catch (error) {
                lastError = error;
                console.error(`[Email] Send failed via ${creds.source} credentials:`, error.message);
            }
        }

        return { success: false, error: lastError?.message || 'Email send failed' };
    } catch (error) {
        console.error('[Email] Failed to send notification email');
        return { success: false, error: error.message };
    }
};
