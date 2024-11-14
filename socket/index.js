const { Server } = require('socket.io');
const http = require('http');
const UserModel = require('../models/UserModel');
const getUserDetailsFromToken = require('../helper/getUserDetailsFromToken');
const { ConversationModel, MessageModel } = require('../models/ConversationModel');

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: ['https://your-deployed-frontend.netlify.app', 'http://localhost:5173'],
        methods: ['GET', 'POST'],
        credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

const onlineUsers = new Set();

io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication token is required'));
    }

    try {
        const user = await getUserDetailsFromToken(token);
        if (!user) return next(new Error('Invalid token'));
        socket.user = user;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});

io.on('connection', (socket) => {
    const userId = socket.user._id.toString();
    onlineUsers.add(userId);
    socket.join(userId);

    // Notify all clients of online users
    io.emit('onlineUser', Array.from(onlineUsers));

    socket.on('message-page', async (userId) => {
        try {
            // Fetch messages and send them back
            const userDetails = await UserModel.findById(userId).select('-password');
            if (!userDetails) return socket.emit('error', 'User not found');
            
            const payload = { _id: userDetails._id, name: userDetails.name, email: userDetails.email };
            socket.emit('message-user', payload);

            // Fetch previous messages and emit to client
            const conversation = await ConversationModel.findOne({
                "$or": [{ sender: socket.user._id, receiver: userId }, { sender: userId, receiver: socket.user._id }]
            }).populate('messages').sort({ updatedAt: -1 });

            socket.emit('message', conversation?.messages || []);
        } catch (err) {
            console.error('Error fetching messages:', err);
            socket.emit('error', 'Failed to fetch conversation');
        }
    });

    socket.on('disconnect', () => {
        onlineUsers.delete(userId);
        io.emit('onlineUser', Array.from(onlineUsers));
    });
});

module.exports = { app, server };
