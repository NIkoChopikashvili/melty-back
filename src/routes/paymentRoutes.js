const express = require("express");
const router = express.Router();
const {
  initiate3DSecure,
  complete3DSecure,
  checkOrderStatus,
  handleCallback,
} = require("../controllers/paymentController");

// 3D Secure flow (PCI DSS compliant - card data collected on your site)
router.post("/3dsecure/step1", initiate3DSecure);
router.post("/3dsecure/step2", complete3DSecure);

// Order status check
router.post("/status", checkOrderStatus);

// Flitt callback handler
router.post("/callback", handleCallback);

module.exports = router;
