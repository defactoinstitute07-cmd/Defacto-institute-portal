const express = require('express');
const router = express.Router();
const supportController = require('../controllers/support.controller');
const { adminAuth } = require('../middleware/auth.middleware');

// Only institute admin can manage support staff
router.post('/', adminAuth, supportController.createSupportUser);
router.get('/', adminAuth, supportController.getAllSupportUsers);
router.patch('/:id/status', adminAuth, supportController.updateUserStatus);
router.delete('/:id', adminAuth, supportController.deleteSupportUser);

module.exports = router;
