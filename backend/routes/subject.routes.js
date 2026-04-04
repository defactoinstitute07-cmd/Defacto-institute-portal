const express = require('express');
const router = express.Router();
const controller = require('../controllers/subject.controller');
const { adminAuth, verifyAdminOrTeacher } = require('../middleware/auth.middleware');

router.get('/', verifyAdminOrTeacher, controller.getSubjects);
router.get('/:id', verifyAdminOrTeacher, controller.getSubjectById);
router.post('/', adminAuth, controller.createSubject);
router.patch('/:id/teacher', adminAuth, controller.assignTeacher);
router.post('/:id/chapters', verifyAdminOrTeacher, controller.addChapter);
router.patch('/:id/chapters/:chapterId', verifyAdminOrTeacher, controller.updateChapter);
router.patch('/:id/chapters/:chapterId/status', verifyAdminOrTeacher, controller.updateChapterStatus);

module.exports = router;
