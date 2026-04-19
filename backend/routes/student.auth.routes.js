const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/student.auth.controller');
const { verifyStudent } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload');

// Public
router.post('/signup', ctrl.signup);
router.post('/login', ctrl.login);

// Protected (student JWT required)
router.get('/me', verifyStudent, ctrl.getProfile);
router.get('/profile', verifyStudent, ctrl.getProfile);
router.patch('/phone', verifyStudent, ctrl.updatePhone);
router.get('/performance', verifyStudent, ctrl.getPerformance);
router.post('/device', verifyStudent, ctrl.registerDevice);
router.post('/activity', verifyStudent, ctrl.trackActivity);
router.post('/complete-setup', verifyStudent, upload.single('profileImage'), ctrl.completeSetup);

module.exports = router;
