const express = require('express');
const router = express.Router();
const { topup, withdraw, getBalance } = require('../controllers/balanceController');

router.post('/topup', topup);
router.post('/withdraw', withdraw);
router.get('/:userId', getBalance);

module.exports = router;

