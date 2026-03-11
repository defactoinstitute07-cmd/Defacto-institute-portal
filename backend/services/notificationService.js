const Notification = require('../models/Notification');
const Student = require('../models/Student');
const { sendPushNotification } = require('./pushNotificationService');
const { sendWhatsAppMessage } = require('./whatsappService');

const createHttpError = (message, status = 400) => {
    const error = new Error(message);
    error.status = status;
    return error;
};

const normalizeDeliveryMethods = (deliveryMethods = []) => {
    const methods = Array.from(new Set(
        deliveryMethods
            .map(method => String(method || '').toLowerCase())
            .filter(method => ['push', 'whatsapp'].includes(method))
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

const sendNotificationBatch = async ({ message, studentIds = [], sendToAll = false, deliveryMethods = [], adminId = null }) => {
    const methods = normalizeDeliveryMethods(deliveryMethods);
    const deliveryType = deriveDeliveryType(methods);

    const studentQuery = { status: 'active' };
    if (!sendToAll) {
        studentQuery._id = { $in: studentIds };
    }

    const students = await Student.find(studentQuery)
        .select('name rollNo className contact deviceTokens')
        .lean();

    if (students.length === 0) {
        throw createHttpError('No active students matched the selected recipients.');
    }

    const notifications = [];
    const summary = { total: students.length, sent: 0, partial: 0, failed: 0, logged: 0 };

    for (const student of students) {
        const channelResults = [];
        let pushResult;
        let whatsappResult;

        if (methods.includes('push')) {
            pushResult = await sendPushNotification({ student, message });
            channelResults.push(pushResult);
        }

        if (methods.includes('whatsapp')) {
            whatsappResult = await sendWhatsAppMessage({ student, message });
            channelResults.push(whatsappResult);
        }

        const status = deriveOverallStatus(channelResults);
        summary[status] += 1;

        const notification = await Notification.create({
            message,
            studentId: student._id,
            createdBy: adminId,
            deliveryType,
            status,
            pushResult,
            whatsappResult
        });

        notifications.push(notification);
    }

    return {
        summary,
        deliveryType,
        notifications
    };
};

const getRecipients = async ({ search = '', page = 1, limit = 25 }) => {
    const query = { status: 'active' };

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: 'i' } },
            { rollNo: { $regex: search, $options: 'i' } },
            { className: { $regex: search, $options: 'i' } },
            { contact: { $regex: search, $options: 'i' } }
        ];
    }

    const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
    const safePage = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (safePage - 1) * safeLimit;

    const [students, total] = await Promise.all([
        Student.find(query)
            .select('name rollNo className contact deviceTokens')
            .sort({ name: 1 })
            .skip(skip)
            .limit(safeLimit)
            .lean(),
        Student.countDocuments(query)
    ]);

    return {
        students,
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

module.exports = {
    sendNotificationBatch,
    getRecipients,
    getNotificationHistory
};
