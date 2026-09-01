const express = require("express");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const Resource = require("../models/Resource");
const Subject = require("../models/Subject");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// --- What's allowed to be uploaded, and how it's categorized ---
// Kept as an explicit whitelist (rather than blocking a blacklist) so nothing
// unexpected — scripts, executables, etc. — can slip through.
const ALLOWED_TYPES = {
    "image/jpeg": "image",
    "image/png": "image",
    "image/webp": "image",
    "image/gif": "image",
    "application/pdf": "pdf",
    "audio/mpeg": "audio",
    "audio/mp3": "audio",
    "audio/wav": "audio",
    "audio/x-wav": "audio",
    "audio/mp4": "audio",
    "audio/x-m4a": "audio",
    "audio/ogg": "audio",
    "application/msword": "general",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "general",
    "application/vnd.ms-powerpoint": "general",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": "general",
    "application/vnd.ms-excel": "general",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "general",
    "text/plain": "general"
};

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB — generous for notes/recordings, still bounded

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
        if (ALLOWED_TYPES[file.mimetype]) {
            cb(null, true);
        } else {
            cb(new Error("That file type isn't supported."));
        }
    }
});

// Cloudinary needs to know which of its own "resource types" to store this
// under — images and PDFs/docs get handled differently from audio.
function cloudinaryResourceTypeFor(category) {
    if (category === "image") return "image";
    if (category === "audio") return "video"; // Cloudinary stores audio under "video"
    return "raw"; // pdf + general documents
}

function uploadBufferToCloudinary(buffer, folder, resourceType) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: resourceType },
            (error, result) => (error ? reject(error) : resolve(result))
        );
        stream.end(buffer);
    });
}

// GET /api/resources?subject=<id> — list resources for one subject (only the owner's)
router.get("/", async (req, res) => {
    const { subject } = req.query;
    if (!subject) return res.status(400).json({ error: "A subject id is required." });

    const resources = await Resource.find({ subject, user: req.userId }).sort({ createdAt: -1 });
    res.json(resources);
});

// POST /api/resources — upload a file for a subject (multipart/form-data: file, subjectId)
router.post("/", upload.single("file"), async (req, res) => {
    try {
        const { subjectId } = req.body;
        if (!subjectId) return res.status(400).json({ error: "subjectId is required." });
        if (!req.file) return res.status(400).json({ error: "No file was uploaded." });

        // Confirm the subject actually belongs to this user before attaching anything to it.
        const subject = await Subject.findOne({ _id: subjectId, user: req.userId });
        if (!subject) return res.status(404).json({ error: "Subject not found." });

        const category = ALLOWED_TYPES[req.file.mimetype];
        const cloudinaryResourceType = cloudinaryResourceTypeFor(category);
        const folder = `studyflow/${req.userId}/${subjectId}`;

        const result = await uploadBufferToCloudinary(req.file.buffer, folder, cloudinaryResourceType);

        const resource = await Resource.create({
            user: req.userId,
            subject: subjectId,
            name: req.file.originalname,
            category,
            url: result.secure_url,
            publicId: result.public_id,
            cloudinaryResourceType,
            format: result.format || "",
            bytes: result.bytes || req.file.size
        });

        res.status(201).json(resource);
    } catch (error) {
        if (error.message === "That file type isn't supported.") {
            return res.status(400).json({ error: error.message });
        }
        console.error("resource upload error:", error.message);
        res.status(500).json({ error: "Could not upload file. Please try again." });
    }
});

// DELETE /api/resources/:id
router.delete("/:id", async (req, res) => {
    try {
        const resource = await Resource.findOne({ _id: req.params.id, user: req.userId });
        if (!resource) return res.status(404).json({ error: "Resource not found." });

        await cloudinary.uploader.destroy(resource.publicId, { resource_type: resource.cloudinaryResourceType });
        await resource.deleteOne();

        res.json({ success: true });
    } catch (error) {
        console.error("resource delete error:", error.message);
        res.status(500).json({ error: "Could not delete file. Please try again." });
    }
});

module.exports = router;