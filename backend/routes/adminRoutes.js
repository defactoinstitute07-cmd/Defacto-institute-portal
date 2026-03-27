const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const adminController = require('../controllers/adminController');
const upload = require('../middleware/upload');

const { adminAuth } = require('../middleware/auth.middleware');

const signupUpload = (req, res, next) => {
	upload.single('instituteLogo')(req, res, (err) => {
		if (!err) return next();

		// Normalize upload errors into client-facing responses.
		if (err.name === 'MulterError') {
			return res.status(400).json({ message: err.message || 'Invalid file upload.' });
		}

		if (err.http_code || /cloudinary/i.test(String(err.message || ''))) {
			return res.status(502).json({ message: 'Image upload provider failed. Please try again without logo or retry later.' });
		}

		return res.status(400).json({ message: err.message || 'Invalid file upload.' });
	});
};

router.get('/check-admin', adminController.checkAdmin);
router.post('/signup', signupUpload, adminController.signup);
router.get('/signup', (req, res) => {
	res.status(405).json({ message: 'Method not allowed. Use POST /api/admin/signup.' });
});
router.post('/login', adminController.login);
router.get('/profile', adminAuth, adminController.getProfile);
router.put('/profile', adminAuth, upload.single('instituteLogo'), adminController.updateProfile);
router.put('/settings', adminAuth, adminController.updateSettings);

router.post('/wipe-database', adminAuth, adminController.wipeDatabase);

module.exports = router;
