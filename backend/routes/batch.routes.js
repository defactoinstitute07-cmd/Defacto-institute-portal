const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/batch.controller');
const tCtrl = require('../controllers/teacher.controller');
const verifyPwd = require('../middleware/verifyAdminPassword');
const { verifyAdminOrTeacher } = require('../middleware/auth.middleware');

// Non-protected routes
router.get('/', ctrl.getAllBatches);
router.get('/export', ctrl.exportBatches);
router.get('/room-occupancy', ctrl.getRoomOccupancy);
router.get('/courses/:course/subjects', ctrl.getSubjectsByCourse);
router.get('/:id/subjects/:subjectName/details', ctrl.getBatchSubjectDetails);
router.patch('/:id/subjects/:subjectName/chapters', verifyAdminOrTeacher, ctrl.updateBatchSubjectTotalChapters);
router.get('/:id', ctrl.getBatchById);
router.post('/', ctrl.createBatch);
router.patch('/:id/toggle', ctrl.toggleStatus);

// Admin / Teacher accessible route for updating assigned subjects without password
router.patch('/:id/subjects', verifyAdminOrTeacher, ctrl.updateBatchSubjects);

// Batch subjects with teacher assignment info (used by teacher form)
router.get('/:id/subjects', tCtrl.getBatchSubjectsWithAssignments);

// Password-protected routes
router.put('/:id', verifyPwd, ctrl.updateBatch);
router.delete('/:id', verifyPwd, ctrl.deleteBatch);

module.exports = router;
