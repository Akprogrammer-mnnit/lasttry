import { File } from '../models/File.js';

export const getRoomFiles = async (req, res) => {
    try {
        const { roomId } = req.params;
        const files = await File.find({ roomId });
        return res.status(200).json({ success: true, files });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

export const createFileOrFolder = async (req, res) => {
    try {
        const { roomId, name, path, type, content = '', language = null } = req.body;
        const newFile = new File({ roomId, name, path, type, content, language });
        await newFile.save();
        return res.status(201).json({ success: true, file: newFile });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, error: 'File or folder already exists at this path.' });
        }
        return res.status(500).json({ success: false, error: err.message });
    }
};

export const updateFile = async (req, res) => {
    try {
        const roomId = req.params[0];
        const filePath = req.params[1];
        const { content, language } = req.body;
        console.log(roomId, filePath, content, language);
        const file = await File.findOneAndUpdate(
            { roomId, path: filePath, type: 'file' },
            { content, language, updatedAt: new Date() },
            { new: true }
        );

        if (!file) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }

        return res.status(200).json({ success: true, file });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};

export const getFileContent = async (req, res) => {
    try {
        const roomId = req.params[0];
        const filePath = req.params[1];

        const file = await File.findOne({ roomId, path: filePath });
        if (!file) {
            return res.status(404).json({ success: false, error: 'File not found' });
        }
        return res.status(200).json({ success: true, content: file.content, language: file.language });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
}
export const deleteFileOrFolder = async (req, res) => {
    try {
        const roomId = req.params[0];
        const filePath = req.params[1];

        await File.deleteMany({
            roomId,
            $or: [
                { path: filePath },
                { path: { $regex: `^${filePath}/` } }
            ]
        });

        return res.status(200).json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
};
