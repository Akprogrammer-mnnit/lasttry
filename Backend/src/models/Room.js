import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    users: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },
        userName: {
            type: String,
            default: 'Anonymous'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        },
        isActive: {
            type: Boolean,
            default: true
        }
    }],
    maxUsers: {
        type: Number,
        default: 2
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastActivity: {
        type: Date,
        default: Date.now
    },
}, {
    timestamps: true
});

roomSchema.index({ roomId: 1, isActive: 1 });
roomSchema.index({ lastActivity: 1 });

roomSchema.pre('save', function (next) {
    this.lastActivity = new Date();
    next();
});

roomSchema.statics.findActiveRoom = function (roomId) {
    return this.findOne({ roomId, isActive: true });
};

roomSchema.statics.getActiveUserCount = function (roomId) {
    return this.aggregate([
        { $match: { roomId, isActive: true } },
        { $unwind: '$users' },
        { $match: { 'users.isActive': true } },
        { $count: 'activeUsers' }
    ]).then(result => result[0]?.activeUsers || 0);
};

roomSchema.statics.addUserToRoom = async function (roomId, userId, userName = 'Anonymous') {
    const room = await this.findActiveRoom(roomId);
    if (!room) {
        throw new Error('Room not found');
    }

    const activeUsers = room.users.filter(user => user.isActive);
    if (activeUsers.length >= room.maxUsers) {
        throw new Error('Room is full');
    }

    const existingUser = room.users.find(user => user.userId === userId);
    if (existingUser) {
        existingUser.isActive = true;
        existingUser.joinedAt = new Date();
    } else {
        room.users.push({
            userId,
            userName,
            joinedAt: new Date(),
            isActive: true
        });
    }

    await room.save();
    return room;
};

roomSchema.statics.removeUserFromRoom = async function (roomId, userId) {
    const room = await this.findActiveRoom(roomId);
    if (!room) return null;

    const user = room.users.find(user => user.userId.toString() === userId.toString());
    if (user) {
        user.isActive = false;
    }

    const activeUsers = room.users.filter(user => user.isActive);
    room.users = activeUsers;
    await room.save();
    if (activeUsers.length === 0) {
        room.isActive = false;
        return null;
    }
    return room;
};

roomSchema.statics.cleanupOldRooms = function () {
    const cutoffDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.deleteMany({
        $or: [
            { isActive: false, updatedAt: { $lt: cutoffDate } },
            { lastActivity: { $lt: cutoffDate } }
        ]
    });
};

export const Room = mongoose.model('Room', roomSchema);