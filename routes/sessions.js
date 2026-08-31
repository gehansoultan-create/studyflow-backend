const express = require("express");
const Session = require("../models/Session");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/sessions
router.get("/", async (req, res) => {
    const sessions = await Session.find({ user: req.userId })
        .sort({ date: -1 })
        .populate("subject", "name color");
    res.json(sessions);
});

// POST /api/sessions
router.post("/", async (req, res) => {
    const { subject, duration, date, notes } = req.body;

    if (!subject || !duration || !date) {
        return res.status(400).json({ error: "Subject, duration and date are required." });
    }

    const session = await Session.create({
        user: req.userId,
        subject,
        duration: Number(duration),
        date,
        notes: (notes || "").trim()
    });

    res.status(201).json(session);
});

// DELETE /api/sessions/:id
router.delete("/:id", async (req, res) => {
    const session = await Session.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!session) return res.status(404).json({ error: "Session not found." });
    res.json({ success: true });
});

module.exports = router;
