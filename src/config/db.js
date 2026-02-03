const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongo =
      "mongodb+srv://Niko_9:Pianino12@cluster0.k8ckw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
    const conn = await mongoose.connect(mongo);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
