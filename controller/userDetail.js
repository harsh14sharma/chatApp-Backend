// user details means login function


const getUserDetailsFromToken = require('../helper/getUserDetailsFromToken');


async function userDetail(req,res){
    try{
        const token = req.cookies.token || "" ;

        const user =  await getUserDetailsFromToken(token)

        return res.status(200).json({
            message: "user details",
            data: user
        })
    }
    catch(error){
        return res.status(500).json({
            message: error.message|| error,
            error:true
        })
    }
}
module.exports = userDetail;