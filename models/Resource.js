const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
    {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        subject: { type: mongoose.Schema.Types.ObjectId, ref: "Subject", required: true, index: true },
        name: { type: String, required: true, trim: true }, // original filename, shown to the user
        category: { type: String, enum: ["image", "pdf", "audio", "general"], required: true },
        url: { type: String, required: true }, // Cloudinary secure_url — where the file actually lives
        publicId: { type: String, required: true }, // Cloudinary id — needed to delete the file later
        cloudinaryResourceType: { type: String, required: true }, // "image" | "video" | "raw" — Cloudinary's own type, needed to delete correctly
        format: { type: String, default: "" }, // e.g. "pdf", "jpg", "mp3"
        bytes: { type: Number, default: 0 }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Resource", resourceSchema);