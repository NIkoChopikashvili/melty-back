const axios = require("axios");
const Balance = require("../models/Balance");
const { generateSignature } = require("../utils/signature");

// @desc    3D Secure Step 1 - Initiate payment and get ACS URL for 3DS authentication
// @route   POST /api/payment/3dsecure/step1
// @access  Public (should be protected in prod)
const initiate3DSecure = async (req, res) => {
  const {
    amount,
    currency = "GEL",
    order_desc,
    order_id,
    card_number,
    cvv2,
    expiry_date,
    client_ip,
    server_callback_url,
    userId,
  } = req.body;

  const merchantId = process.env.FLITT_MERCHANT_ID || 1549901;
  const secretKey = process.env.FLITT_SECRET_KEY || "test";

  if (!merchantId || !secretKey) {
    return res
      .status(500)
      .json({ message: "Flitt merchant configuration missing" });
  }

  // Validate required fields
  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  if (!card_number || !cvv2 || !expiry_date) {
    return res.status(400).json({
      message: "Card details are required (card_number, cvv2, expiry_date)",
    });
  }

  if (!amount) {
    return res.status(400).json({ message: "amount is required" });
  }

  const generatedOrderId = order_id || `order_${Date.now()}`;

  const requestParams = {
    amount,
    card_number,
    client_ip: client_ip || req.ip || "127.0.0.1",
    currency,
    cvv2,
    expiry_date,
    merchant_id: merchantId,
    order_desc: order_desc || "Payment",
    order_id: generatedOrderId,
    response_url: "http://myshop/thank_you_page",
    server_callback_url,
    merchant_data: userId, // Pass userId to receive it back in callback
  };

  const signature = generateSignature(requestParams, secretKey);
  const payload = {
    request: {
      ...requestParams,
      signature,
    },
  };

  try {
    const response = await axios.post(
      "https://pay.flitt.com/api/3dsecure_step1",
      payload
    );

    const data = response.data?.response || response.data;

    // Check for error response
    if (data.response_status === "failure") {
      return res.status(400).json({
        success: false,
        error_code: data.error_code,
        error_message: data.error_message,
        request_id: data.request_id,
      });
    }

    // If 3D-Secure is enabled, return ACS URL and params
    if (data.acs_url) {
      return res.status(200).json({
        success: true,
        requires_3ds: true,
        acs_url: data.acs_url,
        pareq: data.pareq,
        md: data.md,
        order_id: generatedOrderId,
        // Client should build form and redirect to acs_url
      });
    }

    // If 3D-Secure is disabled, payment is processed directly
    return res.status(200).json({
      success: true,
      requires_3ds: false,
      data: data,
    });
  } catch (error) {
    console.error(
      "Flitt 3DS Step1 Error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message: "Failed to initiate 3D Secure",
      error: error.response?.data || error.message,
    });
  }
};

// @desc    3D Secure Step 2 - Complete 3DS authentication and perform purchase
// @route   POST /api/payment/3dsecure/step2
// @access  Public (should be protected in prod)
const complete3DSecure = async (req, res) => {
  const { order_id, pares, md } = req.body;

  const merchantId = process.env.FLITT_MERCHANT_ID;
  const secretKey = process.env.FLITT_SECRET_KEY;

  if (!merchantId || !secretKey) {
    return res
      .status(500)
      .json({ message: "Flitt merchant configuration missing" });
  }

  if (!order_id || !pares || !md) {
    return res.status(400).json({
      message: "Missing required parameters (order_id, pares, md)",
    });
  }

  const requestParams = {
    md,
    merchant_id: merchantId,
    order_id,
    pares,
  };

  const signature = generateSignature(requestParams, secretKey);
  const payload = {
    request: {
      ...requestParams,
      signature,
    },
  };

  try {
    const response = await axios.post(
      "https://pay.flitt.com/api/3dsecure_step2",
      payload
    );

    const data = response.data?.response || response.data;

    // Check for error response
    if (data.response_status === "failure") {
      return res.status(400).json({
        success: false,
        error_code: data.error_code,
        error_message: data.error_message,
        request_id: data.request_id,
      });
    }

    // Payment successful
    if (
      data.response_status === "success" &&
      data.order_status === "approved"
    ) {
      // Update user balance if merchant_data (userId) is present
      const userId = data.merchant_data;
      if (userId) {
        try {
          // Flitt returns amount in tetri (cents)
          const amountInGel = Number(data.amount) / 100;

          let balance = await Balance.findOne({ userId });

          if (!balance) {
            balance = await Balance.create({ userId, amount: amountInGel });
          } else {
            balance.amount += amountInGel;
            await balance.save();
          }
          console.log(`Updated balance for user ${userId} by ${amountInGel}`);
        } catch (err) {
          console.error(`Failed to update balance for user ${userId}:`, err);
        }
      }

      return res.status(200).json({
        success: true,
        order_status: data.order_status,
        order_id: data.order_id,
        amount: data.amount,
        currency: data.currency,
        transaction_id: data.payment_id,
      });
    }

    // Payment not approved
    return res.status(200).json({
      success: false,
      order_status: data.order_status,
      data: data,
    });
  } catch (error) {
    console.error(
      "Flitt 3DS Step2 Error:",
      error.response?.data || error.message
    );
    res.status(500).json({
      message: "Failed to complete 3D Secure payment",
      error: error.response?.data || error.message,
    });
  }
};

// @desc    Check order status
// @route   POST /api/payment/status
// @access  Public
const checkOrderStatus = async (req, res) => {
  const { order_id } = req.body;
  const merchantId = process.env.FLITT_MERCHANT_ID;
  const secretKey = process.env.FLITT_SECRET_KEY;

  if (!order_id) {
    return res.status(400).json({ message: "order_id is required" });
  }

  const requestParams = {
    merchant_id: merchantId,
    order_id,
    version: "1.0.1",
  };

  const signature = generateSignature(requestParams, secretKey);
  const payload = {
    request: {
      ...requestParams,
      signature,
    },
  };

  try {
    const response = await axios.post(
      "https://pay.flitt.com/api/status/order_id",
      payload
    );
    res.status(200).json(response.data);
  } catch (error) {
    console.error("Flitt API Error:", error.response?.data || error.message);
    res
      .status(500)
      .json({ message: "Failed to check order status", error: error.message });
  }
};

// @desc    Handle Flitt Callback
// @route   POST /api/payment/callback
// @access  Public (Flitt calls this)
const handleCallback = async (req, res) => {
  const callbackData = req.body;
  const secretKey = process.env.FLITT_SECRET_KEY;

  console.log(
    "Received Flitt Callback:",
    JSON.stringify(callbackData, null, 2)
  );

  const { signature, ...paramsToSign } = callbackData;

  if (!signature) {
    console.error("Missing signature in callback");
    return res.status(200).json({ status: "ignored" });
  }

  const calculatedSignature = generateSignature(paramsToSign, secretKey);

  if (calculatedSignature !== signature) {
    console.error(
      `Invalid signature. Calculated: ${calculatedSignature}, Received: ${signature}`
    );
    return res.status(400).json({ message: "Invalid signature" });
  }

  // Extract userId from merchant_data
  const userId = callbackData.merchant_data;

  if (
    callbackData.response_status === "success" &&
    callbackData.order_status === "approved"
  ) {
    if (userId) {
      try {
        // Flitt returns amount in tetri (cents)
        const amount = Number(callbackData.amount) / 100;

        let balance = await Balance.findOne({ userId });

        if (!balance) {
          balance = await Balance.create({ userId, amount });
        } else {
          balance.amount += amount;
          await balance.save();
        }
        console.log(`Updated balance for user ${userId} by ${amount}`);
      } catch (err) {
        console.error(`Failed to update balance for user ${userId}:`, err);
      }
    } else {
      console.warn("Could not determine userId from callback data");
    }
  }

  res.status(200).json({ status: "ok" });
};

module.exports = {
  initiate3DSecure,
  complete3DSecure,
  checkOrderStatus,
  handleCallback,
};
