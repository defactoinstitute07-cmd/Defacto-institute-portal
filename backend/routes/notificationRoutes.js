const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { adminAuth } = require('../middleware/auth.middleware');

router.use(adminAuth);

router.get('/recipients', notificationController.getRecipients);
router.get('/history', notificationController.getHistory);
router.post('/send', notificationController.sendNotifications);

module.exports = router;
