const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDb = require('./config/connectDb');
const router = require('./router/index.js');
const cookieParser = require('cookie-parser');
const { app, server } = require('./socket/index.js');

app.use(cors({
  origin: process.env.FRONTENED_URL,
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("Hello World");
});

// API endpoints
app.use("/api", router);

// Connect to the database and start the server
connectDb().then(() => {
  server.listen(PORT, () => {
    console.log("Connected to DB");
    console.log(`Server is running on port ${PORT}`);
  });
}).catch((error) => {
  console.error("Failed to connect to DB:", error.message);
});
