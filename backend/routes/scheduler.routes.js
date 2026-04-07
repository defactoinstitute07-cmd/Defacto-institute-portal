const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/scheduler.controller');

router.get('/config', ctrl.getConfig);
router.post('/auto-allocate', ctrl.autoAllocateSlots);
router.post('/expert-auto', ctrl.expertAISchedule);
router.post('/auto-batch', ctrl.autoScheduleBatch);
router.post('/smart-auto', ctrl.smartAutoSchedule);

module.exports = router;
