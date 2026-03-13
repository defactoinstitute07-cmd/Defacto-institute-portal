const express = require('express');
const router = express.Router();
const controller = require('../controllers/attendance.controller');
const { adminAuth, verifyTeacher, verifyAdminOrTeacher, verifyStudent } = require('../middleware/auth.middleware');

router.get('/setup/admin', adminAuth, controller.getAdminSetup);
router.get('/teacher/assigned-batches', verifyTeacher, controller.getTeacherAssignedBatches);
router.get('/roster', verifyAdminOrTeacher, controller.getRoster);
router.post('/mark', verifyAdminOrTeacher, controller.markAttendance);
router.put('/:id', verifyAdminOrTeacher, controller.updateAttendance);
router.get('/report', verifyAdminOrTeacher, controller.getAttendanceReport);
router.get('/student/report', verifyStudent, controller.getStudentAttendanceReport);

module.exports = router;
