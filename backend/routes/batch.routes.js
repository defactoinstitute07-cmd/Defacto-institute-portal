const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/batch.controller');
const verifyPwd = require('../middleware/verifyAdminPassword');

// Non-protected routes
router.get('/', ctrl.getAllBatches);
router.get('/export', ctrl.exportBatches);
router.get('/room-occupancy', ctrl.getRoomOccupancy);
router.get('/:id', ctrl.getBatchById);
router.post('/', ctrl.createBatch);
router.patch('/:id/toggle', ctrl.toggleStatus);

// Password-protected routes
router.put('/:id', verifyPwd, ctrl.updateBatch);
router.delete('/:id', verifyPwd, ctrl.deleteBatch);

module.exports = router;
