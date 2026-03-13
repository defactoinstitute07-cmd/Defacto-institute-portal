const express = require('express');
const router = express.Router();
const templateController = require('../controllers/template.controller');
const { adminAuth } = require('../middleware/auth.middleware');

router.get('/', adminAuth, templateController.getAllTemplates);
router.put('/:id', adminAuth, templateController.updateTemplate);

module.exports = router;
