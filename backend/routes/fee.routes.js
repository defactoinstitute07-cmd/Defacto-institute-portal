const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/fee.controller');
const { adminAuth } = require('../middleware/auth.middleware');

// Basic RBAC checking applied to sensitive module
router.use(adminAuth);

router.get('/', ctrl.getAllFees);
router.get('/metrics', ctrl.getMetrics);
router.post('/', ctrl.createFee);
router.post('/generate', ctrl.generateFees);
router.post('/:id/pay', ctrl.capturePayment);
router.post('/:id/expense', ctrl.addOtherExpense);
router.delete('/:id', ctrl.deleteFee);

module.exports = router;
