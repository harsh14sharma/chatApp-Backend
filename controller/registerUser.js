const UserModel = require("../models/UserModel");
const bcryptjs = require("bcryptjs");




async function registerUser(req, res){
    try{
        const {name, email, password, profile_pic} = req.body;
        const checkEmail = await UserModel.findOne({email});
        if(checkEmail){
            return res.status(400).json({
                message: "Email already exists",
                error: true,
            });
        }

        // password and hashpassword

        const salt = await bcryptjs.genSalt(10);
        const hashPassword= await bcryptjs.hash(password, salt);

        const payload={
            name,
            email,
            password: hashPassword,
            profile_pic
        }

        const user = await UserModel(payload);
        const userSave = await user.save();

        return res.status(201).json({
            message: "User registered successfully",
            error: false,
            data: userSave,
            success:true
        });

    }
    catch(error){
        return res.status(500).json({
            message: error.message || error,
            error: true
        });
    }
}

module.exports= registerUser;