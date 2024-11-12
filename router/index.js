const express= require('express');
const registerUser = require('../controller/registerUser');
const checkEmail = require('../controller/checkEmail');
const checkPassword = require('../controller/checkPassword');
const userDetail = require('../controller/userDetail');
const logout = require('../controller/logout');
const updateUserDetails = require('../controller/updateUserDetails');
const searchUser = require('../controller/searchUser');




const router = express.Router();

//ceate uer api

router.post("/register", registerUser);

// check email api
router.post("/email", checkEmail);

// check user password
router.post("/password", checkPassword);

// login user details
router.get("/user-detail", userDetail);

// logout user detail
router.get("/logout", logout);

// update detail
router.post("/update-details", updateUserDetails);

// search user
router.post("/search-user", searchUser);






module.exports= router;
