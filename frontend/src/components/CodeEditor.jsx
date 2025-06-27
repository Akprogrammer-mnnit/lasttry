
import React, { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { EditorView, basicSetup } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { yCollab } from 'y-codemirror.next';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import FileExplorer from './FileSidebar.jsx';
import Chat from './ChatComponenet.jsx';
import { useSelector } from 'react-redux';
const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    headers:
    {
        'Content-Type': 'application/json',
    }
});

const languageExtensions = {
    javascript: javascript(),
    python: python(),
    c: cpp(),
    cpp: cpp()
};

const CodeEditor = () => {
    const { roomId, userId } = useParams();
    const navigate = useNavigate();

    const editorRef = useRef(null);
    const terminalRef = useRef(null);
    const editorViewRef = useRef(null);
    const providerRef = useRef(null);
    const awarenessRef = useRef(null);
    const ydocRef = useRef(null);
    const ytextRef = useRef(null);
    const wsRef = useRef(null);
    const isExplicitClose = useRef(false);
    const saveTimeoutRef = useRef(null);
    const isLoadingFile = useRef(false);

    const [language, setLanguage] = useState('javascript');
    const [isExecuting, setIsExecuting] = useState(false);
    const [terminalContent, setTerminalContent] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isLeaving, setIsLeaving] = useState(false);
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [currentFile, setCurrentFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const [fileExplorerKey, setFileExplorerKey] = useState(0);
    const userInfo = useSelector((state) => state.auth.userData);
    const addToTerminal = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        setTerminalContent(prev => [...prev, { message, type, timestamp }]);
    };

    const formatTerminalLine = (item) => {
        if (item.type === 'error' && item.message.includes('Line ')) {
            return {
                icon: '🛠️',
                color: 'text-yellow-400',
                text: item.message.replace(/Line (\d+)/, (_, line) => `Line ${line}:`)
            };
        }

        const icons = {
            system: '🔧',
            output: '📤',
            error: '❌',
            info: 'ℹ️',
            success: '✅'
        };

        const colors = {
            system: 'text-blue-400',
            output: 'text-green-400',
            error: 'text-red-400',
            info: 'text-gray-300',
            success: 'text-green-500',
        };

        return {
            icon: icons[item.type] || 'ℹ️',
            color: colors[item.type] || 'text-gray-300',
            text: item.message
        };
    };

    const cleanCodeForExecution = (code) => {
        if (!code) return '';
        const cleanedCode = code.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '');
        const normalizedCode = cleanedCode.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        return normalizedCode.replace(/[\u200B-\u200D\uFEFF]/g, '');
    };

    const getLanguageDisplayName = (lang) => {
        const names = {
            javascript: 'JavaScript',
            python: 'Python',
            c: 'C',
            cpp: 'C++'
        };
        return names[lang] || lang;
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(roomId);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const saveCurrentFile = async () => {
        if (!currentFile || !ytextRef.current || isSaving) return;

        setIsSaving(true);
        try {
            const content = ytextRef.current.toString();
            await api.put(`/files/${roomId}/${encodeURIComponent(currentFile.path)}`, {
                content,
                language
            });

            setLastSaved(new Date());
            addToTerminal(`Saved: ${currentFile.name}`, 'success');
        } catch (error) {
            console.error('Error saving file:', error);
            addToTerminal(`Failed to save ${currentFile.name}: ${error.response?.data?.error || error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };


    const connectExecutionWebSocket = () => {
        if (wsRef.current) {
            wsRef.current.close();
        }

        wsRef.current = new WebSocket('ws://localhost:8080');

        wsRef.current.onopen = () => {
            setIsConnected(true);
            addToTerminal('Connected to execution service', 'system');
        };

        wsRef.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);

                switch (data.type) {
                    case 'system':
                        addToTerminal(data.data, 'system');
                        break;
                    case 'output':
                        if (data.data && data.data.trim()) {
                            addToTerminal(data.data.trim(), 'output');
                        }
                        break;
                    case 'end':
                        addToTerminal(data.data, 'success');
                        setIsExecuting(false);
                        break;
                    case 'error':
                        if (data.data && data.data.trim()) {
                            addToTerminal(data.data.trim(), 'error');
                        }
                        setIsExecuting(false);
                        break;
                    default:
                        addToTerminal(`Unknown message: ${data.data}`, 'error');
                }
            } catch (err) {
                addToTerminal(`Parse error: ${event.data}`, 'error');
            }
        };

        wsRef.current.onerror = () => {
            addToTerminal('WebSocket connection error occurred', 'error');
            setIsConnected(false);
            setIsExecuting(false);
        };

        wsRef.current.onclose = () => {
            if (!isExplicitClose.current) {
                addToTerminal('Connection lost. Attempting to reconnect...', 'error');
                setTimeout(connectExecutionWebSocket, 3000);
            }
            setIsConnected(false);
            setIsExecuting(false);
        };
    };

    const connectHocuspocus = (documentName) => {
        if (providerRef.current) {
            providerRef.current.destroy();
            providerRef.current = null;
        }

        if (ydocRef.current) {
            ydocRef.current.destroy();
            ydocRef.current = null;
        }

        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;

        const provider = new HocuspocusProvider({
            url: 'ws://localhost:1234',
            name: documentName,
            document: ydoc,
        });

        providerRef.current = provider;
        awarenessRef.current = provider.awareness;

        return { ydoc, provider };
    };

    const createEditor = (ydoc, provider) => {
        if (editorViewRef.current) {
            editorViewRef.current.destroy();
            editorViewRef.current = null;
        }

        const ytext = ydoc.getText('codemirror');
        ytextRef.current = ytext;


        const state = EditorState.create({
            doc: ytext.toString(),
            extensions: [
                basicSetup,
                languageExtensions[language],
                yCollab(ytext, provider.awareness),
                keymap.of([indentWithTab]),
                EditorState.tabSize.of(4),
                EditorView.theme({
                    '.cm-editor': {
                        fontSize: '14px',
                        fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                    },
                    '.cm-focused': {
                        outline: 'none'
                    },
                    '.cm-editor.cm-focused': {
                        outline: 'none'
                    }
                })
            ]
        });

        const view = new EditorView({
            state,
            parent: editorRef.current
        });

        editorViewRef.current = view;
        return { ytext, view };
    };

    const handleFileSelect = async (file) => {
        if (isLoadingFile.current) return;

        isLoadingFile.current = true;

        try {
            console.log("Selected file: ", file);


            const response = await api.get(`/files/${roomId}/${encodeURIComponent(file.path)}`);
            const content = response.data.content || '';


            const documentName = `${roomId}::${file.path}`;
            const { ydoc, provider } = connectHocuspocus(documentName);

            await new Promise((resolve) => {
                provider.on('status', ({ status }) => {
                    if (status === 'connected') {
                        resolve();
                    }
                });
                setTimeout(resolve, 1000);
            });

            const { ytext } = createEditor(ydoc, provider);

            if (ytext.length === 0 && content) {
                ytext.insert(0, content);
            }

            setCurrentFile(file);

            let newLanguage = language;
            if (file.language) {
                newLanguage = file.language;
            } else {
                const ext = file.name.split('.').pop()?.toLowerCase();
                if (ext === 'js' || ext === 'jsx') newLanguage = 'javascript';
                else if (ext === 'py') newLanguage = 'python';
                else if (ext === 'c') newLanguage = 'c';
                else if (ext === 'cpp' || ext === 'cc' || ext === 'cxx') newLanguage = 'cpp';
            }

            if (newLanguage !== language) {
                setLanguage(newLanguage);
            }

            addToTerminal(`Opened: ${file.name}`, 'info');

        } catch (error) {
            console.error("Error loading file:", error);
            addToTerminal(`Failed to load file: ${file.name}`, 'error');
        } finally {
            isLoadingFile.current = false;
        }
    };

    const executeCode = () => {
        if (isExecuting || !isConnected) {
            return;
        }

        setIsExecuting(true);
        addToTerminal(`Starting ${language.toUpperCase()} execution...`, 'system');

        try {
            const rawCode = ytextRef.current ? ytextRef.current.toString() : '';
            const cleanCode = cleanCodeForExecution(rawCode);

            if (!cleanCode.trim()) {
                addToTerminal('No code to execute', 'error');
                setIsExecuting(false);
                return;
            }

            wsRef.current.send(JSON.stringify({
                code: cleanCode,
                language,
                sessionId: roomId
            }));
        } catch (err) {
            addToTerminal(`Failed to execute: ${err.message}`, 'error');
            setIsExecuting(false);
        }
    };

    const clearTerminal = () => {
        setTerminalContent([]);
        addToTerminal('Terminal cleared', 'system');
    };

    const leaveRoom = async () => {
        setIsLeaving(true);
        try {
            if (currentFile) {
                await saveCurrentFile();
            }

            const response = await api.post(`/rooms/${roomId}/leave`, {
                userId: userId
            });

            if (response.data.success) {
                isExplicitClose.current = true;
                if (wsRef.current) {
                    wsRef.current.close();
                }
                navigate('/');
            } else {
                addToTerminal(`Failed to leave room: ${response.data.message}`, 'error');
            }
        } catch (error) {
            console.error('Error leaving room:', error);
            addToTerminal('Error leaving room. Please try again.', 'error');
        } finally {
            setIsLeaving(false);
            setShowLeaveModal(false);
        }
    };

    const handleManualSave = async () => {
        if (currentFile) {
            await saveCurrentFile();
        } else {
            addToTerminal('No file is currently open', 'error');
        }
    };


    useEffect(() => {
        if (terminalRef.current) {
            terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
        }
    }, [terminalContent]);

    useEffect(() => {
        connectExecutionWebSocket();

        const ydoc = new Y.Doc();
        const provider = new HocuspocusProvider({
            url: 'ws://localhost:1234',
            name: `${roomId}-default`,
            document: ydoc,
        });

        ydocRef.current = ydoc;
        providerRef.current = provider;
        awarenessRef.current = provider.awareness;

        createEditor(ydoc, provider);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }

            isExplicitClose.current = true;

            if (editorViewRef.current) {
                editorViewRef.current.destroy();
            }

            if (providerRef.current) {
                providerRef.current.destroy();
            }

            if (ydocRef.current) {
                ydocRef.current.destroy();
            }

            if (wsRef.current && (
                wsRef.current.readyState === WebSocket.CONNECTING ||
                wsRef.current.readyState === WebSocket.OPEN
            )) {
                wsRef.current.close();
            }
        };
    }, [roomId]);

    useEffect(() => {
        if (!editorViewRef.current || !ytextRef.current || !awarenessRef.current) return;

        const currentState = editorViewRef.current.state;
        const newExtensions = [
            basicSetup,
            languageExtensions[language],
            yCollab(ytextRef.current, awarenessRef.current),
            keymap.of([indentWithTab]),
            EditorState.tabSize.of(4),
            EditorView.theme({
                '.cm-editor': {
                    fontSize: '14px',
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace'
                },
                '.cm-focused': {
                    outline: 'none'
                },
                '.cm-editor.cm-focused': {
                    outline: 'none'
                }
            })
        ];

        editorViewRef.current.setState(EditorState.create({
            doc: currentState.doc.toString(),
            extensions: newExtensions
        }));
    }, [language]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-4">
            <div className="max-w-7xl mx-auto">
                <div className="flex gap-6 mb-6">
                    <div className="flex flex-col">
                        {/* File Explorer */}
                        <FileExplorer
                            key={fileExplorerKey}
                            roomId={roomId}
                            onFileSelect={handleFileSelect}
                        />
                        {/* Chat Component */}
                        <Chat
                            roomId={roomId}
                            userId={userId}
                            username={userInfo.username}
                        />
                    </div>
                    <div className="flex-1">
                        {/* Header */}
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 mb-6 p-6">
                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                <div className="flex items-center space-x-4">
                                    <h1 className="text-3xl font-bold text-white">
                                        Code<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Haven</span>
                                    </h1>
                                    <div className="flex items-center space-x-2">
                                        <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'} animate-pulse`} />
                                        <span className="text-white font-medium">
                                            {isConnected ? 'Connected' : 'Disconnected'}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 p-3 bg-white/10 rounded-xl border border-white/20">
                                        <span className="text-white font-mono text-sm">Room: {roomId}</span>
                                        <button
                                            onClick={handleCopy}
                                            className="px-3 py-1 text-xs font-semibold text-white bg-gradient-to-r from-cyan-500 to-purple-600 rounded-lg hover:from-cyan-400 hover:to-purple-500 transition-all duration-200"
                                        >
                                            {copied ? 'Copied!' : 'Copy ID'}
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => setShowLeaveModal(true)}
                                        disabled={isLeaving}
                                        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 hover:text-white border border-red-500/50 hover:border-red-400 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <div className="flex items-center space-x-2">
                                            <span>🚪</span>
                                            <span>{isLeaving ? 'Leaving...' : 'Leave Room'}</span>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 mb-6 p-6">
                            <div className="flex flex-wrap items-center gap-4">
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                    className="bg-white/10 border border-white/30 rounded-xl px-4 py-2 text-white font-medium min-w-[140px] focus:border-cyan-400 focus:outline-none transition-colors"
                                >
                                    <option value="javascript" className="bg-gray-800">JavaScript</option>
                                    <option value="python" className="bg-gray-800">Python</option>
                                    <option value="c" className="bg-gray-800">C</option>
                                    <option value="cpp" className="bg-gray-800">C++</option>
                                </select>

                                <button
                                    onClick={executeCode}
                                    disabled={isExecuting || !isConnected}
                                    className={`px-6 py-2 rounded-xl font-medium transition-all duration-200 transform hover:scale-105 ${isExecuting || !isConnected
                                        ? 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg'
                                        }`}
                                    title={!isConnected ? "Not connected to execution service" : ""}
                                >
                                    <div className="flex items-center space-x-2">
                                        <span>{isExecuting ? '⏳' : '▶️'}</span>
                                        <span>{isExecuting ? 'Running...' : 'Run Code'}</span>
                                    </div>
                                </button>

                                <button
                                    onClick={handleManualSave}
                                    disabled={isSaving || !currentFile}
                                    className={`px-6 py-2 rounded-xl font-medium transition-all duration-200 ${!currentFile
                                        ? 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
                                        : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-lg'
                                        }`}
                                >
                                    <div className="flex items-center space-x-2">
                                        <span>{isSaving ? '💾' : '💾'}</span>
                                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                                    </div>
                                </button>



                                <button
                                    onClick={clearTerminal}
                                    className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl font-medium transition-all duration-200 border border-white/30 hover:border-white/50"
                                >
                                    <div className="flex items-center space-x-2">
                                        <span>🗑️</span>
                                        <span>Clear Terminal</span>
                                    </div>
                                </button>

                                <div className="ml-auto flex flex-col items-end text-sm">
                                    <div className="text-cyan-300 font-medium">
                                        Language: {getLanguageDisplayName(language)}
                                    </div>
                                    {currentFile && (
                                        <div className="text-gray-300 text-xs">
                                            Current: {currentFile.name}
                                            {lastSaved && (
                                                <span className="ml-2 text-green-400">
                                                    (Saved: {lastSaved.toLocaleTimeString()})
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {
                            currentFile ? (
                                <>
                                    {/* Code Editor */}
                                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 mb-6 overflow-hidden">
                                        <div className="bg-white/5 p-4 border-b border-white/20">
                                            <h3 className="text-white font-semibold flex items-center gap-2">
                                                Code Editor
                                                {currentFile && (
                                                    <span className="text-sm text-cyan-300">- {currentFile.name}</span>
                                                )}
                                                {isSaving && (
                                                    <span className="text-xs text-yellow-400 animate-pulse">Saving...</span>
                                                )}
                                            </h3>
                                        </div>
                                        <div ref={editorRef} className="h-[400px] overflow-auto" />
                                    </div>

                                    {/* Terminal */}
                                    <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
                                        <div className="bg-white/5 p-4 border-b border-white/20">
                                            <h4 className="font-semibold text-white">Terminal Output</h4>
                                        </div>
                                        <div
                                            ref={terminalRef}
                                            className="h-48 bg-gray-900/80 text-green-400 p-4 font-mono text-sm overflow-auto"
                                        >
                                            {terminalContent.length === 0 ? (
                                                <div className="text-gray-500 flex items-center space-x-2">
                                                    <span>💻</span>
                                                    <span>Ready to execute code...</span>
                                                </div>
                                            ) : (
                                                terminalContent.map((item, index) => {
                                                    const formatted = formatTerminalLine(item);
                                                    return (
                                                        <div
                                                            key={index}
                                                            className={`mb-1 ${formatted.color} flex items-start space-x-2`}
                                                        >
                                                            <span className="text-xs text-gray-500 min-w-[60px]">
                                                                {item.timestamp}
                                                            </span>
                                                            <span className="flex-shrink-0">
                                                                {formatted.icon}
                                                            </span>
                                                            <span className="break-all">
                                                                {formatted.text}
                                                            </span>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div></>
                            ) : (null)
                        }
                    </div>
                </div>

                {/* Leave Room Modal */}
                {showLeaveModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-6 max-w-md w-full">
                            <div className="text-center">
                                <div className="text-4xl mb-4">🚪</div>
                                <h3 className="text-xl font-bold text-white mb-2">Leave Room?</h3>
                                <p className="text-gray-300 mb-6">
                                    Are you sure you want to leave this coding session?
                                    Your progress will be saved but you'll need the room ID to rejoin.
                                </p>
                                <div className="flex space-x-3">
                                    <button
                                        onClick={() => setShowLeaveModal(false)}
                                        disabled={isLeaving}
                                        className="flex-1 bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 border border-white/30 hover:border-white/50 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={leaveRoom}
                                        disabled={isLeaving}
                                        className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isLeaving ? 'Leaving...' : 'Leave Room'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CodeEditor;