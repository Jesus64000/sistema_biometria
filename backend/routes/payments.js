const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// Rutas de pagos
router.get('/', paymentController.getPayments);
router.post('/', paymentController.registerPayment);

module.exports = router;
