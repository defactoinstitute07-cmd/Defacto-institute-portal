const notificationService = require('../services/notificationService');

exports.getRecipients = async (req, res, next) => {
    try {
        const result = await notificationService.getRecipients(req.query);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

exports.getHistory = async (req, res, next) => {
    try {
        const result = await notificationService.getNotificationHistory(req.query);
        res.json({ success: true, ...result });
    } catch (error) {
        next(error);
    }
};

exports.sendNotifications = async (req, res, next) => {
    try {
        const { message = '', studentIds = [], sendToAll = false, deliveryMethods = [] } = req.body;

        if (!String(message).trim()) {
            return res.status(400).json({ success: false, message: 'Message is required.' });
        }

        if (!Array.isArray(deliveryMethods) || deliveryMethods.length === 0) {
            return res.status(400).json({ success: false, message: 'Select at least one delivery method.' });
        }

        if (!sendToAll && (!Array.isArray(studentIds) || studentIds.length === 0)) {
            return res.status(400).json({ success: false, message: 'Select at least one student or choose all students.' });
        }

        const result = await notificationService.sendNotificationBatch({
            message: String(message).trim(),
            studentIds,
            sendToAll: sendToAll === true,
            deliveryMethods,
            adminId: req.admin?.id || null
        });

        res.status(201).json({
            success: true,
            message: `Notifications processed for ${result.summary.total} student(s).`,
            ...result
        });
    } catch (error) {
        next(error);
    }
};
