const mongoose = require("mongoose");

const subjectSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        name: { type: String, required: true, trim: true },
        teacher: { type: String, trim: true, default: "" },
        lecturesCount: { type: Number, default: 0, min: 0 },
        color: { type: String, default: "#3E7CB1" }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Subject", subjectSchema);
