const PUSH_TITLE = process.env.PUSH_NOTIFICATION_TITLE || 'ERP Notification';

const sendPushNotification = async ({ student, message }) => {
    const deviceTokens = Array.from(new Set((student.deviceTokens || []).filter(Boolean)));

    if (deviceTokens.length === 0) {
        return {
            status: 'failed',
            error: 'No registered device tokens for this student.',
            meta: {}
        };
    }

    if (!process.env.FCM_SERVER_KEY) {
        console.log('[PushNotificationService] FCM_SERVER_KEY missing. Logging push payload instead.', {
            studentId: String(student._id),
            tokens: deviceTokens.length,
            message
        });

        return {
            status: 'logged',
            error: '',
            meta: { simulated: true, tokens: deviceTokens.length }
        };
    }

    try {
        const response = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `key=${process.env.FCM_SERVER_KEY}`
            },
            body: JSON.stringify({
                registration_ids: deviceTokens,
                notification: {
                    title: PUSH_TITLE,
                    body: message
                },
                data: {
                    type: 'admin_notification',
                    studentId: String(student._id)
                }
            })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            return {
                status: 'failed',
                error: payload.error || `FCM request failed with HTTP ${response.status}`,
                meta: payload
            };
        }

        const successCount = Number(payload.success || 0);
        const failureCount = Number(payload.failure || 0);

        if (successCount > 0 && failureCount === 0) {
            return {
                status: 'sent',
                providerMessageId: payload.multicast_id ? String(payload.multicast_id) : '',
                error: '',
                meta: { successCount, failureCount }
            };
        }

        if (successCount > 0) {
            return {
                status: 'partial',
                providerMessageId: payload.multicast_id ? String(payload.multicast_id) : '',
                error: `${failureCount} device token(s) failed.`,
                meta: { successCount, failureCount, results: payload.results || [] }
            };
        }

        return {
            status: 'failed',
            providerMessageId: payload.multicast_id ? String(payload.multicast_id) : '',
            error: payload.results?.[0]?.error || 'FCM did not accept any delivery targets.',
            meta: payload
        };
    } catch (error) {
        return {
            status: 'failed',
            error: error.message,
            meta: {}
        };
    }
};

module.exports = { sendPushNotification };
