import express from 'express';
import {
    createRoom,
    checkRoom,
    joinRoom,
    leaveRoom,
    getRoomInfo,
    getAllActiveRooms,
    getUserRooms,
    deleteRoom
} from '../controllers/roomController.js';

const router = express.Router();

router.post('/create', createRoom);

router.get('/:roomId/check', checkRoom);

router.post('/:roomId/join', joinRoom);

router.post('/:roomId/leave', leaveRoom);

router.get('/:roomId/info', getRoomInfo);

router.route('/getUserRoom/:userId').get(getUserRooms)

router.route('/:roomId/delete').delete(deleteRoom);
router.get('/admin/active', getAllActiveRooms);

export default router;