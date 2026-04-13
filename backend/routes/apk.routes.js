const express = require('express');
const router = express.Router();
const apkController = require('../controllers/apk.controller');
const { adminAuth } = require('../middleware/auth.middleware');
const apkUpload = require('../middleware/apkUpload');

// Admin protected routes
// Admin protected routes
router.post('/', adminAuth, apkUpload, apkController.createApk);
router.get('/', adminAuth, apkController.getAllApks);
router.patch('/:id', adminAuth, apkUpload, apkController.updateApk);
router.delete('/:id', adminAuth, apkController.deleteApk);

module.exports = router;
