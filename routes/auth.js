const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");
const requireAuth = require("../middleware/auth");
const { sendPasswordResetEmail } = require("../utils/email");

const router = express.Router();

function hashToken(rawToken) {
    return crypto.createHash("sha256").update(rawToken).digest("hex");
}

function signToken(userId) {
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "Name, email and password are all required." });
        }
        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters." });
        }

        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) {
            return res.status(409).json({ error: "An account with this email already exists." });
        }

        const user = new User({ name: name.trim(), email: email.toLowerCase().trim() });
        await user.setPassword(password);
        await user.save();

        const token = signToken(user._id);
        res.status(201).json({ token, user: user.toSafeJSON() });
    } catch (error) {
        res.status(500).json({ error: "Could not register. Please try again." });
    }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required." });
        }

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const isMatch = await user.checkPassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: "Invalid email or password." });
        }

        const token = signToken(user._id);
        res.json({ token, user: user.toSafeJSON() });
    } catch (error) {
        res.status(500).json({ error: "Could not log in. Please try again." });
    }
});

// POST /api/auth/forgot-password
// Always responds with a generic success message, whether or not the email
// exists — this stops strangers from using the form to discover which
// emails have accounts.
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required." });

        const genericMessage = { message: "If an account exists for that email, a reset link has been sent." };

        const user = await User.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.json(genericMessage);

        const rawToken = crypto.randomBytes(32).toString("hex");
        user.resetPasswordTokenHash = hashToken(rawToken);
        user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5500";
        const resetLink = `${frontendUrl}/index.html?resetToken=${rawToken}`;

        // Send the email, but don't let a slow/failed SMTP connection turn into
        // a user-facing error — the reset token is already saved either way.
        try {
            await sendPasswordResetEmail(user.email, resetLink);
        } catch (emailError) {
            console.error("sendPasswordResetEmail failed:", emailError.message);
        }

        res.json(genericMessage);
    } catch (error) {
        console.error("forgot-password error:", error.message);
        res.status(500).json({ error: "Could not process request. Please try again." });
    }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ error: "Token and new password are required." });
        }
        if (newPassword.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters." });
        }

        const user = await User.findOne({
            resetPasswordTokenHash: hashToken(token),
            resetPasswordExpires: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
        }

        await user.setPassword(newPassword);
        user.resetPasswordTokenHash = null;
        user.resetPasswordExpires = null;
        await user.save();

        res.json({ message: "Your password has been reset. You can now log in." });
    } catch (error) {
        res.status(500).json({ error: "Could not reset password. Please try again." });
    }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found." });
    res.json({ user: user.toSafeJSON() });
});

module.exports = router;
