const axios = require("axios");
const Balance = require("../models/Balance");
const { generateSignature } = require("../utils/signature");

// @desc    Create checkout URL
// @route   POST /api/payment/checkout-url
// @access  Public (should be protected in prod)
const createCheckoutUrl = async (req, res) => {
  const {
    amount,
    currency = "GEL",
    order_desc,
    order_id,
    server_callback_url,
    userId, // get userId from request body for not
  } = req.body;
  const merchantId = process.env.FLITT_MERCHANT_ID;
  const secretKey = process.env.FLITT_SECRET_KEY;

  if (!merchantId || !secretKey) {
    return res
      .status(500)
      .json({ message: "Flitt merchant configuration missing" });
  }

  // Ensure userId is provided if we want to link payment to user
  if (!userId) {
    return res.status(400).json({ message: "userId is required" });
  }

  const requestParams = {
    amount,
    currency,
    merchant_id: merchantId,
    order_desc: order_desc || "Payment",
    order_id: order_id || `order_${Date.now()}`,
    server_callback_url,
    merchant_data: userId, // Pass userId in merchant_data to receive it back in callback
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
      "https://pay.flitt.com/api/checkout/url",
      payload
    );

    // Check if Flitt returned an error in the response body (it might still be 200 OK)
    // Based on docs, successful response has checkout_url
    if (response.data && response.data.checkout_url) {
      res.status(200).json(response.data);
    } else {
      // Handle Flitt error response structure
      res.status(400).json(response.data);
    }
  } catch (error) {
    console.error("Flitt API Error:", error.response?.data || error.message);
    res
      .status(500)
      .json({ message: "Failed to create checkout URL", error: error.message });
  }
};

// @desc    Check order status
// @route   POST /api/payment/status
// @access  Public
const checkOrderStatus = async (req, res) => {
  const { order_id } = req.body;
  const merchantId = process.env.FLITT_MERCHANT_ID;
  const secretKey = process.env.FLITT_SECRET_KEY;

  const requestParams = {
    merchant_id: merchantId,
    order_id,
    version: "1.0.1", // Example used 1.0.1
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

  if (
    callbackData.response_status === "success" &&
    callbackData.order_status === "approved"
  ) {
    if (userId) {
      try {
        // Flitt თეთრებში აბრუნებს.
        const amount = Number(callbackData.amount) / 100;

        let balance = await Balance.findOne({ userId });

        if (!balance) {
          // თუ უზერს ბალანსის ცხრილი არ აქვს შევქმნათ. მომავალში mongodb hook ს დავადებთ რაც ოუზერის ვერიფიკაციაზე ავტომატურად შექმნის
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
  createCheckoutUrl,
  checkOrderStatus,
  handleCallback,
};
