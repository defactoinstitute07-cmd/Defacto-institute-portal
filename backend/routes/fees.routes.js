const express = require('express');
const router = express.Router();
const feesController = require('../controllers/fees.controller');
const { CACHE_PREFIXES, cacheJsonResponse } = require('../middleware/responseCache');
const verifyAdminPassword = require('../middleware/verifyAdminPassword');

// Metrics must come before "/:id" style routes
router.get('/metrics', cacheJsonResponse({ prefix: CACHE_PREFIXES.fees, ttlSeconds: 30 }), feesController.getMetrics);

router.route('/')
    .get(cacheJsonResponse({ prefix: CACHE_PREFIXES.fees, ttlSeconds: 20 }), feesController.getFees)
    .post(verifyAdminPassword, feesController.createFee);

router.post('/generate', verifyAdminPassword, feesController.generateFeesBulk);
router.post('/create-multi-month', verifyAdminPassword, feesController.createMultiMonthFee);
router.post('/remind-overdue', verifyAdminPassword, feesController.remindOverdue);

router.post('/:id/pay', verifyAdminPassword, feesController.recordPayment);
router.put('/:id', verifyAdminPassword, feesController.updateFee);
router.delete('/:id', verifyAdminPassword, feesController.deleteFee);


module.exports = router;
