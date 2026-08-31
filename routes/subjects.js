const express = require("express");
const Subject = require("../models/Subject");
const Task = require("../models/Task");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/subjects — list all subjects for this user, each with a computed completion %
router.get("/", async (req, res) => {
    const subjects = await Subject.find({ user: req.userId }).sort({ createdAt: 1 });

    const withCompletion = await Promise.all(
        subjects.map(async subject => {
            const tasks = await Task.find({ subject: subject._id, user: req.userId });
            const completion = tasks.length === 0
                ? 0
                : Math.round(tasks.reduce((sum, t) => sum + (t.progress || 0), 0) / tasks.length);

            return { ...subject.toObject(), completion };
        })
    );

    res.json(withCompletion);
});

// POST /api/subjects
router.post("/", async (req, res) => {
    const { name, teacher, lecturesCount, color } = req.body;
    if (!name) return res.status(400).json({ error: "Subject name is required." });

    const subject = await Subject.create({
        user: req.userId,
        name: name.trim(),
        teacher: (teacher || "").trim(),
        lecturesCount: Number(lecturesCount) || 0,
        color: color || "#3E7CB1"
    });

    res.status(201).json(subject);
});

// PUT /api/subjects/:id
router.put("/:id", async (req, res) => {
    const subject = await Subject.findOne({ _id: req.params.id, user: req.userId });
    if (!subject) return res.status(404).json({ error: "Subject not found." });

    const { name, teacher, lecturesCount, color } = req.body;
    if (name !== undefined) subject.name = name.trim();
    if (teacher !== undefined) subject.teacher = teacher.trim();
    if (lecturesCount !== undefined) subject.lecturesCount = Number(lecturesCount) || 0;
    if (color !== undefined) subject.color = color;

    await subject.save();
    res.json(subject);
});

// DELETE /api/subjects/:id — also removes its tasks and sessions to avoid orphaned data
router.delete("/:id", async (req, res) => {
    const subject = await Subject.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!subject) return res.status(404).json({ error: "Subject not found." });

    await Task.deleteMany({ subject: subject._id, user: req.userId });
    const Session = require("../models/Session");
    await Session.deleteMany({ subject: subject._id, user: req.userId });

    res.json({ success: true });
});

module.exports = router;
