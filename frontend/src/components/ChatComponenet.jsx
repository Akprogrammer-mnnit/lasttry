import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { Send, Users, MessageCircle, X, Minimize2 } from 'lucide-react';
import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    headers: { 'Content-Type': 'application/json' },
});

const Chat = ({ roomId, userId, username }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [roomUsers, setRoomUsers] = useState(0);
    const [typingUsers, setTypingUsers] = useState([]);
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const socketRef = useRef(null);
    const messageIdsRef = useRef(new Set());
    const typingTimeoutRef = useRef(null);
    const messagesEndRef = useRef(null);
    const chatInputRef = useRef(null);

    const handleNewMessage = useCallback((message) => {
        if (messageIdsRef.current.has(message._id)) return;
        messageIdsRef.current.add(message._id);
        setMessages((prev) => [...prev, message]);
        if (!isChatOpen || isMinimized) setUnreadCount((c) => c + 1);
    }, [isChatOpen, isMinimized]);

    const handleUserTyping = useCallback((data) => {
        if (data.userId === userId) return;
        setTypingUsers((prev) => {
            const others = prev.filter((u) => u.userId !== data.userId);
            return data.isTyping ? [...others, data] : others;
        });
    }, [userId]);

    const handleRoomJoined = useCallback((data) => setRoomUsers(data.roomUsers), []);

    const handleUserLeft = useCallback((data) => {
        setRoomUsers(data.roomUsers);
    }, []);

    useEffect(() => {
        if (!roomId || !userId || !username) return;
        if (socketRef.current) return;

        const socket = io(import.meta.env.VITE_SOCKET_URL, {
            withCredentials: true,
            transports: ['websocket'],
            timeout: 20000,
            forceNew: true,
        });

        socketRef.current = socket;

        socket.on('connect', () => {
            setIsConnected(true);
            socket.emit('join-room', { roomId, userId, username });
        });
        socket.on('disconnect', () => setIsConnected(false));
        socket.on('room-joined', handleRoomJoined);
        socket.on('user-left', handleUserLeft);
        socket.on('new-message', handleNewMessage);
        socket.on('user-typing', handleUserTyping);
        socket.on('connect_error', () => setIsConnected(false));

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('room-joined', handleRoomJoined);
            socket.off('user-left', handleUserLeft);
            socket.off('new-message', handleNewMessage);
            socket.off('user-typing', handleUserTyping);
            socket.off('connect_error');
            socket.disconnect();
            socketRef.current = null;
        };
    }, [roomId, userId, username, handleNewMessage, handleUserTyping, handleRoomJoined, handleUserLeft]);

    useEffect(() => {
        if (!roomId) return;
        api.get(`/chat/${roomId}/messages`)
            .then((res) => {
                const msgs = res.data.data?.messages || [];
                const unique = [];
                const seen = new Set();
                msgs.forEach((m) => {
                    if (m._id && !seen.has(m._id)) {
                        seen.add(m._id);
                        unique.push(m);
                    }
                });
                messageIdsRef.current = new Set(unique.map((m) => m._id));
                setMessages(unique);
            })
            .catch(() => setMessages([]));
    }, [roomId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        if (isChatOpen && !isMinimized) setUnreadCount(0);
    }, [isChatOpen, isMinimized]);

    const handleTypingStart = useCallback(() => {
        if (!socketRef.current?.connected) return;
        socketRef.current.emit('typing-start', { roomId, userId, username });
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socketRef.current?.emit('typing-stop', { roomId, userId, username });
        }, 1000);
    }, [roomId, userId, username]);

    const handleSendMessage = useCallback(
        (e) => {
            e.preventDefault();
            if (!newMessage.trim() || !socketRef.current?.connected) return;
            socketRef.current.emit('send-message', { roomId, userId, message: newMessage.trim() });
            setNewMessage('');
            clearTimeout(typingTimeoutRef.current);
            socketRef.current.emit('typing-stop', { roomId, userId, username });
        },
        [newMessage, roomId, userId, username]
    );

    const handleInputChange = useCallback((e) => {
        setNewMessage(e.target.value);
        handleTypingStart();
    }, [handleTypingStart]);

    const handleKeyPress = useCallback((e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    }, [handleSendMessage]);

    const formatTime = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const openChat = () => { setIsChatOpen(true); setIsMinimized(false); setTimeout(() => chatInputRef.current?.focus(), 100); };
    const closeChat = () => setIsChatOpen(false);
    const minimizeChat = () => setIsMinimized(true);
    const maximizeChat = () => { setIsMinimized(false); setTimeout(() => chatInputRef.current?.focus(), 100); };

    if (!roomId || !userId || !username) return null;

    return (
        <>
            {!isChatOpen && (
                <button
                    onClick={openChat}
                    className={`fixed bottom-4 right-4 z-50 p-3 rounded-full shadow-lg transition-colors duration-200 ${isConnected ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-400'} text-white`}
                >
                    <MessageCircle size={24} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center">
                            {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                    )}
                </button>
            )}

            <div
                className={`fixed bottom-4 right-4 z-50 bg-white rounded-lg shadow-xl border transition-all duration-200 ${!isChatOpen ? 'opacity-0 pointer-events-none' : ''} ${isMinimized ? 'w-80 h-12' : 'w-80 h-96'}`}
                data-chat-open={isChatOpen}
                data-chat-minimized={isMinimized}
            >
                {/* Header */}
                <div className="bg-blue-500 text-white p-3 rounded-t-lg flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <MessageCircle size={16} /> <span className="font-medium">Chat</span>
                        <div className={`flex items-center space-x-1 ${isConnected ? 'text-green-200' : 'text-red-200'}`}>
                            <Users size={12} /> <span className="text-xs">{roomUsers}</span>
                            {!isConnected && <span className="text-xs">(disconnected)</span>}
                        </div>
                    </div>
                    <div className="flex items-center space-x-1"> <button onClick={isMinimized ? maximizeChat : minimizeChat} className="hover:bg-blue-600 p-1 rounded" title={isMinimized ? 'Maximize' : 'Minimize'}><Minimize2 size={14} /></button> <button onClick={closeChat} className="hover:bg-blue-600 p-1 rounded" title="Close"><X size={14} /></button> </div>
                </div>

                {/* Body */}
                {!isMinimized && (
                    <>
                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-3 h-64 bg-gray-50">
                            {!isConnected && <div className="text-center text-red-500 text-sm mb-2 p-2 bg-red-50 rounded">Disconnected from chat server. Messages may not be sent or received.</div>}

                            {messages.length === 0 ? (
                                <div className="text-center text-gray-500 text-sm">No messages yet. Start the conversation!</div>
                            ) : (
                                messages.map((msg) => {
                                    const key = msg._id || `${msg.timestamp}-${msg.senderId}`;
                                    const mine = msg.messageType !== 'system' && ((msg.senderId?._id || msg.senderId) === userId);
                                    return (
                                        <div key={key} className={`mb-2 ${msg.messageType === 'system' ? 'text-center italic text-xs text-gray-500' : ''}`}>
                                            {msg.messageType === 'system' ? (
                                                msg.message
                                            ) : (
                                                <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-xs rounded-lg p-2 ${mine ? 'bg-blue-500 text-white' : 'bg-white border'}`}>
                                                        {!mine && <div className="text-xs text-gray-600 mb-1">{msg.senderId?.username || 'Unknown User'}</div>}
                                                        <div className="text-sm">{msg.message}</div>
                                                        <div className={`text-xs mt-1 ${mine ? 'text-blue-100' : 'text-gray-500'}`}>{formatTime(msg.timestamp)}</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}

                            {/* Typing */}
                            {typingUsers.length > 0 && <div className="text-xs italic text-gray-500">{typingUsers.map(u => u.username).join(', ')}{typingUsers.length === 1 ? ' is' : ' are'} typing...</div>}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className="p-3 border-t">
                            <form onSubmit={handleSendMessage} className="flex space-x-2">
                                <input
                                    ref={chatInputRef}
                                    type="text"
                                    value={newMessage}
                                    onChange={handleInputChange}
                                    onKeyPress={handleKeyPress}
                                    placeholder={isConnected ? 'Type a message...' : 'Connecting...'}
                                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    disabled={!isConnected}
                                    maxLength={1000}
                                    autoComplete="off"
                                />
                                <button
                                    type="submit"
                                    disabled={!newMessage.trim() || !isConnected}
                                    className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                                    title="Send message"
                                >
                                    <Send size={16} />
                                </button>
                            </form>
                            {!isConnected && <div className="text-xs text-red-500 mt-1">Connection lost. Trying to reconnect...</div>}
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default Chat;