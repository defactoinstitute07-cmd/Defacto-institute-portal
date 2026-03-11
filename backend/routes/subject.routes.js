const express = require('express');
const router = express.Router();
const controller = require('../controllers/subject.controller');
const { adminAuth, verifyAdminOrTeacher } = require('../middleware/auth.middleware');

router.get('/', verifyAdminOrTeacher, controller.getSubjects);
router.post('/', adminAuth, controller.createSubject);

module.exports = router;
