const express = require("express");
const router = express.Router();
const {
  initiate3DSecure,
  complete3DSecure,
  handleTermUrl,
  checkOrderStatus,
  handleCallback,
} = require("../controllers/paymentController");

// 3D Secure flow (PCI DSS compliant - card data collected on your site)
router.post("/3dsecure/step1", initiate3DSecure);
router.post("/3dsecure/step2", complete3DSecure);

// TermUrl - Bank ACS redirects here after 3DS authentication
router.post("/termurl", handleTermUrl);

// Order status check
router.post("/status", checkOrderStatus);

// Flitt server callback handler
router.post("/callback", handleCallback);

module.exports = router;
