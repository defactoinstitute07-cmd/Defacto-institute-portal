const Notification = require('../models/Notification');
const Student = require('../models/Student');
const Teacher = require('../models/Teacher');
const Admin = require('../models/Admin');
const { getNotificationTemplateDefinition } = require('../config/notificationTemplates');
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
    recipientType = 'student',
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
            recipientType
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
        if (batchId && recipientType === 'student') {
            query.batchId = batchId;
        }
    }

    const Model = recipientType === 'teacher' ? require('../models/Teacher') : Student;
    const recipients = await Model.find(query)
        .select('name rollNo regNo className contact deviceTokens email')
        .lean();

    if (recipients.length === 0) {
        throw createHttpError(`No active ${recipientType === 'teacher' ? 'teachers' : 'students'} matched the selected recipients.`);
    }

    const summary = { total: recipients.length, sent: 0, partial: 0, failed: 0, logged: 0 };

    for (const recipient of recipients) {
        const channelResults = [];
        let pushResult;
        let emailResult;

        if (methods.includes('push')) {
            pushResult = await sendPushNotification({
                student: recipient,
                message,
                title,
                type,
                recipientType
            });
            channelResults.push(pushResult);
        }

        if (methods.includes('email')) {
            const rawEmailResult = await sendEmail({
                student: recipientType === 'student' ? recipient : null,
                teacher: recipientType === 'teacher' ? recipient : null,
                message,
                admin,
                subjectOverride: title,
                messageType: type,
                eventType: type,
                recipientRole: recipientType
            });

            // Transform for Notification model schema (requires 'status' field)
            emailResult = {
                status: rawEmailResult.success ? 'sent' : 'failed',
                providerMessageId: rawEmailResult.messageId || '',
                error: rawEmailResult.error || '',
                meta: rawEmailResult
            };
            channelResults.push(emailResult);
        }

        const status = deriveOverallStatus(channelResults);
        summary[status] += 1;

        await Notification.create({
            title,
            message,
            type,
            studentId: recipientType === 'student' ? recipient._id : null,
            teacherId: recipientType === 'teacher' ? recipient._id : null,
            createdBy: adminId,
            deliveryType,
            status,
            pushResult,
            emailResult,
            target: 'individual',
            targetId: String(recipient._id),
            recipientType
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

const getNotificationHistory = async ({ page = 1, limit = 5, status = '', deliveryType = '', studentId = '' }) => {
    // Automatically cleanup data older than 3 days
    await cleanupOldNotifications(3);

    const query = {};

    // Only fetch records from the last 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    query.createdAt = { $gte: threeDaysAgo };

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

const escapeHtml = (value) => String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const processTemplateText = (text, tokens, { escapeValues = false } = {}) => {
    let result = text || '';

    Object.keys(tokens).forEach((key) => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        const rawValue = tokens[key] !== undefined && tokens[key] !== null ? String(tokens[key]) : '';
        const value = escapeValues ? escapeHtml(rawValue) : rawValue;
        result = result.replace(regex, value);
    });

    return result;
};

const buildTemplateTokens = ({ recipient, recipientType, admin, data = {} }) => {
    const defaultPortalUrl = process.env.STUDENT_PORTAL_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;
    const defaultTeacherPortalUrl = process.env.TEACHER_PORTAL_URL || `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login`;

    return {
        studentName: recipientType === 'student' ? recipient?.name || '' : '',
        teacherName: recipientType === 'teacher' ? recipient?.name || '' : '',
        rollNo: recipientType === 'student' ? (recipient?.rollNo || '') : '',
        email: recipient?.email || '',
        instituteName: admin?.coachingName || 'The Institute',
        instituteLogo: admin?.instituteLogo || '',
        portalUrl: data.portalUrl || defaultPortalUrl,
        teacherPortalUrl: data.teacherPortalUrl || defaultTeacherPortalUrl,
        ...data
    };
};

const resolveNotificationTemplate = async ({
    eventType,
    recipient,
    recipientType,
    admin,
    fallbackMessage = '',
    fallbackSubjectEmail = 'Institute Notification',
    fallbackSubjectPush = 'ERP Notification',
    data = {}
}) => {
    const template = getNotificationTemplateDefinition(eventType);

    if (!template) {
        return {
            subjectEmail: fallbackSubjectEmail,
            bodyEmail: fallbackMessage,
            subjectPush: fallbackSubjectPush,
            bodyPush: fallbackMessage
        };
    }

    const tokens = buildTemplateTokens({ recipient, recipientType, admin, data });

    return {
        subjectEmail: processTemplateText(template.subject || fallbackSubjectEmail, tokens),
        bodyEmail: processTemplateText(template.body || fallbackMessage, tokens, { escapeValues: true }),
        subjectPush: processTemplateText(template.subjectPush || template.subject || fallbackSubjectPush, tokens),
        bodyPush: processTemplateText(template.bodyPush || template.body || fallbackMessage, tokens)
    };
};

const triggerAutomaticNotification = async ({
    eventType,
    studentId,
    teacherId,
    message: fallbackMessage,
    adminId = null,
    data = {},
    attachments = []
}) => {
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
            return;
        }

        const admin = adminId
            ? await Admin.findById(adminId).lean()
            : await Admin.findOne().lean();

        if (!admin || !admin.notificationsEnabled) {
            return;
        }

        // Check if specific event types are enabled in admin settings
        // If the object or key is missing, we default to TRUE for standard notifications
        const isEmailEnabled = admin.emailEvents?.[eventType] !== false;
        let isPushEnabled = admin.pushEvents?.[eventType] !== false;

        if (!isEmailEnabled && !isPushEnabled) {
            return;
        }

        const {
            subjectEmail,
            bodyEmail,
            subjectPush,
            bodyPush
        } = await resolveNotificationTemplate({
            eventType,
            recipient,
            recipientType,
            admin,
            fallbackMessage,
            fallbackSubjectEmail: 'Institute Notification',
            fallbackSubjectPush: 'ERP Notification',
            data
        });

        const methods = [];
        if (recipient.email && isEmailEnabled) methods.push('email');
        if (recipient.deviceTokens && recipient.deviceTokens.length > 0 && isPushEnabled) methods.push('push');

        if (methods.length === 0) {
            return;
        }

        let emailResult = null;
        let pushResult = null;
        // Dispatch Email
        if (methods.includes('email')) {
            emailResult = await sendEmail({
                student: recipientType === 'student' ? recipient : null,
                teacher: recipientType === 'teacher' ? recipient : null,
                message: bodyEmail,
                admin,
                subjectOverride: subjectEmail,
                attachments
            });
        }

        // Dispatch Push
        if (methods.includes('push')) {
            pushResult = await sendPushNotification({
                student: recipient,
                message: bodyPush,
                title: subjectPush,
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
            title: subjectPush, // Using push title for history display
            message: bodyPush,   // Using push body for history display
            type: eventType,
            studentId: recipientType === 'student' ? recipient._id : null,
            teacherId: recipientType === 'teacher' ? recipient._id : null,
            createdBy: admin._id,
            deliveryType: deriveDeliveryType(methods),
            recipientType,
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

    } catch (error) {
        console.error(`[AutoNotification] Error triggering ${eventType}`);
    }
};

const cleanupOldNotifications = async (days = 7) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // We only delete notifications that are NOT scheduled in the future (though cutoffDate handles that)
    const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        status: { $ne: 'scheduled' }
    });

    return { deletedCount: result.deletedCount, cutoffDate };
};

module.exports = {
    sendNotificationBatch,
    getRecipients,
    getNotificationHistory,
    triggerAutomaticNotification,
    cleanupOldNotifications,
    resolveNotificationTemplate
};
