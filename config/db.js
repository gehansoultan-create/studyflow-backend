const mongoose = require("mongoose");

async function connectDB() {
    if (!process.env.MONGO_URI) {
        console.error("Missing MONGO_URI in your .env file. Copy .env.example to .env and fill it in.");
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
}

module.exports = connectDB;
