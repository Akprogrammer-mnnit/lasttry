import Chat from '../models/Chat.js';
import mongoose from 'mongoose';

export const getChatMessages = async (req, res) => {
    try {
        const { roomId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 50;

        const messages = await Chat.find({ roomId })
            .populate('senderId', 'username email')
            .sort({ timestamp: -1 })
            .limit(limit)
            .skip((page - 1) * limit)
            .exec();

        const totalMessages = await Chat.countDocuments({ roomId });

        res.status(200).json({
            success: true,
            data: {
                messages: messages.reverse(),
                totalMessages,
                currentPage: page,
                totalPages: Math.ceil(totalMessages / limit)
            }
        });
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch chat messages',
            error: error.message
        });
    }
};

export const saveMessage = async (roomId, senderId, message, messageType = 'text') => {
    try {
        const newMessage = new Chat({
            roomId,
            senderId,
            message,
            messageType
        });

        const savedMessage = await newMessage.save();

        const populatedMessage = await Chat.findById(savedMessage._id)
            .populate('senderId', 'username email')
            .exec();

        return populatedMessage;
    } catch (error) {
        console.error('Error saving message:', error);
        throw error;
    }
};

export const deleteChatMessages = async (roomId) => {
    try {
        const result = await Chat.deleteMany({ roomId });
        return result;
    } catch (error) {
        console.error('Error deleting chat messages:', error);
        throw error;
    }
};

export const getMessageCount = async (req, res) => {
    try {
        const { roomId } = req.params;

        const count = await Chat.countDocuments({ roomId });

        res.status(200).json({
            success: true,
            data: { count }
        });
    } catch (error) {
        console.error('Error getting message count:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get message count',
            error: error.message
        });
    }
};
