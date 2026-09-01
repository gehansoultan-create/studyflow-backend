const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
    if (transporter) return transporter;

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn("EMAIL_USER / EMAIL_PASS not set — password reset emails will not be sent.");
        return null;
    }

    transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false, // STARTTLS on 587 — plays nicer with hosting platforms than implicit SSL on 465
        requireTLS: true,
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS // Gmail "App Password", not your normal Gmail password
        },
        connectionTimeout: 10000 // fail fast (10s) instead of hanging the whole request
    });

    return transporter;
}

async function sendPasswordResetEmail(toEmail, resetLink) {
    const transport = getTransporter();

    // In case email isn't configured yet (e.g. local dev), don't crash — just log the link.
    if (!transport) {
        console.log(`[dev] Password reset link for ${toEmail}: ${resetLink}`);
        return;
    }

    await transport.sendMail({
        from: `"StudyFlow" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: "Reset your StudyFlow password",
        html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2>Reset your password</h2>
                <p>We received a request to reset your StudyFlow password. This link expires in 1 hour.</p>
                <p><a href="${resetLink}" style="display:inline-block;background:#1B2438;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Reset Password</a></p>
                <p>If you didn't request this, you can safely ignore this email.</p>
            </div>
        `
    });
}

module.exports = { sendPasswordResetEmail };
