const express = require('express');
const cors= require('cors');
require('dotenv').config();
const connectDb= require('./config/connectDb');
const router= require('./router/index.js');
const cookieParser = require('cookie-parser');
const{app,server} = require('./socket/index.js');


//  const app = express();
app.use(cors({
    origin:process.env.FRONTENED_URL,
    credentials:true
}));

/**    socket is running at http://localhost:8080/        */


app.use(express.json());
app.use(cookieParser());

const PORT = 8080;

app.get("/", (req,res)=>{
    res.send("Hello World");
})

//api end point 
app.use("/api",router);

connectDb().then(()=>{
    server.listen(PORT,()=>{
        console.log("connected to DB");
        console.log(`Server is running on port ${PORT}`);
    })
})
