import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, Upload, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import Loading from './Loading.jsx';

const Signup = () => {
    const { register, handleSubmit, formState: { errors } } = useForm();
    const [showPassword, setShowPassword] = useState(false);
    const [avatar, setAvatar] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onSubmit = async (data) => {
        setLoading(true);
        const formData = new FormData();
        formData.append("email", data.email);
        formData.append("username", data.username);
        formData.append("password", data.password);
        if (avatar) {
            formData.append("avatar", avatar);
        }

        try {
            const response = await axios.post(
                `${import.meta.env.VITE_BACKEND_URL}/users/register`,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );

            if (response.status === 200) {
                navigate("/login");
            } else {
                setError(response.data.message || "Registration failed");
            }
        } catch (error) {
            console.error("Error during registration:", error);
            setError("An error occurred during registration. Please try again.");
        }
        finally {
            setLoading(false);
        }
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (file) setAvatar(file);
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 px-4 sm:px-6 lg:px-8 relative overflow-hidden py-12">
            {/* Animated background elements */}
            <div className="absolute inset-0">
                <div className="absolute top-10 left-10 w-40 h-40 md:w-72 md:h-72 bg-cyan-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute bottom-20 right-10 w-48 h-48 md:w-80 md:h-80 bg-purple-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute top-1/2 right-1/4 w-32 h-32 bg-blue-400 rounded-full blur-2xl opacity-10 animate-pulse delay-1000"></div>
            </div>

            <div className="relative z-10 w-full max-w-md">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
                        Join <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">CodeHaven</span>
                    </h1>
                    <p className="text-gray-300 text-lg">Create your account and start collaborating</p>
                </div>

                {/* Signup Form */}
                <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Email Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-2">Email Address</label>
                            <input
                                type="email"
                                {...register("email", {
                                    required: "Email is required",
                                    pattern: {
                                        value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                                        message: "Invalid email address",
                                    },
                                })}
                                className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-400 
                                    ${errors.email ? "border-red-400 focus:border-red-400" : "border-white/20 focus:border-cyan-400"} 
                                    focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all duration-300
                                    backdrop-blur-sm`}
                                placeholder="Enter your email"
                            />
                            {errors.email && <p className="text-red-400 text-sm mt-2 flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {errors.email.message}
                            </p>}
                        </div>

                        {/* Username Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-2">Username</label>
                            <input
                                type="text"
                                {...register("username", { required: "Username is required" })}
                                className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-400 
                                    ${errors.username ? "border-red-400 focus:border-red-400" : "border-white/20 focus:border-cyan-400"} 
                                    focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all duration-300
                                    backdrop-blur-sm`}
                                placeholder="Choose a username"
                            />
                            {errors.username && <p className="text-red-400 text-sm mt-2 flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {errors.username.message}
                            </p>}
                        </div>

                        {/* Avatar Upload */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-2">Profile Picture</label>
                            <div className="relative">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                    id="avatar-upload"
                                />
                                <div className="w-full px-4 py-3 bg-white/5 border border-white/20 rounded-xl text-white backdrop-blur-sm hover:border-cyan-400 transition-all duration-300 cursor-pointer">
                                    <div className="flex items-center space-x-3">
                                        <Upload className="w-5 h-5 text-gray-400" />
                                        <span className="text-gray-400">
                                            {avatar ? avatar.name : "Choose profile picture"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {avatar && (
                                <div className="mt-4 flex justify-center">
                                    <div className="relative">
                                        <img
                                            src={URL.createObjectURL(avatar)}
                                            alt="Avatar Preview"
                                            className="w-20 h-20 rounded-full object-cover border-2 border-cyan-400/50 shadow-lg"
                                        />
                                        <div className="absolute inset-0 rounded-full bg-gradient-to-t from-cyan-400/20 to-transparent"></div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Password Field */}
                        <div>
                            <label className="block text-sm font-medium text-gray-200 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    {...register("password", { required: "Password is required" })}
                                    className={`w-full px-4 py-3 bg-white/5 border rounded-xl text-white placeholder-gray-400 pr-12
                                        ${errors.password ? "border-red-400 focus:border-red-400" : "border-white/20 focus:border-cyan-400"} 
                                        focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all duration-300
                                        backdrop-blur-sm`}
                                    placeholder="Create a strong password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-cyan-400 transition-colors duration-200"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {errors.password && <p className="text-red-400 text-sm mt-2 flex items-center">
                                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {errors.password.message}
                            </p>}
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-400/50 rounded-xl p-4 text-red-400 text-sm flex items-center">
                                <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full group relative px-6 py-4 text-lg font-semibold text-white bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl hover:from-cyan-400 hover:to-purple-500 transform hover:scale-[1.02] transition-all duration-300 shadow-xl hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-400 to-purple-400 opacity-0 group-hover:opacity-20 transition-opacity duration-300"></div>
                            <div className="relative flex items-center justify-center space-x-2">
                                <User className="w-5 h-5" />
                                <span>Create Account</span>
                                <svg className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                </svg>
                            </div>
                        </button>
                    </form>

                    {/* Login Link */}
                    <div className="mt-8 text-center">
                        <p className="text-gray-300">
                            Already have an account?{" "}
                            <Link
                                to="/login"
                                className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 hover:from-cyan-300 hover:to-purple-300 font-semibold transition-all duration-300"
                            >
                                Sign in here
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Features */}
                <div className="mt-8 flex justify-center space-x-8 text-gray-400">
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-sm">Free forever</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        <span className="text-sm">No credit card</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                        <span className="text-sm">Instant access</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Signup;