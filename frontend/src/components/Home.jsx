import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';

const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    headers: { 'Content-Type': 'application/json' },
});

const Home = () => {
    const [rooms, setRooms] = React.useState([]);
    const [showDeleteModal, setShowDeleteModal] = React.useState(false);
    const [roomToDelete, setRoomToDelete] = React.useState(null);
    const userData = useSelector(state => state.auth.userData);
    const userId = userData?._id

    const fetchRooms = async () => {
        try {
            const response = await api.get(`/rooms/getUserRoom/${userId}`, { withCredentials: true });
            console.log(response);
            if (response.data.success) {
                setRooms(response.data.data);
            } else {
                console.error('Failed to fetch rooms:', response.data.message);
            }
        } catch (error) {
            console.error('Error fetching rooms:', error);
        }
    }

    const deleteRoom = async (roomId) => {
        try {
            const response = await api.delete(`/rooms/${roomId}/delete`, { withCredentials: true });
            console.log("del", response);
            if (response.data.success) {
                setRooms(rooms.filter(room => room.roomId.toString() !== roomId.toString()));
            } else {
                console.error('Failed to delete room:', response.data.message);
            }
        } catch (error) {
            console.error('Error deleting room:', error);
        }
    }

    const handleDeleteClick = (room) => {
        setRoomToDelete(room);
        setShowDeleteModal(true);
    };

    const confirmDelete = () => {
        if (roomToDelete) {
            deleteRoom(roomToDelete.roomId);
            setShowDeleteModal(false);
            setRoomToDelete(null);
        }
    };

    const cancelDelete = () => {
        setShowDeleteModal(false);
        setRoomToDelete(null);
    };

    useEffect(() => {
        fetchRooms();
    }, [userId]);

    const joinRoom = async (roomId) => {
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

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
            <div className="text-center max-w-4xl mx-auto px-4">
                {/* Header Section */}
                <div className="mb-12">
                    <h1 className="text-7xl md:text-8xl font-bold text-white mb-6">
                        Code<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Haven</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 font-light">
                        Collaborative coding made simple
                    </p>
                </div>

                {/* Create Room Button */}
                <div className="mb-16">
                    <Link
                        to="/start"
                        className="group relative inline-block px-12 py-6 text-2xl font-semibold text-white bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full hover:from-cyan-400 hover:to-purple-500 transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-cyan-500/25"
                    >
                        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-cyan-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                        <div className="relative flex items-center space-x-3">
                            <span>Create a Room</span>
                            <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </div>
                    </Link>
                </div>

                {/* Features Section */}
                <div className="mb-16 flex justify-center space-x-8 text-gray-400">
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
                        <span>Instant setup</span>
                    </div>
                </div>

                {/* Rooms Section */}
                {rooms.length > 0 ? (
                    <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/10">
                        <div className="flex items-center justify-center space-x-3 mb-8">
                            <div className="w-3 h-3 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full"></div>
                            <h2 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
                                Your Rooms
                            </h2>
                            <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full"></div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {rooms.map(room => (
                                <div
                                    key={room._id}
                                    className="relative group bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-lg p-6 rounded-2xl shadow-lg hover:shadow-2xl border border-white/10 hover:border-cyan-400/30 transition-all duration-300 transform hover:scale-105"
                                >
                                    {/* Delete button with enhanced styling */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            handleDeleteClick(room);
                                        }}
                                        title="Delete Room"
                                        className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-400/20 hover:border-red-400/40 text-red-400 hover:text-red-300 hover:scale-110 transition-all duration-200 z-20 opacity-0 group-hover:opacity-100 backdrop-blur-sm"
                                    >
                                        <X size={16} />
                                    </button>


                                    <Link
                                        to={`/room/${room.roomId}/${userId}`}
                                        className="block relative z-10"
                                    >
                                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-400/10 to-purple-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                        <div className="relative">
                                            <div className="flex items-center space-x-3 mb-3">
                                                <div className="w-4 h-4 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-pulse"></div>
                                                <span className="text-sm text-gray-400 font-medium">Room ID</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-400 transition-all duration-300">
                                                {room.roomId}
                                            </h3>
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-400">Click to join</span>
                                                <svg className="w-5 h-5 text-gray-400 group-hover:text-cyan-400 transform group-hover:translate-x-1 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                </svg>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>

                    </div>
                ) : (
                    <div className="bg-white/5 backdrop-blur-lg rounded-3xl p-12 shadow-2xl border border-white/10">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-cyan-400/20 to-purple-400/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H7m5 0v-2a2 2 0 00-2-2H8a2 2 0 00-2 2v2m14 0V9a2 2 0 00-2-2M5 19V9a2 2 0 012-2h12a2 2 0 012 2v10M9 15h6" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-semibold text-white mb-3">No rooms yet</h3>
                            <p className="text-gray-400 text-lg">Create your first room to start collaborative coding!</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl border border-white/20 max-w-md w-full">
                        <div className="text-center">
                            {/* Warning Icon */}
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                </svg>
                            </div>

                            <h3 className="text-2xl font-bold text-white mb-4">Delete Room?</h3>
                            <p className="text-gray-300 mb-2">
                                Are you sure you want to delete room
                            </p>
                            <p className="text-cyan-400 font-semibold mb-6">
                                "{roomToDelete?.roomId}"?
                            </p>
                            <p className="text-gray-400 text-sm mb-8">
                                This action cannot be undone and all room data will be permanently lost.
                            </p>

                            {/* Action Buttons */}
                            <div className="flex space-x-4">
                                <button
                                    onClick={cancelDelete}
                                    className="flex-1 px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl border border-white/20 hover:border-white/30 transition-all duration-200"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    className="flex-1 px-6 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-xl border border-red-400/20 hover:border-red-400/40 transition-all duration-200"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Home;