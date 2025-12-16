const Balance = require("../models/Balance");

// @desc    Top up balance
// @route   POST /api/balance/topup
// @access  Public (for now)
const topup = async (req, res) => {
  const { userId, amount } = req.body;

  if (!userId || !amount || amount <= 0) {
    return res.status(400).json({
      message: "Please provide valid userId and amount greater than 0",
    });
  }

  try {
    let balance = await Balance.findOne({ userId });

    if (!balance) {
      balance = await Balance.create({ userId, amount });
    } else {
      balance.amount += Number(amount);
      await balance.save();
    }

    res.status(200).json(balance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Withdraw from balance
// @route   POST /api/balance/withdraw
// @access  Public (for now)
const withdraw = async (req, res) => {
  const { userId, amount } = req.body;

  if (!userId || !amount || amount <= 0) {
    return res.status(400).json({
      message: "Please provide valid userId and amount greater than 0",
    });
  }

  try {
    const balance = await Balance.findOne({ userId });

    if (!balance) {
      return res
        .status(404)
        .json({ message: "Balance not found for this user" });
    }

    if (balance.amount < amount) {
      return res.status(400).json({ message: "Insufficient funds" });
    }

    balance.amount -= Number(amount);
    await balance.save();

    res.status(200).json(balance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get balance
// @route   GET /api/balance/:userId
// @access  Public
const getBalance = async (req, res) => {
  const { userId } = req.params;

  try {
    const balance = await Balance.findOne({ userId });

    if (!balance) {
      return res.status(404).json({ message: "Balance not found" });
    }

    res.status(200).json(balance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  topup,
  withdraw,
  getBalance,
};
