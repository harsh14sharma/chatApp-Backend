const mongoose = require('mongoose');

async function connectDb(){
    try{
        await mongoose.connect(process.env.MONGODB_URL)

        const connection = mongoose.connection;

        connection.on("connected",()=>{
            console.log("connect to DB");
        })

        connection.on("error",()=>{
            console.log("Something is wrong in mongodb", error);
        })
    }
    catch(error){
        console.log("Something is wrong");
    }
}

module.exports = connectDb;