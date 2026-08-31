const express = require("express");
const Task = require("../models/Task");
const requireAuth = require("../middleware/auth");

const router = express.Router();
router.use(requireAuth);

// GET /api/tasks?search=&subject=&status=&priority=&date=
router.get("/", async (req, res) => {
    const { search, subject, status, priority, date } = req.query;

    const query = { user: req.userId };
    if (subject) query.subject = subject;
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (search) query.name = { $regex: search, $options: "i" };
    if (date) {
        const start = new Date(date + "T00:00:00.000Z");
        const end = new Date(date + "T23:59:59.999Z");
        query.dueDate = { $gte: start, $lte: end };
    }

    const tasks = await Task.find(query).sort({ dueDate: 1 }).populate("subject", "name color");
    res.json(tasks);
});

// POST /api/tasks
router.post("/", async (req, res) => {
    const { name, subject, priority, dueDate, status, progress, recurrence } = req.body;

    if (!name || !subject) {
        return res.status(400).json({ error: "Task name and subject are required." });
    }

    const task = await Task.create({
        user: req.userId,
        subject,
        name: name.trim(),
        priority: priority || "Medium",
        dueDate: dueDate || undefined,
        status: status || "Not Started",
        progress: Number(progress) || 0,
        recurrence: recurrence || null
    });

    res.status(201).json(task);
});

// PUT /api/tasks/:id
router.put("/:id", async (req, res) => {
    const task = await Task.findOne({ _id: req.params.id, user: req.userId });
    if (!task) return res.status(404).json({ error: "Task not found." });

    const { name, subject, priority, dueDate, status, progress, recurrence } = req.body;
    const wasCompleted = task.status === "Completed";

    if (name !== undefined) task.name = name.trim();
    if (subject !== undefined) task.subject = subject;
    if (priority !== undefined) task.priority = priority;
    if (dueDate !== undefined) task.dueDate = dueDate || undefined;
    if (status !== undefined) task.status = status;
    if (progress !== undefined) task.progress = Number(progress);
    if (recurrence !== undefined) task.recurrence = recurrence;

    await task.save();

    // if a recurring task just became Completed for the first time, spawn the next occurrence
    let spawned = null;
    if (!wasCompleted && task.status === "Completed" && task.recurrence && task.dueDate) {
        const nextDue = new Date(task.dueDate);
        nextDue.setDate(nextDue.getDate() + (task.recurrence === "weekly" ? 7 : 1));

        spawned = await Task.create({
            user: req.userId,
            subject: task.subject,
            name: task.name,
            priority: task.priority,
            dueDate: nextDue,
            status: "Not Started",
            progress: 0,
            recurrence: task.recurrence
        });
    }

    res.json({ task, spawned });
});

// DELETE /api/tasks/:id
router.delete("/:id", async (req, res) => {
    const task = await Task.findOneAndDelete({ _id: req.params.id, user: req.userId });
    if (!task) return res.status(404).json({ error: "Task not found." });
    res.json({ success: true });
});

module.exports = router;
