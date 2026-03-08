const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/student.auth.controller');
const { verifyStudent } = require('../middleware/auth.middleware');

// Public
router.post('/login', ctrl.login);

// Protected (student JWT required)
router.get('/profile', verifyStudent, ctrl.getProfile);
router.patch('/phone', verifyStudent, ctrl.updatePhone);
router.get('/performance', verifyStudent, ctrl.getPerformance);

module.exports = router;
