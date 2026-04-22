const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboard.controller');
const { adminAuth } = require('../middleware/auth.middleware');
const { CACHE_PREFIXES, cacheJsonResponse } = require('../middleware/responseCache');

router.get('/overview', adminAuth, cacheJsonResponse({ prefix: CACHE_PREFIXES.dashboard, ttlSeconds: 30 }), dashboardController.getOverview);
router.get('/attendance-weekly', adminAuth, cacheJsonResponse({ prefix: CACHE_PREFIXES.dashboard, ttlSeconds: 20 }), dashboardController.getWeeklyAttendance);
router.get('/attendance-trend', adminAuth, cacheJsonResponse({ prefix: CACHE_PREFIXES.dashboard, ttlSeconds: 20 }), dashboardController.getAttendanceTrend);
router.get('/recent-collections', adminAuth, cacheJsonResponse({ prefix: CACHE_PREFIXES.dashboard, ttlSeconds: 20 }), dashboardController.getRecentCollections);
router.get('/upcoming-exams', adminAuth, cacheJsonResponse({ prefix: CACHE_PREFIXES.dashboard, ttlSeconds: 60 }), dashboardController.getUpcomingExams);

module.exports = router;
