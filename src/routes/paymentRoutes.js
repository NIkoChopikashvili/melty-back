const express = require('express');
const router = express.Router();
const { createCheckoutUrl, checkOrderStatus, handleCallback } = require('../controllers/paymentController');

router.post('/checkout-url', createCheckoutUrl);
router.post('/status', checkOrderStatus);
router.post('/callback', handleCallback);

module.exports = router;

