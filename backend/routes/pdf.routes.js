const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdf.controller');
const { adminAuth } = require('../middleware/auth.middleware');
const pdfUpload = require('../middleware/pdfUpload');

// Admin protected routes
router.post('/', adminAuth, pdfUpload, pdfController.createPdf);
router.get('/', adminAuth, pdfController.getAllPdfs);
router.delete('/:id', adminAuth, pdfController.deletePdf);

module.exports = router;
