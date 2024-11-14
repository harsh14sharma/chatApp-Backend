// Import dependencies
const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const UserModel = require('../models/UserModel');
const getUserDetailsFromToken = require('../helper/getUserDetailsFromToken');
const { ConversationModel } = require('../models/ConversationModel');

// Initialize Express and HTTP server
const app = express();
const server = http.createServer(app);

// Configure CORS and Socket.io
const io = new Server(server, {
    cors: {
        origin: [process.env.FRONTENED_URL, 'http://localhost:5173'], // Add localhost for dev
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

const onlineUsers = new Map(); // Store user details with ID

// Middleware to verify WebSocket authentication
io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication token is required'));
    }

    try {
        const user = await getUserDetailsFromToken(token);
        if (!user) return next(new Error('Invalid token'));
        socket.user = user; // Store user information in the socket
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});

// Handle WebSocket connection
io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.set(userId, { _id: socket.user._id, name: socket.user.name, status: 'online' });

    // Notify all clients of online users
    io.emit('onlineUser', Array.from(onlineUsers.values()));

    // Handle "message-page" event
    socket.on('message-page', async (otherUserId) => {
        try {
            const userDetails = await UserModel.findById(otherUserId).select('-password');
            if (!userDetails) return socket.emit('error', 'User not found');
            
            const payload = { _id: userDetails._id, name: userDetails.name, email: userDetails.email };
            socket.emit('message-user', payload);

            // Fetch previous messages and emit to client
            const conversation = await ConversationModel.findOne({
                "$or": [
                    { sender: socket.user._id, receiver: otherUserId },
                    { sender: otherUserId, receiver: socket.user._id }
                ]
            }).populate('messages').sort({ updatedAt: -1 });

            socket.emit('message', conversation?.messages || []);
        } catch (err) {
            console.error('Error fetching messages:', err);
            socket.emit('error', 'Failed to fetch conversation');
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        onlineUsers.delete(userId); // Remove user from online list
        io.emit('onlineUser', Array.from(onlineUsers.values())); // Notify all clients
    });
});

// Define a basic route for health check (optional)
app.get('/', (req, res) => {
    res.send("Socket server is running");
});

// Export both app and server
module.exports = { app, server };

// Start the server if this file is run directly
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}`);
    });
}
