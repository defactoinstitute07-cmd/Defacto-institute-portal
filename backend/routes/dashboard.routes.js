const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { adminAuth } = require('../middleware/auth.middleware');

router.get('/overview', adminAuth, dashboardController.getOverview);
router.get('/attendance-weekly', adminAuth, dashboardController.getWeeklyAttendance);
router.get('/attendance-trend', adminAuth, dashboardController.getAttendanceTrend);
router.get('/recent-collections', adminAuth, dashboardController.getRecentCollections);
router.get('/upcoming-exams', adminAuth, dashboardController.getUpcomingExams);

module.exports = router;
