const express = require('express');
const registerUser = require('../controller/registerUser');
const checkEmail = require('../controller/checkEmail');
const checkPassword = require('../controller/checkPassword');
const userDetail = require('../controller/userDetail');
const logout = require('../controller/logout');
const updateUserDetails = require('../controller/updateUserDetails');
const searchUser = require('../controller/searchUser');
const getConversation = require('../helper/getConversation');
const getUserDetailsFromToken = require('../helper/getUserDetailsFromToken');

const router = express.Router();

// Middleware to authenticate the user based on the JWT token
const authenticate = async (req, res, next) => {
    const token = req.cookies.token;  // Assuming the token is stored in cookies

    if (!token) {
        return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
        const user = await getUserDetailsFromToken(token);
        if (user.logout) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
        req.user = user;  // Attach the user details to the request object
        next();  // Move to the next middleware or route handler
    } catch (error) {
        res.status(401).json({ message: 'Invalid or expired token' });
    }
};

// Create user API
router.post("/register", registerUser);

// Check email API
router.post("/email", checkEmail);

// Check user password
router.post("/password", checkPassword);

// Login user details
router.get("/user-detail", userDetail);

// Logout user
router.get("/logout", logout);

// Update user details
router.post("/update-details", updateUserDetails);

// Search user
router.post("/search-user", searchUser);

// Dashboard route - fetch user details and conversations
router.get('/dashboard', authenticate, async (req, res) => {
    try {
        const user = req.user;  // User from the authenticate middleware
        const conversations = await getConversation(user._id);
        
        res.status(200).json({ user, conversations });
    } catch (error) {
        console.error("Error fetching dashboard data:", error);
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
});

module.exports = router;
