const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const connectDb = require('./config/connectDb');
const router = require('./router/index.js');
const { app, server } = require('./socket/index.js');

// Define allowed origins
const allowedOrigins = [
    'http://localhost:5173',
    'https://chat-app-front-end-netlify.netlify.app',
];

// Configure CORS with dynamic origin check
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// MongoDB connection using environment variable for Mongo URI
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch((error) => console.error("MongoDB connection error:", error));

// Home route
app.get("/", (req, res) => {
    res.send("Hello World");
});

// API endpoint
app.use("/api", router);

// Connect to the database and start the server
connectDb().then(() => {
    server.listen(process.env.PORT || 8080, () => {
        console.log("Connected to DB");
        console.log(`Server is running on port ${process.env.PORT || 8080}`);
    });
});
