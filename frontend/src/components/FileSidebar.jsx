import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
    FolderIcon,
    File,
    PlusIcon,
    TrashIcon,
    FolderOpen,
    FileText,
    Image,
    Code,
    Video,
    Music,
    RefreshCw,
    X,
    AlertTriangle,
} from 'lucide-react';

const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    headers: { 'Content-Type': 'application/json' },
});

function DeleteConfirmModal({ isOpen, onClose, onConfirm, itemName, itemType }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-600/50 max-w-md w-full mx-4 overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-600/20 to-orange-600/20 px-6 py-4 border-b border-slate-600/50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-500/20 rounded-lg">
                                <AlertTriangle size={20} className="text-red-400" />
                            </div>
                            <h3 className="text-white font-bold text-lg">
                                Confirm Delete
                            </h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700/50"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="mb-6">
                        <p className="text-slate-300 text-base leading-relaxed">
                            Are you sure you want to delete{' '}
                            <span className="font-semibold text-white">"{itemName}"</span>?
                        </p>
                        {itemType === 'folder' && (
                            <p className="text-amber-400 text-sm mt-2 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                                <AlertTriangle size={16} className="inline mr-2" />
                                This will delete the folder and all its contents permanently.
                            </p>
                        )}
                        <p className="text-slate-400 text-sm mt-3">
                            This action cannot be undone.
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white font-medium rounded-lg transition-all duration-200 border border-slate-600/50 hover:border-slate-500/50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={onConfirm}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                        >
                            <TrashIcon size={16} />
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function FileExplorer({ roomId, onFileSelect }) {
    const [items, setItems] = useState([]);
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState('file');
    const [selectedPath, setSelectedPath] = useState('');
    const [expandedFolders, setExpandedFolders] = useState(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const [deleteModal, setDeleteModal] = useState({
        isOpen: false,
        item: null
    });

    useEffect(() => {
        fetchItems();
    }, [roomId]);

    async function fetchItems() {
        if (!roomId) return;

        setIsLoading(true);
        setError('');
        try {
            const res = await api.get(`/files/${roomId}`);
            if (res.data.success) {
                setItems(buildFileTree(res.data.files));
            } else {
                setError('Failed to load files');
            }
        } catch (err) {
            console.error('Error loading items:', err);
            setError(err.response?.data?.error || 'Failed to load files');
        } finally {
            setIsLoading(false);
        }
    }

    const buildFileTree = (files) => {
        const tree = [];
        const pathMap = new Map();

        const sortedFiles = [...files].sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'folder' ? -1 : 1;
            }
            return a.path.localeCompare(b.path);
        });

        sortedFiles.forEach(file => {
            const pathParts = file.path.split('/').filter(part => part);
            const depth = pathParts.length - 1;

            const treeItem = {
                ...file,
                depth,
                children: file.type === 'folder' ? [] : undefined
            };

            pathMap.set(file.path, treeItem);

            if (depth === 0 || file.path.startsWith('/') && file.path.split('/').filter(p => p).length === 1) {
                tree.push(treeItem);
            } else {
                const parentPath = '/' + pathParts.slice(0, -1).join('/');
                const parent = pathMap.get(parentPath);

                if (parent && parent.children) {
                    parent.children.push(treeItem);
                } else {
                    tree.push(treeItem);
                }
            }
        });

        return tree;
    };

    const flattenTree = (items, expanded = expandedFolders) => {
        const result = [];

        const traverse = (nodes, depth = 0) => {
            nodes.forEach(node => {
                result.push({ ...node, depth });

                if (node.type === 'folder' && node.children && expanded.has(node.path)) {
                    traverse(node.children, depth + 1);
                }
            });
        };

        traverse(items);
        return result;
    };

    const getFileIcon = (item) => {
        if (item.type === 'folder') {
            const isExpanded = expandedFolders.has(item.path);
            return isExpanded ?
                <FolderOpen size={18} className="text-blue-400" /> :
                <FolderIcon size={18} className="text-blue-400" />;
        }

        const extension = item.name.split('.').pop()?.toLowerCase();
        const iconProps = { size: 18 };

        if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
            return <Image {...iconProps} className="text-green-400" />;
        }
        if (['js', 'jsx', 'ts', 'tsx', 'html', 'css', 'py', 'java', 'c', 'cpp', 'h'].includes(extension)) {
            return <Code {...iconProps} className="text-purple-400" />;
        }
        if (['mp4', 'avi', 'mov', 'mkv'].includes(extension)) {
            return <Video {...iconProps} className="text-red-400" />;
        }
        if (['mp3', 'wav', 'flac', 'ogg'].includes(extension)) {
            return <Music {...iconProps} className="text-yellow-400" />;
        }
        return <FileText {...iconProps} className="text-gray-300" />;
    };

    const handleSelect = async (item) => {
        setSelectedPath(item.path);

        if (item.type === 'folder') {
            setExpandedFolders(prev => {
                const newSet = new Set(prev);
                if (newSet.has(item.path)) {
                    newSet.delete(item.path);
                } else {
                    newSet.add(item.path);
                }
                return newSet;
            });
        } else {
            try {
                const fileData = {
                    ...item,
                    content: item.content || ''
                };
                onFileSelect(fileData);
            } catch (error) {
                console.error('Error selecting file:', error);
                setError('Failed to load file content');
            }
        }
    };

    const handleCreate = async () => {
        if (!newName.trim()) return;

        let fullPath;
        const findItemByPath = (nodes, targetPath) => {
            for (const node of nodes) {
                if (node.path === targetPath) return node;
                if (node.children) {
                    const found = findItemByPath(node.children, targetPath);
                    if (found) return found;
                }
            }
            return null;
        };

        if (selectedPath && items.length > 0) {
            const selectedItem = findItemByPath(items, selectedPath);

            if (selectedItem?.type === 'folder') {
                const folderPath = selectedPath.endsWith('/') ? selectedPath : selectedPath + '/';
                fullPath = folderPath + newName;
            } else {
                fullPath = '/' + newName;
            }
        } else {
            fullPath = '/' + newName;
        }

        try {
            const response = await api.post('/files', {
                roomId,
                name: newName,
                path: fullPath,
                type: newType,
                content: newType === 'file' ? '' : undefined
            });

            if (response.data.success) {
                setNewName('');
                await fetchItems();

                if (selectedPath && newType === 'file') {
                    setExpandedFolders(prev => new Set([...prev, selectedPath]));
                }
            } else {
                setError(response.data.error || 'Failed to create item');
            }
        } catch (err) {
            console.error('Error creating item:', err);
            setError(err.response?.data?.error || 'Failed to create item');
        }
    };

    const handleDeleteClick = (item, e) => {
        e.stopPropagation();
        setDeleteModal({
            isOpen: true,
            item: item
        });
    };

    const handleDeleteConfirm = async () => {
        const item = deleteModal.item;
        if (!item) return;

        try {
            const response = await api.delete(`/files/${roomId}/${encodeURIComponent(item.path)}`);

            if (response.data.success) {
                if (selectedPath === item.path) {
                    setSelectedPath('');
                }
                await fetchItems();
                setDeleteModal({ isOpen: false, item: null });
            } else {
                setError(response.data.error || 'Failed to delete item');
            }
        } catch (err) {
            console.error('Error deleting item:', err);
            setError(err.response?.data?.error || 'Failed to delete item');
        }
    };

    const handleDeleteCancel = () => {
        setDeleteModal({ isOpen: false, item: null });
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleCreate();
        }
    };

    const handleRefresh = () => {
        fetchItems();
    };

    const flattenedItems = flattenTree(items);

    return (
        <>
            <div className="w-80 bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-6 py-4 border-b border-slate-600/50">
                    <div className="flex items-center justify-between">
                        <h2 className="text-white font-bold text-lg flex items-center gap-2">
                            <FolderIcon size={20} className="text-blue-400" />
                            File Explorer
                        </h2>
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="text-slate-400 hover:text-white transition-colors p-1 rounded"
                            title="Refresh files"
                        >
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>

                {/* Error Display */}
                {error && (
                    <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}

                {/* File List */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-transparent p-4">
                        {isLoading ? (
                            <div className="text-center py-8 text-slate-400">
                                <RefreshCw size={48} className="mx-auto mb-3 opacity-50 animate-spin" />
                                <p className="text-sm">Loading files...</p>
                            </div>
                        ) : flattenedItems.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <FolderIcon size={48} className="mx-auto mb-3 opacity-50" />
                                <p className="text-sm">No files yet</p>
                                <p className="text-xs mt-1">Create your first file or folder below</p>
                            </div>
                        ) : (
                            <ul className="space-y-1">
                                {flattenedItems.map(item => (
                                    <li key={item._id} style={{ paddingLeft: `${item.depth * 16}px` }}>
                                        <div
                                            className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 
                                                ${selectedPath === item.path
                                                    ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-400/30 shadow-lg'
                                                    : 'hover:bg-slate-700/50 hover:shadow-md border border-transparent'
                                                }`}
                                        >
                                            <button
                                                onClick={() => handleSelect(item)}
                                                className="flex items-center space-x-3 text-white flex-1 text-left min-w-0"
                                            >
                                                {getFileIcon(item)}
                                                <span className="truncate font-medium text-sm">
                                                    {item.name}
                                                </span>
                                                {item.type === 'folder' && (
                                                    <span className="text-xs text-slate-400 ml-auto mr-2">
                                                        folder
                                                    </span>
                                                )}
                                            </button>
                                            <button
                                                onClick={(e) => handleDeleteClick(item, e)}
                                                title="Delete"
                                                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-500/20 p-2 rounded-lg transition-all duration-200"
                                            >
                                                <TrashIcon size={16} />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Create New Item */}
                <div className="bg-slate-800/50 border-t border-slate-600/50 p-4">
                    <div className="space-y-3">
                        {selectedPath && (
                            <div className="text-xs text-slate-400">
                                Creating in: {selectedPath === '/' ? 'Root' : selectedPath}
                            </div>
                        )}
                        <div className="flex items-center space-x-2">
                            <input
                                type="text"
                                value={newName}
                                onChange={e => setNewName(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Enter name..."
                                className="flex-1 px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
                            />
                            <select
                                value={newType}
                                onChange={e => setNewType(e.target.value)}
                                className="px-3 py-2 rounded-lg bg-slate-700/50 border border-slate-600/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400/50 transition-all"
                            >
                                <option value="file">📄 File</option>
                                <option value="folder">📁 Folder</option>
                            </select>
                        </div>
                        <button
                            onClick={handleCreate}
                            disabled={!newName.trim() || isLoading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl disabled:shadow-none"
                        >
                            <PlusIcon size={16} />
                            Create {newType}
                        </button>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                onClose={handleDeleteCancel}
                onConfirm={handleDeleteConfirm}
                itemName={deleteModal.item?.name}
                itemType={deleteModal.item?.type}
            />
        </>
    );
}