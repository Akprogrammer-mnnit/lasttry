import { Room } from '../models/Room.js';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';
class RoomService {
    constructor() {
        this.activeConnections = new Map(); // roomId -> Set of connection IDs
        this.userConnections = new Map(); // userId -> roomId
        this.roomLocks = new Map(); // roomId -> Promise 

        setInterval(() => {
            this.cleanupOldRooms();
        }, 60 * 60 * 1000);
    }

    generateRoomId() {
        const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    async createRoom(creatorId, userName = 'Anonymous') {
        let roomId;
        let attempts = 0;
        const maxAttempts = 20;


        do {
            roomId = this.generateRoomId();
            attempts++;

            const existingRoom = await Room.findActiveRoom(roomId);
            const hasActiveConnections = this.activeConnections.has(roomId);

            if (!existingRoom && !hasActiveConnections) {
                try {
                    const room = new Room({
                        roomId,
                        createdBy: creatorId,
                        users: [{
                            userId: creatorId,
                            userName,
                            joinedAt: new Date(),
                            isActive: true
                        }],
                        isActive: true
                    });

                    await room.save();

                    this.activeConnections.set(roomId, new Set([creatorId]));
                    this.userConnections.set(creatorId, roomId);

                    console.log(`✅ Room created successfully: ${roomId} by ${creatorId}`);
                    return room;

                } catch (error) {
                    if (error.code === 11000) {
                        console.log(`⚠️ Duplicate room ID detected: ${roomId}, trying again...`);
                        continue;
                    }
                    throw error;
                }
            }
        } while (attempts < maxAttempts);

        throw new Error('Unable to generate unique room ID after multiple attempts');
    }

    async joinRoom(roomId, userId, userName = 'Anonymous') {
        const lockKey = `join_${roomId}`;
        if (this.roomLocks.has(lockKey)) {
            await this.roomLocks.get(lockKey);
        }

        const lockPromise = this._joinRoomInternal(roomId, userId, userName);
        this.roomLocks.set(lockKey, lockPromise);

        try {
            const result = await lockPromise;
            return result;
        } finally {
            this.roomLocks.delete(lockKey);
        }
    }

    async _joinRoomInternal(roomId, userId, userName) {
        try {
            const room = await Room.findActiveRoom(roomId);
            if (!room) {
                return {
                    success: false,
                    error: 'Room not found or inactive'
                };
            }

            const currentConnections = this.activeConnections.get(roomId) || new Set();

            const activeUsersInDb = room.users.filter(user => user.isActive).length;

            const maxActiveUsers = Math.max(currentConnections.size, activeUsersInDb);

            if (maxActiveUsers >= room.maxUsers && !currentConnections.has(userId)) {
                return {
                    success: false,
                    error: 'Room is full (maximum 2 users)'
                };
            }

            const existingRoom = this.userConnections.get(userId);
            if (existingRoom && existingRoom !== roomId) {
                await this.leaveRoom(existingRoom, userId);
            }

            const updatedRoom = await Room.addUserToRoom(roomId, userId, userName);

            // Track connection
            currentConnections.add(userId);
            this.activeConnections.set(roomId, currentConnections);
            this.userConnections.set(userId, roomId);

            console.log(`✅ User ${userId} joined room ${roomId}. Active users: ${currentConnections.size}/2`);

            return {
                success: true,
                room: updatedRoom,
                activeUsers: currentConnections.size
            };

        } catch (error) {
            console.error(`❌ Error joining room ${roomId}:`, error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async leaveRoom(roomId, userId) {
        try {
            const connections = this.activeConnections.get(roomId);
            if (connections) {
                connections.delete(userId);
                if (connections.size === 0) {
                    this.activeConnections.delete(roomId);
                    console.log(`🗑️ Room ${roomId} removed from active connections`);
                } else {
                    this.activeConnections.set(roomId, connections);
                }
            }
            this.userConnections.delete(userId);

            await Room.removeUserFromRoom(roomId, userId);

            console.log(`👋 User ${userId} left room ${roomId}`);
            return { success: true };
        } catch (error) {
            console.error('❌ Error leaving room:', error);
            return { success: false, error: error.message };
        }
    }

    async getRoomInfo(roomId) {
        try {
            const room = await Room.findActiveRoom(roomId);
            if (!room) {
                return { success: false, error: 'Room not found' };
            }

            const activeConnections = this.activeConnections.get(roomId) || new Set();
            const activeUsers = room.users.filter(user =>
                user.isActive && (activeConnections.has(user.userId) || activeConnections.size === 0)
            );

            return {
                success: true,
                room: {
                    roomId: room.roomId,
                    createdBy: room.createdBy,
                    activeUsers: Math.max(activeConnections.size, activeUsers.length),
                    maxUsers: room.maxUsers,
                    users: activeUsers.map(user => ({
                        userId: user.userId,
                        userName: user.userName,
                        joinedAt: user.joinedAt
                    })),
                    lastActivity: room.lastActivity,
                    hasSpace: activeConnections.size < room.maxUsers
                }
            };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    async isRoomAvailable(roomId) {
        try {
            const room = await Room.findActiveRoom(roomId);
            if (!room) {
                return { available: false, reason: 'Room not found' };
            }

            const currentConnections = this.activeConnections.get(roomId) || new Set();
            const activeUsersInDb = room.users.filter(user => user.isActive).length;
            const maxActiveUsers = Math.max(currentConnections.size, activeUsersInDb);

            if (maxActiveUsers >= room.maxUsers) {
                return { available: false, reason: 'Room is full' };
            }

            return {
                available: true,
                activeUsers: maxActiveUsers,
                maxUsers: room.maxUsers
            };
        } catch (error) {
            return { available: false, reason: 'Error checking room availability' };
        }
    }


    async getActiveRoomsCount() {
        return await Room.countDocuments({ isActive: true });
    }

    async cleanupOldRooms() {
        try {
            const result = await Room.cleanupOldRooms();

            const staleRooms = [];
            for (const [roomId, connections] of this.activeConnections.entries()) {
                const room = await Room.findActiveRoom(roomId);
                if (!room) {
                    staleRooms.push(roomId);
                }
            }

            staleRooms.forEach(roomId => {
                this.activeConnections.delete(roomId);
            });

            if (result.deletedCount > 0 || staleRooms.length > 0) {
                console.log(`🧹 Cleaned up ${result.deletedCount} old rooms and ${staleRooms.length} stale connections`);
            }
        } catch (error) {
            console.error('❌ Error cleaning up old rooms:', error);
        }
    }

    async handleDisconnect(userId) {
        const roomId = this.userConnections.get(userId);
        if (roomId) {
            await this.leaveRoom(roomId, userId);
        }
    }

    async getAllActiveRooms() {
        try {
            const rooms = await Room.find({ isActive: true })
                .select('roomId createdBy users lastActivity')
                .sort({ lastActivity: -1 });

            return rooms.map(room => {
                const activeConnections = this.activeConnections.get(room.roomId) || new Set();
                const activeUsers = room.users.filter(u => u.isActive).length;

                return {
                    roomId: room.roomId,
                    createdBy: room.createdBy,
                    activeUsers: Math.max(activeConnections.size, activeUsers),
                    maxUsers: 2,
                    lastActivity: room.lastActivity,
                    hasSpace: activeConnections.size < 2
                };
            });
        } catch (error) {
            console.error('❌ Error getting active rooms:', error);
            return [];
        }
    }

    getConnectionStatus(roomId) {
        const connections = this.activeConnections.get(roomId);
        return {
            connected: connections ? connections.size : 0,
            hasSpace: !connections || connections.size < 2
        };
    }
    async getUserRoom(userId) {

        const userrooms = await Room.aggregate([
            {
                $match: {
                    createdBy: new mongoose.Types.ObjectId(userId)
                }
            }
        ]);

        return userrooms;
    }

    async deleteRoom(roomId) {
        console.log('Deleting room:', roomId);
        try {
            const room = await Room.findOneAndDelete(
                { roomId: roomId }
            );
            console.log('Room deleted:', room);
            if (!room) {
                return { success: false, message: 'Room not found' };
            }
            return { success: true, message: 'Room deleted successfully' };
        } catch (error) {
            console.error('Error deleting room:', error);
            return { success: false, message: 'Failed to delete room' };
        }
    }
}




export const roomService = new RoomService();