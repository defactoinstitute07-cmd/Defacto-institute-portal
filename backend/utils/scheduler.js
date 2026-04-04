const cron = require('node-cron');
const Notification = require('../models/Notification');
const { sendNotificationBatch } = require('../services/notificationService');

/**
 * Initialize background cron jobs
 */
const initScheduler = () => {
    cron.schedule('* * * * *', async () => {
        const now = new Date();

        try {
            const pendingNotifications = await Notification.find({
                status: 'scheduled',
                scheduledFor: { $lte: now }
            });

            if (pendingNotifications.length > 0) {
                for (const notif of pendingNotifications) {
                    try {
                        notif.status = 'pending';
                        await notif.save();

                        await sendNotificationBatch({
                            title: notif.title,
                            message: notif.message,
                            type: notif.type,
                            studentIds: notif.target === 'individual' ? (notif.targetId ? notif.targetId.split(',') : []) : [],
                            batchId: notif.target === 'batch' ? notif.targetId : '',
                            sendToAll: notif.target === 'all',
                            deliveryMethods: notif.deliveryType === 'both' ? ['push', 'email'] : [notif.deliveryType],
                            adminId: notif.createdBy,
                            scheduledFor: null
                        });

                        await Notification.deleteOne({ _id: notif._id });
                    } catch (error) {
                        console.error(`[Scheduler] Failed to process notification ${notif._id}:`, error.message);
                        notif.status = 'failed';
                        await notif.save();
                    }
                }
            }
        } catch (error) {
            console.error('[Scheduler] Critical error in cron job:', error.message);
        }
    });
};

module.exports = { initScheduler };
