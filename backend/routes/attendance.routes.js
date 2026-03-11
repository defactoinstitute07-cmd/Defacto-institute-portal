const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendance.controller');
const { adminAuth, verifyTeacher, verifyAdminOrTeacher } = require('../middleware/auth.middleware');

router.get('/setup/admin', adminAuth, controller.getAdminSetup);
router.get('/teacher/assigned-batches', verifyTeacher, controller.getTeacherAssignedBatches);
router.get('/roster', verifyAdminOrTeacher, controller.getRoster);
router.post('/mark', verifyAdminOrTeacher, controller.markAttendance);
router.put('/:id', verifyAdminOrTeacher, controller.updateAttendance);
router.get('/report', verifyAdminOrTeacher, controller.getAttendanceReport);

module.exports = router;
