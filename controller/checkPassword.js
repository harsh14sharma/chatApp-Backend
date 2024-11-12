const UserModel = require("../models/UserModel");
const bcryptjs = require("bcryptjs");
const jwt = require("jsonwebtoken");

async function checkPassword(req,res){
    try{
        const {userId, password} = req.body;

        const user = await UserModel.findById(userId);

        const verifyPassword = await bcryptjs.compare(password, user.password);

        if(!verifyPassword){
            return res.status(400).json({
                message: "password not match",
                error:true
            })
        }

        const tokenData = {
            id :user._id,
            email: user.email
        }

        const token = await jwt.sign(tokenData, process.env.JWT_SECRET_KEY, {expiresIn : '3d'});

        const cookieOptions ={
            http:true,
            secure:true
        }


        return res.cookie('token',token,cookieOptions).status(200).json({
            message: "login successfully",
            token:token,
            success:true
        })


    }
    catch(error){
        return res.status(500).json({
            message:error.message|| error,
            error: true
        })
    }
}


module.exports= checkPassword;