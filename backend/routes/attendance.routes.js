const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendance.controller');
const { adminAuth, verifyStudent } = require('../middleware/auth.middleware');

router.get('/setup/admin', adminAuth, controller.getAdminSetup);
router.get('/roster', adminAuth, controller.getRoster);
router.post('/mark', adminAuth, controller.markAttendance);
router.put('/:id', adminAuth, controller.updateAttendance);
router.get('/report', adminAuth, controller.getAttendanceReport);
router.get('/overview', adminAuth, controller.getAttendanceOverview);
router.get('/student/report', verifyStudent, controller.getStudentAttendanceReport);

module.exports = router;
