import express from 'express';
import {
    getRoomFiles,
    createFileOrFolder,
    updateFile,
    deleteFileOrFolder,
    getFileContent
} from '../controllers/fileController.js';

const router = express.Router();

router.get('/:roomId', getRoomFiles);

router.post('/', createFileOrFolder);

router.put(/^\/([^\/]+)\/(.+)$/, updateFile);
router.delete(/^\/([^\/]+)\/(.+)$/, deleteFileOrFolder);
router.get(/^\/([^\/]+)\/(.+)$/, getFileContent);

export default router;
