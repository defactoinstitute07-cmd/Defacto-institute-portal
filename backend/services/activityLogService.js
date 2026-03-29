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

    console.log('[NotificationEvent] Event logged');
    return entry;
};

module.exports = { logNotificationEvent };
