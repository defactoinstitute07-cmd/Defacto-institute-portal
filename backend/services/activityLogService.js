const logNotificationEvent = async ({ recipientEmail, recipientName, subject, type, data = {} }) => {
    const entry = {
        channel: 'internal-log',
        recipientEmail: recipientEmail || '',
        recipientName: recipientName || '',
        subject,
        type,
        data,
        loggedAt: new Date().toISOString()
    };
    return entry;
};

module.exports = { logNotificationEvent };
