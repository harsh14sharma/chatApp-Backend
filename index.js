const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const connectDb = require('./config/connectDb');
const router = require('./router/index.js');
const { app, server } = require('./socket/index.js'); // assuming socket/index.js initializes socket.io

// Define allowed origins for CORS
const allowedOrigins = [
    'http://localhost:5173',
    'https://chat-app-front-end-netlify.netlify.app',
];

// Configure CORS with dynamic origin check
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'), false);
        }
    },
    credentials: true, // Allow cookies to be sent
};

// Use CORS middleware with dynamic origin check
app.use(cors(corsOptions));

// Middleware to parse JSON and cookies
app.use(express.json());
app.use(cookieParser());

// MongoDB connection using environment variable for Mongo URI
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log("Connected to MongoDB"))
.catch((error) => console.error("MongoDB connection error:", error));

// Socket.IO CORS configuration (for WebSocket connections)
const io = require('socket.io')(server, {
    cors: {
        origin: allowedOrigins, // Allow only the specified origins for socket.io
        methods: ["GET", "POST"],
        credentials: true, // Allow cookies for socket.io
    },
});

io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Home route (testing route)
app.get("/", (req, res) => {
    res.send("Hello World");
});

// API route
app.use("/api", router);

// Connect to the database and start the server
connectDb().then(() => {
    server.listen(process.env.PORT || 8080, () => {
        console.log("Connected to DB");
        console.log(`Server is running on port ${process.env.PORT || 8080}`);
    });
}).catch((error) => {
    console.error('Error connecting to the database:', error);
});
