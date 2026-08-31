const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        passwordHash: { type: String, required: true },
        resetPasswordTokenHash: { type: String, default: null },
        resetPasswordExpires: { type: Date, default: null }
    },
    { timestamps: true }
);

userSchema.methods.setPassword = async function (plainPassword) {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(plainPassword, salt);
};

userSchema.methods.checkPassword = function (plainPassword) {
    return bcrypt.compare(plainPassword, this.passwordHash);
};

userSchema.methods.toSafeJSON = function () {
    return { id: this._id, name: this.name, email: this.email };
};

module.exports = mongoose.model("User", userSchema);