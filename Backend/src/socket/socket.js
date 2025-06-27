import { saveMessage } from '../controllers/chatController.js';

const activeRooms = new Map();

export const handleChatSocket = (io) => {

    io.on('connection', (socket) => {
        console.log("Socket.io connected ", socket.id);

        socket.on('join-room', async ({ roomId, userId, username }) => {
            try {
                const previousRooms = Array.from(socket.rooms).filter(room => room !== socket.id);
                previousRooms.forEach(room => {
                    socket.leave(room);
                    updateRoomUsers(room, socket.id, 'leave');
                });

                socket.join(roomId);
                socket.roomId = roomId;
                socket.userId = userId;
                socket.username = username;

                updateRoomUsers(roomId, socket.id, 'join', { userId, username });

                const roomUsers = getRoomUsers(roomId);

                socket.emit('room-joined', {
                    roomId,
                    roomUsers: roomUsers.length,
                    users: roomUsers
                });

                console.log(`User ${username} joined room ${roomId}`);
            } catch (error) {
                console.error('Error joining room:', error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        socket.on('send-message', async ({ roomId, userId, message }) => {
            try {
                if (!roomId || !userId || !message.trim()) {
                    socket.emit('error', { message: 'Invalid message data' });
                    return;
                }

                if (!socket.rooms.has(roomId)) {
                    socket.emit('error', { message: 'You are not in this room' });
                    return;
                }

                const savedMessage = await saveMessage(roomId, userId, message.trim());

                io.to(roomId).emit('new-message', savedMessage);

                console.log(`Message sent in room ${roomId} by user ${userId}`);
            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        socket.on('typing-start', ({ roomId, userId, username }) => {
            socket.to(roomId).emit('user-typing', { userId, username, isTyping: true });
        });

        socket.on('typing-stop', ({ roomId, userId, username }) => {
            socket.to(roomId).emit('user-typing', { userId, username, isTyping: false });
        });

        socket.on('leave-room', ({ roomId, userId, username }) => {
            handleUserLeaving(socket, roomId, userId, username);
        });

        socket.on('disconnect', () => {
            console.log('Socket.io disconnected', socket.id);

            if (socket.roomId && socket.userId && socket.username) {
                handleUserLeaving(socket, socket.roomId, socket.userId, socket.username);
            }
        });
    });
};

const handleUserLeaving = async (socket, roomId, userId, username) => {
    try {
        updateRoomUsers(roomId, socket.id, 'leave');

        const roomUsers = getRoomUsers(roomId);

        socket.to(roomId).emit('user-left', {
            userId,
            username,
            roomUsers: roomUsers.length
        });


        socket.leave(roomId);

        console.log(`User ${username} left room ${roomId}`);
    } catch (error) {
        console.error('Error handling user leaving:', error);
    }
};

const updateRoomUsers = (roomId, socketId, action, userInfo = null) => {
    if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Map());
    }

    const roomUsers = activeRooms.get(roomId);

    if (action === 'join' && userInfo) {
        roomUsers.set(socketId, userInfo);
    } else if (action === 'leave') {
        roomUsers.delete(socketId);

        if (roomUsers.size === 0) {
            activeRooms.delete(roomId);
        }
    }
};

const getRoomUsers = (roomId) => {
    if (!activeRooms.has(roomId)) {
        return [];
    }

    return Array.from(activeRooms.get(roomId).values());
};