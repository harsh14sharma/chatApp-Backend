const jwt = require("jsonwebtoken");
const UserModel = require("../models/UserModel");

const getUserDetailsFromToken = async (token) => {
    if (!token) {
        return { message: "Session out", logout: true };
    }

    try {
        // Verify the token and decode it
        const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

        // Find the user based on the decoded user ID
        const user = await UserModel.findById(decoded.id).select('-password');

        if (!user) {
            return { message: "User not found", logout: true };
        }

        return user;
    } catch (error) {
        console.error("Error verifying token:", error);
        return { message: "Invalid or expired token", logout: true };
    }
};

module.exports = getUserDetailsFromToken;
