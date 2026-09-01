require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");

const authRoutes = require("./routes/auth");
const subjectRoutes = require("./routes/subjects");
const taskRoutes = require("./routes/tasks");
const sessionRoutes = require("./routes/sessions");
const resourceRoutes = require("./routes/resources");

const app = express();

// Railway (and most PaaS hosts) sit behind a reverse proxy, so Express needs
// this to correctly read the real client IP from X-Forwarded-For — without
// it, express-rate-limit throws validation warnings/errors.
app.set("trust proxy", 1);

// --- middleware ---
const allowedOrigins = (process.env.CORS_ORIGIN || "").split(",").map(o => o.trim()).filter(Boolean);
app.use(cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true
}));
app.use(express.json());

// basic protection against brute-force login/register attempts
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50 });
app.use("/api/auth", authLimiter);

// --- routes ---
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/resources", resourceRoutes);

// 404 fallback
app.use((req, res) => res.status(404).json({ error: "Route not found." }));

// central error handler (catches anything thrown/rejected in routes)
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: "Something went wrong on the server." });
});

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    app.listen(PORT, "0.0.0.0", () => console.log(`StudyFlow API running on port ${PORT}`));
});
