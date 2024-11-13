const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const UserModel = require('../models/UserModel');
const getUserDetailsFromToken = require('../helper/getUserDetailsFromToken');
const { ConversationModel, MessageModel } = require('../models/ConversationModel');
const getConversation = require('../helper/getConversation');

const app = express();
const server = http.createServer(app);

// Initialize socket.io with CORS and authentication support
const io = new Server(server, {
  cors: {
    origin: ['https://chat-app-front-end-netlify.netlify.app', 'http://localhost:5173'], // The frontend URL (ensure this is set correctly)
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true, // Allow cookies
    pingTimeout: 60000, // 30 seconds
    pingInterval: 25000, // 25 seconds
},
});

const onlineUser = new Set(); // Track online users

// WebSocket connection handler
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Get token from the handshake auth
  const token = socket.handshake.auth.token;
  if (!token) {
    socket.emit('error', 'Authentication token is required');
    socket.disconnect();
    return;
  }

  // Authenticate user with the token
  getUserDetailsFromToken(token)
    .then(async (user) => {
      if (!user) {
        socket.emit('error', 'Invalid token');
        socket.disconnect();
        return;
      }

      console.log('Authenticated user:', user);

      // Join a room based on the user ID
      socket.join(user._id.toString());
      onlineUser.add(user._id.toString());

      // Emit the online users list to all clients
      io.emit('onlineUser', Array.from(onlineUser));

      // Handle 'message-page' event to get previous conversations for a user
      socket.on('message-page', async (userId) => {
        try {
          const userDetails = await UserModel.findById(userId).select('-password');
          if (!userDetails) {
            socket.emit('error', 'User not found');
            return;
          }

          const payload = {
            _id: userDetails._id,
            name: userDetails.name,
            email: userDetails.email,
            profile_pic: userDetails.profile_pic,
            online: onlineUser.has(userId),
          };

          socket.emit('message-user', payload);

          // Get previous conversation messages
          const conversation = await ConversationModel.findOne({
            "$or": [
              { sender: user._id, receiver: userId },
              { sender: userId, receiver: user._id },
            ]
          }).populate('messages').sort({ updatedAt: -1 });

          socket.emit('message', conversation?.messages || []);
        } catch (err) {
          console.error('Error fetching messages:', err);
          socket.emit('error', 'Failed to fetch conversation');
        }
      });

      // Handle 'new-message' event to send a new message
      socket.on('new-message', async (data) => {
        try {
          if (!data.sender || !data.receiver || !data.text) {
            socket.emit('error', 'Missing required message data');
            return;
          }

          // Check if conversation exists between the users
          let conversation = await ConversationModel.findOne({
            "$or": [
              { sender: data.sender, receiver: data.receiver },
              { sender: data.receiver, receiver: data.sender },
            ]
          });

          // If conversation doesn't exist, create a new one
          if (!conversation) {
            conversation = await new ConversationModel({
              sender: data.sender,
              receiver: data.receiver,
            }).save();
          }

          // Create a new message
          const message = new MessageModel({
            text: data.text,
            imageUrl: data.imageUrl,
            videoUrl: data.videoUrl,
            msgByUserId: data.msgByUserId,
          });

          const savedMessage = await message.save();

          // Update the conversation with the new message
          await ConversationModel.updateOne(
            { _id: conversation._id },
            { $push: { messages: savedMessage._id } }
          );

          // Fetch the updated conversation
          const updatedConversation = await ConversationModel.findOne({
            "$or": [
              { sender: data.sender, receiver: data.receiver },
              { sender: data.receiver, receiver: data.sender },
            ]
          }).populate('messages').sort({ updatedAt: -1 });

          // Emit the updated messages to both sender and receiver
          io.to(data.sender).emit('message', updatedConversation.messages || []);
          io.to(data.receiver).emit('message', updatedConversation.messages || []);

          // Emit the updated conversation to both users
          const conversationSender = await getConversation(data.sender);
          const conversationReceiver = await getConversation(data.receiver);

          io.to(data.sender).emit('conversation', conversationSender);
          io.to(data.receiver).emit('conversation', conversationReceiver);
        } catch (err) {
          console.error('Error sending message:', err);
          socket.emit('error', 'Failed to send message');
        }
      });

      // Handle 'sidebar' event to get sidebar conversations
      socket.on('sidebar', async (currentUserId) => {
        try {
          const conversation = await getConversation(currentUserId);
          socket.emit('conversation', conversation);
        } catch (err) {
          console.error('Error fetching sidebar conversations:', err);
          socket.emit('error', 'Failed to fetch conversations');
        }
      });

      // Handle 'seen' event to mark a message as seen
      socket.on('seen', async (msgByUserId) => {
        try {
          let conversation = await ConversationModel.findOne({
            "$or": [
              { sender: user._id, receiver: msgByUserId },
              { sender: msgByUserId, receiver: user._id },
            ]
          });

          const conversationMessageIds = conversation?.messages || [];
          await MessageModel.updateMany(
            { _id: { "$in": conversationMessageIds }, msgByUserId: msgByUserId },
            { "$set": { seen: true } }
          );

          // Emit updated conversation to both users
          const conversationSender = await getConversation(user._id.toString());
          const conversationReceiver = await getConversation(msgByUserId);

          io.to(user._id.toString()).emit('conversation', conversationSender);
          io.to(msgByUserId).emit('conversation', conversationReceiver);
        } catch (err) {
          console.error('Error updating message status:', err);
          socket.emit('error', 'Failed to update message status');
        }
      });

      // Handle user disconnection
      socket.on('disconnect', () => {
        onlineUser.delete(user._id.toString());
        io.emit('onlineUser', Array.from(onlineUser)); // Broadcast updated online users list
        console.log('User disconnected:', socket.id);
      });

    })
    .catch((err) => {
      console.error('Error during authentication:', err);
      socket.emit('error', 'Failed to authenticate user');
      socket.disconnect();
    });
});

module.exports = {
  app,
  server,
};
