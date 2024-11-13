const { ConversationModel } = require("../models/ConversationModel");

const getConversation = async (currentUserId) => {
    if (!currentUserId) {
        return [];
    }

    try {
        const currentUserConversation = await ConversationModel.find({
            "$or": [
                { sender: currentUserId },
                { receiver: currentUserId }
            ]
        })
        .sort({ updatedAt: -1 })
        .populate("messages")
        .populate("sender")
        .populate("receiver");

        // Map through conversations to add unread message count and last message
        const conversation = currentUserConversation.map((conv) => {
            // Check if there are messages, otherwise skip the logic
            if (!conv.messages || conv.messages.length === 0) {
                return {
                    _id: conv._id,
                    sender: conv.sender,
                    receiver: conv.receiver,
                    unseenMsg: 0,
                    lastMsg: null
                };
            }

            const countUnseenMsg = conv.messages.reduce((prev, curr) => {
                const msgUserById = curr?.msgByUserId?.toString();
                if (msgUserById !== currentUserId && !curr.seen) {
                    return prev + 1;
                }
                return prev;
            }, 0);

            return {
                _id: conv._id,
                sender: conv.sender,
                receiver: conv.receiver,
                unseenMsg: countUnseenMsg,
                lastMsg: conv.messages[conv.messages.length - 1] // last message
            };
        });

        return conversation;
    } catch (error) {
        console.error("Error fetching conversation:", error);
        return []; // return empty array on error
    }
};

module.exports = getConversation;
