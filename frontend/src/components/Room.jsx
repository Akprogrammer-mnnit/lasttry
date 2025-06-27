import React, { useState } from 'react';
import axios from 'axios';
import CodeEditor from './CodeEditor.jsx'; // Import your existing CodeEditor component
import { useNavigate } from "react-router-dom";
import { useSelector } from 'react-redux';
// Configure axios base URL for your backend
const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    headers: {
        'Content-Type': 'application/json',
    }
});

const Room = () => {
    const [roomId, setRoomId] = useState('');
    const [showJoinForm, setShowJoinForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showCodeEditor, setShowCodeEditor] = useState(false);
    const [currentRoomId, setCurrentRoomId] = useState('');
    const userData = useSelector((state) => state.auth.userData);
    console.log("USER DATA: ", userData);
    const userId = userData?._id;
    const userName = userData?.username;
    const Navigate = useNavigate();
    const createNewRoom = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await api.post('/rooms/create', {
                userId: userId,
                userName: userName
            });

            const data = response.data;
            console.log(data);
            if (data.success) {
                setCurrentRoomId(data.data.roomId);
                setShowCodeEditor(true);
                Navigate(`/room/${data.data.roomId}/${userId}`);
            } else {
                setError(data.message || 'Failed to create room');
            }
        } catch (err) {
            if (err.response) {
                // Server responded with error status
                const data = err.response.data;
                setError(data.message || 'Failed to create room');
            } else if (err.request) {
                // Network error
                setError('Network error. Please try again.');
            } else {
                setError('An unexpected error occurred.');
            }
            console.error('Error creating room:', err);
        } finally {
            setLoading(false);
        }
    };

    const joinRoom = async () => {
        if (!roomId.trim()) {
            setError('Please enter a room ID');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const checkResponse = await api.get(`/rooms/${roomId.trim()}/check`);
            const checkData = checkResponse.data;
            if (!checkData.success) {
                setError('Room not found');
                setLoading(false);
                return;
            }

            if (!checkData.data.available) {
                setError(checkData.data.reason || 'Room is not available');
                setLoading(false);
                return;
            }

            const joinResponse = await api.post(`/rooms/${roomId.trim()}/join`, {
                userId: userId,
                userName: userName
            });

            const joinData = joinResponse.data;
            console.log(joinData);

            if (joinData.success) {
                setCurrentRoomId(roomId.trim());
                setShowCodeEditor(true);
                Navigate(`/room/${roomId}/${userId}`);
            } else {
                setError(joinData.message || 'Failed to join room');
            }
        } catch (err) {
            if (err.response) {
                const data = err.response.data;
                setError(data.message || 'Failed to join room');
            } else if (err.request) {
                setError('Network error. Please try again.');
            } else {
                setError('An unexpected error occurred.');
            }
            console.error('Error joining room:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleJoinInputChange = (e) => {
        setRoomId(e.target.value);
        setError('');
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            joinRoom();
        }
    };

    const handleRoomError = () => {
        setShowCodeEditor(false);
        setCurrentRoomId('');
        setError('Connection to room lost');
    };
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
            <div className="max-w-md w-full mx-4">
                <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl p-8 text-center border border-white/20">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-white mb-4">
                            Code<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Haven</span>
                        </h1>
                        <p className="text-gray-300">
                            Collaborative coding made simple
                        </p>
                    </div>

                    {error && (
                        <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <button
                            onClick={createNewRoom}
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
                        >
                            <div className="flex items-center justify-center space-x-2">
                                <span className="text-xl">🚀</span>
                                <span>{loading ? 'Creating...' : 'Create New Room'}</span>
                            </div>
                        </button>

                        <div className="flex items-center space-x-4">
                            <div className="flex-1 h-px bg-white/30"></div>
                            <span className="text-gray-300 text-sm">or</span>
                            <div className="flex-1 h-px bg-white/30"></div>
                        </div>

                        {!showJoinForm ? (
                            <button
                                onClick={() => setShowJoinForm(true)}
                                className="w-full bg-white/10 hover:bg-white/20 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 border border-white/30 hover:border-white/50"
                            >
                                <div className="flex items-center justify-center space-x-2">
                                    <span className="text-xl">🔗</span>
                                    <span>Join Existing Room</span>
                                </div>
                            </button>
                        ) : (
                            <div className="space-y-3">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={roomId}
                                        onChange={handleJoinInputChange}
                                        onKeyPress={handleKeyPress}
                                        placeholder="Enter room ID"
                                        className="w-full px-4 py-3 bg-white/10 border border-white/30 rounded-xl focus:border-cyan-400 focus:outline-none transition-colors text-center font-mono text-lg text-white placeholder-gray-400"
                                        autoFocus
                                        disabled={loading}
                                    />
                                </div>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={joinRoom}
                                        disabled={!roomId.trim() || loading}
                                        className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200"
                                    >
                                        {loading ? 'Joining...' : 'Join Room'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowJoinForm(false);
                                            setRoomId('');
                                            setError('');
                                        }}
                                        disabled={loading}
                                        className="px-4 py-3 text-gray-300 hover:text-white transition-colors disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/20">
                        <div className="flex justify-center space-x-8 text-gray-300 text-sm">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span>Real-time</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                <span>Multi-language</span>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                                <span>Collaborative</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Room;