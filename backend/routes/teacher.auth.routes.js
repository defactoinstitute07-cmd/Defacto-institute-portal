const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/teacher.auth.controller');
const { verifyTeacher } = require('../middleware/auth.middleware');

// Public
router.post('/login', ctrl.login);

// Protected (teacher JWT required)
router.get('/profile', verifyTeacher, ctrl.getProfile);
router.patch('/phone', verifyTeacher, ctrl.updatePhone);
router.patch('/bank-details', verifyTeacher, ctrl.updateBankDetails);

module.exports = router;
