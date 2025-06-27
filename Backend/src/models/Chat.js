import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        index: true
    },
    senderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    messageType: {
        type: String,
        enum: ['text', 'system'],
        default: 'text'
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

chatSchema.index({ roomId: 1, timestamp: -1 });

const Chat = mongoose.model('Chat', chatSchema);

export default Chat;