const mongoose = require("mongoose");

const balanceSchema = new mongoose.Schema(
  {
    userId: {
      type: String, // ჯერ იყოს სტრინგი იუზერს რო დავამატებთ მერე გახდება  ObjectId
      required: true,
      unique: true,
    },
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Balance", balanceSchema);
