const express = require('express');
const router = express.Router();
const controller = require('../controllers/teacherAssignment.controller');
const { adminAuth } = require('../middleware/auth.middleware');

router.get('/', adminAuth, controller.getAssignments);
router.post('/', adminAuth, controller.createAssignment);

module.exports = router;
