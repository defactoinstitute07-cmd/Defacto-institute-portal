const normalizePhoneNumber = (rawPhone) => {
    const digits = String(rawPhone || '').replace(/\D/g, '');
    if (!digits) return '';
    if (digits.startsWith('00')) return digits.slice(2);
    if (digits.startsWith('91') || digits.length > 10) return digits;
    return `${process.env.WHATSAPP_DEFAULT_COUNTRY_CODE || '91'}${digits}`;
};

const getWhatsAppApiUrl = () => {
    if (process.env.WHATSAPP_API_URL) {
        return process.env.WHATSAPP_API_URL;
    }

    if (process.env.WHATSAPP_PHONE_NUMBER_ID) {
        return `https://graph.facebook.com/v20.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
    }

    return '';
};

const sendWhatsAppMessage = async ({ student, message }) => {
    const phone = normalizePhoneNumber(student.contact);
    if (!phone) {
        return {
            status: 'failed',
            error: 'No contact number available for WhatsApp delivery.',
            meta: {}
        };
    }

    const apiUrl = getWhatsAppApiUrl();
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (!apiUrl || !accessToken) {
        console.log('[WhatsAppService] WhatsApp credentials missing. Logging message instead.', {
            studentId: String(student._id),
            phone,
            message
        });

        return {
            status: 'logged',
            error: '',
            meta: { simulated: true, phone }
        };
    }

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                recipient_type: 'individual',
                to: phone,
                type: 'text',
                text: {
                    preview_url: false,
                    body: message
                }
            })
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
            return {
                status: 'failed',
                error: payload.error?.message || `WhatsApp request failed with HTTP ${response.status}`,
                meta: payload
            };
        }

        return {
            status: 'sent',
            providerMessageId: payload.messages?.[0]?.id || '',
            error: '',
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

module.exports = { sendWhatsAppMessage };
