// Sends email via Resend's HTTPS API instead of raw SMTP.
// Many hosting platforms (Railway included) block outbound SMTP ports (25/465/587)
// to prevent spam abuse — an HTTPS API call sidesteps that entirely.

async function sendPasswordResetEmail(toEmail, resetLink) {
    if (!process.env.RESEND_API_KEY) {
        console.log(`[dev] Password reset link for ${toEmail}: ${resetLink}`);
        return;
    }

    // The free Resend tier can only send FROM this address until a custom
    // domain is verified — that's fine, it can still send TO any real inbox.
    const fromAddress = process.env.RESEND_FROM || "StudyFlow <onboarding@resend.dev>";

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: fromAddress,
            to: [toEmail],
            subject: "Reset your StudyFlow password",
            html: `
                <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                    <h2>Reset your password</h2>
                    <p>We received a request to reset your StudyFlow password. This link expires in 1 hour.</p>
                    <p><a href="${resetLink}" style="display:inline-block;background:#1B2438;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Reset Password</a></p>
                    <p>If you didn't request this, you can safely ignore this email.</p>
                </div>
            `
        })
    });

    if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(`Resend API error (${response.status}): ${errorBody}`);
    }
}

module.exports = { sendPasswordResetEmail };
