const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true },
        name: { type: String, required: true, trim: true },
        priority: { type: String, enum: ["Low", "Medium", "High"], default: "Medium" },
        dueDate: { type: Date },
        status: { type: String, enum: ["Not Started", "In Progress", "Completed"], default: "Not Started" },
        progress: { type: Number, default: 0, min: 0, max: 100 },
        // recurrence: null = one-off task, otherwise "weekly" | "daily"
        recurrence: { type: String, enum: [null, "daily", "weekly"], default: null }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Task", taskSchema);
