const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/batch.controller');
const { CACHE_PREFIXES, cacheJsonResponse } = require('../middleware/responseCache');
const verifyPwd = require('../middleware/verifyAdminPassword');

// Non-protected routes
router.get('/', cacheJsonResponse({ prefix: CACHE_PREFIXES.batches, ttlSeconds: 30 }), ctrl.getAllBatches);
router.get('/export', ctrl.exportBatches);
router.get('/room-occupancy', cacheJsonResponse({ prefix: CACHE_PREFIXES.batches, ttlSeconds: 20 }), ctrl.getRoomOccupancy);
router.get('/:id', cacheJsonResponse({ prefix: CACHE_PREFIXES.batches, ttlSeconds: 30 }), ctrl.getBatchById);
router.post('/', ctrl.createBatch);
router.patch('/:id/toggle', ctrl.toggleStatus);

// Password-protected routes
router.put('/:id', verifyPwd, ctrl.updateBatch);
router.delete('/:id', verifyPwd, ctrl.deleteBatch);

module.exports = router;
