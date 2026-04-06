const express = require('express');
const router = express.Router();
const controller = require('../controllers/subject.controller');
const { adminAuth, verifyAdminOrTeacher, verifyStudent } = require('../middleware/auth.middleware');
const uploadSyllabus = require('../middleware/uploadSyllabus');

router.get('/student/my', verifyStudent, controller.getMySubjects);
router.get('/', verifyAdminOrTeacher, controller.getSubjects);
router.get('/:id', verifyAdminOrTeacher, controller.getSubjectById);
router.post('/', adminAuth, controller.createSubject);
router.delete('/:id', adminAuth, controller.deleteSubject);
router.patch('/:id/teacher', adminAuth, controller.assignTeacher);
router.patch('/:id/batches', adminAuth, controller.assignBatches);
router.post('/:id/syllabus', verifyAdminOrTeacher, uploadSyllabus.single('syllabus'), controller.uploadSyllabus);
router.post('/:id/chapters', verifyAdminOrTeacher, controller.addChapter);
router.patch('/:id/chapters/:chapterId', verifyAdminOrTeacher, controller.updateChapter);
router.patch('/:id/chapters/:chapterId/status', verifyAdminOrTeacher, controller.updateChapterStatus);

module.exports = router;
