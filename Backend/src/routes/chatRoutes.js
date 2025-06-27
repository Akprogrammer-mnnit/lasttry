import express from 'express';
import { getChatMessages, getMessageCount } from '../controllers/chatController.js';

const router = express.Router();

router.get('/:roomId/messages', getChatMessages);

router.get('/:roomId/count', getMessageCount);

export default router;