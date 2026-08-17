const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const uri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/tourism_assistant";
    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    // Retry after 5s instead of crashing immediately — useful in dev/docker-compose startup races
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
