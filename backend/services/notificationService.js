const Notification = require('../models/Notification');
const Student = require('../models/Student');
const Admin = require('../models/Admin');
const NotificationTemplate = require('../models/NotificationTemplate');
const { sendPushNotification } = require('./pushNotificationService');
const { sendEmail } = require('./emailService');

const createHttpError = (message, status = 400) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const normalizeDeliveryMethods = (deliveryMethods = []) => {
    const methods = Array.from(new Set(
        deliveryMethods
            .map(method => String(method || '').toLowerCase())
            .filter(method => ['push', 'email'].includes(method))
    ));

    if (methods.length === 0) {
        throw createHttpError('At least one delivery method must be selected.');
    }

    return methods;
};

const deriveDeliveryType = (methods) => {
    if (methods.length === 2) return 'both';
    return methods[0];
};

const countValidDeviceTokens = (deviceTokens = []) =>
    Array.isArray(deviceTokens)
        ? deviceTokens.filter((token) => typeof token === 'string' && token.trim().length > 10).length
        : 0;

const deriveRecipientActivity = (recipient) => {
    const onlineMinutes = Math.max(parseInt(process.env.ACTIVITY_ONLINE_MINUTES || '5', 10) || 5, 1);
    const inactiveDays = Math.max(parseInt(process.env.ACTIVITY_INACTIVE_DAYS || '7', 10) || 7, 1);
    const lastActiveAt = recipient.lastActiveAt || recipient.lastAppOpenAt || recipient.portalAccess?.lastLoginAt || null;

    if (!lastActiveAt) {
        return {
            status: 'inactive',
            lastActiveAt: null,
            lastAppOpenAt: recipient.lastAppOpenAt || null,
            device: recipient.lastDevice || {}
        };
    }

    const now = Date.now();
    const diffMs = now - new Date(lastActiveAt).getTime();
    const minutesSince = diffMs / (60 * 1000);
    const daysSince = diffMs / (24 * 60 * 60 * 1000);

    let status = 'offline';
    if (minutesSince <= onlineMinutes) status = 'online';
    if (daysSince >= inactiveDays) status = 'inactive';

    return {
        status,
        lastActiveAt,
        lastAppOpenAt: recipient.lastAppOpenAt || null,
        device: recipient.lastDevice || {}
    };
};

const deriveOverallStatus = (results) => {
    if (!results.length) return 'failed';

    const statuses = results.map(result => result.status);

    if (statuses.every(status => status === 'sent')) return 'sent';
    if (statuses.every(status => status === 'logged')) return 'logged';
    if (statuses.some(status => status === 'partial')) return 'partial';
    if (statuses.some(status => status === 'sent' || status === 'logged')) {
        return statuses.every(status => status === 'sent' || status === 'logged')
            ? (statuses.includes('logged') ? 'logged' : 'sent')
            : 'partial';
    }

    return 'failed';
};

const sendNotificationBatch = async ({ 
    title, 
    message, 
    type = 'general',
    studentIds = [], 
    sendToAll = false, 
    deliveryMethods = [], 
    batchId = '', 
    adminId = null, 
    scheduledFor = null
}) => {
    const methods = normalizeDeliveryMethods(deliveryMethods);
    const deliveryType = deriveDeliveryType(methods);

    // If scheduled, just save to DB with 'scheduled' status
    if (scheduledFor && new Date(scheduledFor) > new Date()) {
        const notificationRecord = await Notification.create({
            title,
            message,
            type,
            createdBy: adminId,
            deliveryType,
            status: 'scheduled',
            scheduledFor,
            target: sendToAll ? 'all' : (batchId ? 'batch' : 'individual'),
            targetId: sendToAll ? 'all' : (batchId || studentIds.join(',')),
        });
        return { status: 'scheduled', notification: notificationRecord };
    }

    let admin = null;
    if (adminId) {
        admin = await Admin.findById(adminId).lean();
    }

    const query = { status: 'active' };
    if (!sendToAll) {
        if (Array.isArray(studentIds) && studentIds.length > 0) {
            query._id = { $in: studentIds };
        }
        if (batchId) {
            query.batchId = batchId;
        }
    }

    const recipients = await Student.find(query)
        .select('name rollNo className contact deviceTokens email')
        .lean();

    if (recipients.length === 0) {
        throw createHttpError(`No active students matched the selected recipients.`);
    }

    const summary = { total: recipients.length, sent: 0, partial: 0, failed: 0, logged: 0 };

    for (const recipient of recipients) {
        const channelResults = [];
        let pushResult;
        let emailResult;

        if (methods.includes('push')) {
            pushResult = await sendPushNotification({ student: recipient, message, title, type });
            channelResults.push(pushResult);
        }

        if (methods.includes('email')) {
            emailResult = await sendEmail({ student: recipient, message, admin, subjectOverride: title });
            channelResults.push(emailResult);
        }

        const status = deriveOverallStatus(channelResults);
        summary[status] += 1;

        await Notification.create({
            title,
            message,
            type,
            studentId: recipient._id,
            createdBy: adminId,
            deliveryType,
            status,
            pushResult,
            emailResult,
            target: 'individual',
            targetId: String(recipient._id)
        });
    }

    return { summary, deliveryType };
};

const getRecipients = async ({ search = '', page = 1, limit = 25, status = 'active', batchId = '', hasPendingFees = 'false', hasPushToken = 'false', recipientType = 'student' }) => {
    const query = {};

    if (status && status !== 'all') {
        query.status = status;
    }

    if (batchId && recipientType === 'student') {
        query.batchId = batchId;
    }

    if (hasPendingFees === 'true' && recipientType === 'student') {
        // Find students where feesPaid < fees
        query.$expr = { $lt: ['$feesPaid', '$fees'] };
    }

    if (hasPushToken === 'true') {
        query['deviceTokens.0'] = { $exists: true };
    }

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { rollNo: { $regex: search, $options: 'i' } },
            { regNo: { $regex: search, $options: 'i' } },
            { className: { $regex: search, $options: 'i' } },
            { contact: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
        ];
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const Model = recipientType === 'teacher' ? require('../models/Teacher') : Student;
    const [recipients, total] = await Promise.all([
        Model.find(query)
            .select('name rollNo regNo className contact email deviceTokens lastActiveAt lastAppOpenAt lastDevice')
            .sort({ name: 1 })
            .skip(skip)
            .limit(safeLimit)
            .lean(),
        Model.countDocuments(query)
    ]);

    return {
        students: recipients.map((recipient) => {
            const deviceTokenCount = countValidDeviceTokens(recipient.deviceTokens);
            return {
                ...recipient,
                activity: deriveRecipientActivity(recipient),
                pushStatus: {
                    enabled: deviceTokenCount > 0,
                    deviceTokenCount
                }
            };
        }),
        total,
        page: safePage,
        pages: Math.ceil(total / safeLimit)
    };
};

const getNotificationHistory = async ({ page = 1, limit = 20, status = '', deliveryType = '', studentId = '' }) => {
    const query = {};
    if (status) query.status = status;
    if (deliveryType) query.deliveryType = deliveryType;
    if (studentId) query.studentId = studentId;

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [notifications, total] = await Promise.all([
        Notification.find(query)
            .populate('studentId', 'name rollNo className contact')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(safeLimit)
            .lean(),
        Notification.countDocuments(query)
    ]);

    return {
        notifications,
        total,
        page: safePage,
        pages: Math.ceil(total / safeLimit)
    };
};

const triggerAutomaticNotification = async ({ eventType, studentId, teacherId, message: fallbackMessage, adminId = null, data = {} }) => {
    try {
        let recipient = null;
        let recipientType = 'student';

        if (studentId) {
            recipient = await Student.findById(studentId).lean();
            recipientType = 'student';
        } else if (teacherId) {
            recipient = await Teacher.findById(teacherId).lean();
            recipientType = 'teacher';
        }

        if (!recipient) {
            console.log(`[AutoNotification] Skipped: No recipient found`);
            return;
        }

        const admin = adminId
            ? await Admin.findById(adminId).lean()
            : await Admin.findOne().lean();

        if (!admin || !admin.notificationsEnabled) {
            console.log(`[AutoNotification] Skipped: Notifications disabled globally`);
            return;
        }

        // Check if this specific event type is enabled in emailEvents (using it as a proxy for both if not separated)
        if (admin.emailEvents && admin.emailEvents[eventType] === false) {
            console.log(`[AutoNotification] Skipped: Event type ${eventType} is disabled in settings`);
            return;
        }

        // Fetch custom template
        const template = await NotificationTemplate.findOne({ eventType, isActive: true }).lean();

        let subject = 'Institute Notification';
        let body = fallbackMessage;

        if (template) {
            subject = template.subject;
            body = template.body;

            // Prepare replacement tokens
            const tokens = {
                studentName: recipientType === 'student' ? recipient.name : '',
                teacherName: recipientType === 'teacher' ? recipient.name : '',
                rollNo: recipientType === 'student' ? (recipient.rollNo || '') : '',
                email: recipient.email || '',
                instituteName: admin.coachingName || 'The Institute',
                ...data
            };

            // Replace placeholders in subject and body
            Object.keys(tokens).forEach(key => {
                const regex = new RegExp(`{{${key}}}`, 'g');
                const val = tokens[key] !== undefined && tokens[key] !== null ? String(tokens[key]) : '';
                subject = subject.replace(regex, val);
                body = body.replace(regex, val);
            });
        }

        const methods = [];
        if (recipient.email) methods.push('email');
        if (recipient.deviceTokens && recipient.deviceTokens.length > 0) methods.push('push');

        if (methods.length === 0) {
            console.log(`[AutoNotification] Skipped: No delivery methods available for ${recipient.name}`);
            return;
        }

        let emailResult = null;
        let pushResult = null;

        // Dispatch Email
        if (methods.includes('email')) {
            emailResult = await sendEmail({
                student: recipientType === 'student' ? recipient : null,
                teacher: recipientType === 'teacher' ? recipient : null,
                message: body,
                admin,
                subjectOverride: subject
            });
        }

        // Dispatch Push
        if (methods.includes('push')) {
            pushResult = await sendPushNotification({
                student: recipient,
                message: body,
                title: subject,
                type: eventType,
                data: data
            });
        }

        // Record in Notification collection so it shows in history
        const channelResults = [];
        if (emailResult) channelResults.push({ status: emailResult.success ? 'sent' : 'failed' });
        if (pushResult) channelResults.push(pushResult);

        const overallStatus = deriveOverallStatus(channelResults);

        await Notification.create({
            title: subject,
            message: body,
            type: eventType,
            studentId: recipientType === 'student' ? recipient._id : null,
            teacherId: recipientType === 'teacher' ? recipient._id : null,
            createdBy: admin._id,
            deliveryType: deriveDeliveryType(methods),
            status: overallStatus,
            emailResult: emailResult ? {
                status: emailResult.success ? 'sent' : 'failed',
                providerMessageId: emailResult.messageId || '',
                error: emailResult.error || '',
                meta: emailResult
            } : undefined,
            pushResult: pushResult || undefined,
            target: 'individual',
            targetId: String(recipient._id)
        });

        console.log(`[AutoNotification] Event ${eventType} triggered for ${recipient.name} via [${methods.join(', ')}]`);
    } catch (error) {
        console.error(`[AutoNotification] Error triggering ${eventType}:`, error);
    }
};

module.exports = {
    sendNotificationBatch,
    getRecipients,
    getNotificationHistory,
    triggerAutomaticNotification
};
