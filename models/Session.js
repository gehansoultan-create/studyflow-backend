const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
        duration: { type: Number, required: true, min: 1 }, // minutes
        date: { type: Date, required: true },
        notes: { type: String, trim: true, default: "" }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Session", sessionSchema);
