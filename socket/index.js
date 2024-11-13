const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const UserModel = require('../models/UserModel');
const getUserDetailsFromToken = require('../helper/getUserDetailsFromToken');
const { ConversationModel, MessageModel } = require('../models/ConversationModel');
const getConversation = require('../helper/getConversation');

const app = express();
const server = http.createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: process.env.FRONTENED_URL,
//     credentials: true,
//   },
// });

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
    
  },
//   pingInterval: 25000,  // Ping interval in ms
//   pingTimeout: 60000,   // Timeout in ms before considering the connection dead
});

server.listen(3000, () => {
  console.log('listening on *:3000');
});

const onlineUser = new Set();

io.on('connection', (socket) => {
  console.log('User connected', socket.id);

  const token = socket.handshake.auth.token;
  if (!token) {
    socket.emit('error', 'Authentication token is required');
    socket.disconnect();
    return;
  }

  // Get current user details
  getUserDetailsFromToken(token)
    .then(async (user) => {
      if (!user) {
        socket.emit('error', 'Invalid token');
        socket.disconnect();
        return;
      }

      console.log('User:', user);
      socket.join(user._id.toString()); // Join room based on user ID
      onlineUser.add(user._id.toString());

      io.emit('onlineUser', Array.from(onlineUser)); // Broadcast online users list

      // Handle message page request
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
          console.error(err);
          socket.emit('error', 'Failed to fetch conversation');
        }
      });

      // Handle new message event
      socket.on('new-message', async (data) => {
        try {
          if (!data.sender || !data.receiver || !data.text) {
            socket.emit('error', 'Missing required message data');
            return;
          }

          // Check if conversation exists
          let conversation = await ConversationModel.findOne({
            "$or": [
              { sender: data.sender, receiver: data.receiver },
              { sender: data.receiver, receiver: data.sender },
            ]
          });

          // Create new conversation if not exists
          if (!conversation) {
            conversation = await new ConversationModel({
              sender: data.sender,
              receiver: data.receiver,
            }).save();
          }

          // Create new message and save
          const message = new MessageModel({
            text: data.text,
            imageUrl: data.imageUrl,
            videoUrl: data.videoUrl,
            msgByUserId: data.msgByUserId,
          });
          const savedMessage = await message.save();

          // Update conversation with new message
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

          // Emit new messages to both sender and receiver
          io.to(data.sender).emit('message', updatedConversation.messages || []);
          io.to(data.receiver).emit('message', updatedConversation.messages || []);

          // Emit updated conversation to both users
          const conversationSender = await getConversation(data.sender);
          const conversationReceiver = await getConversation(data.receiver);

          io.to(data.sender).emit('conversation', conversationSender);
          io.to(data.receiver).emit('conversation', conversationReceiver);
        } catch (err) {
          console.error(err);
          socket.emit('error', 'Failed to send message');
        }
      });

      // Handle sidebar conversation request
      socket.on('sidebar', async (currentUserId) => {
        try {
          const conversation = await getConversation(currentUserId);
          socket.emit('conversation', conversation);
        } catch (err) {
          console.error(err);
          socket.emit('error', 'Failed to fetch conversations');
        }
      });

      // Handle message seen event
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
          console.error(err);
          socket.emit('error', 'Failed to update message status');
        }
      });

      // Handle disconnect event
      socket.on('disconnect', () => {
        onlineUser.delete(user._id.toString());
        io.emit('onlineUser', Array.from(onlineUser)); // Broadcast updated online users list
        console.log('User disconnected', socket.id);
      });
    })
    .catch((err) => {
      console.error('Error during connection:', err);
      socket.emit('error', 'Failed to authenticate user');
      socket.disconnect();
    });
});

module.exports = {
  app,
  server,
};
