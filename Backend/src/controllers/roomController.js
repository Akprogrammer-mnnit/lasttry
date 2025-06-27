import { roomService } from '../services/roomService.js';

export const createRoom = async (req, res) => {
    try {
        const { userId, userName } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const room = await roomService.createRoom(userId, userName);

        res.status(201).json({
            success: true,
            data: {
                roomId: room.roomId,
                createdBy: room.createdBy,
                activeUsers: 1,
                maxUsers: room.maxUsers
            }
        });
    } catch (error) {
        console.error('Error creating room:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to create room'
        });
    }
};

export const checkRoom = async (req, res) => {
    try {
        const { roomId } = req.params;

        const availability = await roomService.isRoomAvailable(roomId);
        const roomInfo = await roomService.getRoomInfo(roomId);

        if (!roomInfo.success) {
            return res.status(404).json({
                success: false,
                message: 'Room not found'
            });
        }

        res.json({
            success: true,
            data: {
                available: availability.available,
                reason: availability.reason,
                room: roomInfo.room
            }
        });
    } catch (error) {
        console.error('Error checking room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check room status'
        });
    }
};

export const joinRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { userId, userName } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const result = await roomService.joinRoom(roomId, userId, userName);

        if (!result.success) {
            return res.status(400).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            data: {
                roomId: result.room.roomId,
                activeUsers: result.activeUsers,
                maxUsers: result.room.maxUsers
            }
        });
    } catch (error) {
        console.error('Error joining room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to join room'
        });
    }
};

export const leaveRoom = async (req, res) => {
    try {
        const { roomId } = req.params;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const result = await roomService.leaveRoom(roomId, userId);

        res.json({
            success: result.success,
            message: result.success ? 'Left room successfully' : result.error
        });
    } catch (error) {
        console.error('Error leaving room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to leave room'
        });
    }
};

export const getRoomInfo = async (req, res) => {
    try {
        const { roomId } = req.params;

        const result = await roomService.getRoomInfo(roomId);

        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            data: result.room
        });
    } catch (error) {
        console.error('Error getting room info:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get room information'
        });
    }
};

export const getAllActiveRooms = async (req, res) => {
    try {
        const rooms = await roomService.getAllActiveRooms();
        const totalRooms = await roomService.getActiveRoomsCount();

        res.json({
            success: true,
            data: {
                rooms,
                totalRooms
            }
        });
    } catch (error) {
        console.error('Error getting active rooms:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get active rooms'
        });
    }
};

export const getUserRooms = async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        const room = await roomService.getUserRoom(userId);
        if (!room) {
            return res.status(404).json({
                success: false,
                message: 'No active room found for this user'
            });
        }

        res.json({
            success: true,
            data: room
        });
    } catch (error) {
        console.error('Error getting user room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get user room'
        });
    }
}

export const deleteRoom = async (req, res) => {
    try {
        const { roomId } = req.params;

        if (!roomId) {
            return res.status(400).json({
                success: false,
                message: 'Room ID is required'
            });
        }

        const result = await roomService.deleteRoom(roomId);
        console.log('Result:', result);
        if (!result.success) {
            return res.status(404).json({
                success: false,
                message: result.error
            });
        }

        res.json({
            success: true,
            message: 'Room deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting room:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete room'
        });
    }
}
