const UserModel = require("../models/UserModel");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function checkPassword(req, res) {
    try {
        const { userId, password } = req.body;
        const user = await UserModel.findById(userId);
        
        if (!user || !await bcryptjs.compare(password, user.password)) {
            return res.status(400).json({ message: "Invalid credentials", error: true });
        }

        const tokenData = { id: user._id, email: user.email };
        const token = jwt.sign(tokenData, process.env.JWT_SECRET_KEY, { expiresIn: '3d' });

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'None'
        };

        res.cookie('token', token, cookieOptions).status(200).json({
            message: "Login successful",
            token: token,
            success: true
        });
    } catch (error) {
        res.status(500).json({ message: error.message || error, error: true });
    }
}

module.exports = checkPassword;
