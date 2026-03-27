const express = require('express');
const router = express.Router();
const feesController = require('../controllers/fees.controller');
const verifyAdminPassword = require('../middleware/verifyAdminPassword');

// Metrics must come before "/:id" style routes
router.get('/metrics', feesController.getMetrics);

router.route('/')
    .get(feesController.getFees)
    .post(verifyAdminPassword, feesController.createFee);

router.post('/generate', verifyAdminPassword, feesController.generateFeesBulk);
router.post('/remind-overdue', verifyAdminPassword, feesController.remindOverdue);
router.post('/bulk-surcharge', verifyAdminPassword, feesController.bulkSurcharge);

router.post('/:id/pay', verifyAdminPassword, feesController.recordPayment);
// Adding extra expense to a specific fee record (no admin password prompt in UI currently)
router.post('/:id/expense', feesController.addExpenseToFee);

module.exports = router;
