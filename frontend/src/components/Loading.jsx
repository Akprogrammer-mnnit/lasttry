import React from 'react';

const Loading = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0">
                <div className="absolute top-10 left-10 w-40 h-40 md:w-72 md:h-72 bg-cyan-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute bottom-20 right-10 w-48 h-48 md:w-80 md:h-80 bg-purple-400 rounded-full blur-3xl opacity-20 animate-pulse"></div>
                <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-blue-400 rounded-full blur-2xl opacity-10 animate-pulse" style={{ animationDelay: '1000ms' }}></div>
                <div className="absolute bottom-1/4 left-1/2 w-24 h-24 bg-cyan-300 rounded-full blur-xl opacity-15 animate-pulse" style={{ animationDelay: '500ms' }}></div>
            </div>

            {/* Loading Content */}
            <div className="relative z-10 text-center">
                {/* CodeHaven Logo */}
                <div className="mb-8">
                    <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">
                        Code<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">Haven</span>
                    </h1>
                </div>

                {/* Main Loading Animation */}
                <div className="relative mb-8">
                    {/* Outer rotating ring */}
                    <div className="w-24 h-24 md:w-32 md:h-32 mx-auto relative">
                        <div className="absolute inset-0 border-4 border-transparent border-t-cyan-400 border-r-purple-400 rounded-full animate-spin"></div>
                        <div
                            className="absolute inset-2 border-4 border-transparent border-b-purple-400 border-l-cyan-400 rounded-full animate-spin"
                            style={{
                                animationDirection: 'reverse',
                                animationDuration: '1.5s'
                            }}
                        ></div>

                        {/* Inner pulsing core */}
                        <div className="absolute inset-6 bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full opacity-30 animate-pulse"></div>
                        <div
                            className="absolute inset-8 bg-gradient-to-r from-purple-400 to-cyan-400 rounded-full opacity-50 animate-pulse"
                            style={{ animationDelay: '0.5s' }}
                        ></div>
                    </div>

                    {/* Floating particles */}
                    <div className="absolute -top-4 -left-4 w-2 h-2 bg-cyan-400 rounded-full animate-bounce opacity-60"></div>
                    <div
                        className="absolute -top-6 right-8 w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce opacity-80"
                        style={{ animationDelay: '0.3s' }}
                    ></div>
                    <div
                        className="absolute bottom-2 -right-6 w-2 h-2 bg-blue-400 rounded-full animate-bounce opacity-70"
                        style={{ animationDelay: '0.6s' }}
                    ></div>
                    <div
                        className="absolute -bottom-4 left-6 w-1 h-1 bg-cyan-300 rounded-full animate-bounce opacity-50"
                        style={{ animationDelay: '0.9s' }}
                    ></div>
                </div>

                {/* Loading Text with Typing Animation */}
                <div className="mb-6">
                    <p className="text-lg md:text-xl text-gray-300 font-medium">
                        <span className="inline-block animate-pulse">Loading</span>
                        <span className="inline-block animate-bounce ml-1" style={{ animationDelay: '0.1s' }}>.</span>
                        <span className="inline-block animate-bounce ml-0.5" style={{ animationDelay: '0.2s' }}>.</span>
                        <span className="inline-block animate-bounce ml-0.5" style={{ animationDelay: '0.3s' }}>.</span>
                    </p>
                </div>

                {/* Progress Bar */}
                <div className="w-64 md:w-80 mx-auto mb-8">
                    <div className="h-1 bg-white/10 rounded-full overflow-hidden backdrop-blur-sm">
                        <div className="h-full bg-gradient-to-r from-cyan-400 to-purple-400 rounded-full animate-pulse transform origin-left">
                            <div
                                className="h-full bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-400"
                                style={{
                                    backgroundSize: '200% 100%',
                                    animation: 'shimmer 2s ease-in-out infinite'
                                }}
                            >
                            </div>
                        </div>
                    </div>
                </div>

                {/* Status Message */}
                <div className="text-center">
                    <p className="text-sm text-gray-400 animate-pulse">
                        Setting up your workspace...
                    </p>
                </div>

                {/* Floating Code Elements */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    {/* Code snippets floating around */}
                    <div
                        className="absolute top-1/4 left-1/4 text-cyan-400/30 font-mono text-xs"
                        style={{
                            animation: 'float 3s ease-in-out infinite',
                            animationDelay: '0s'
                        }}
                    >
                        {'</>'}
                    </div>
                    <div
                        className="absolute top-1/3 right-1/4 text-purple-400/30 font-mono text-xs"
                        style={{
                            animation: 'float 3s ease-in-out infinite',
                            animationDelay: '1s'
                        }}
                    >
                        {'{ }'}
                    </div>
                    <div
                        className="absolute bottom-1/3 left-1/3 text-blue-400/30 font-mono text-xs"
                        style={{
                            animation: 'float 3s ease-in-out infinite',
                            animationDelay: '2s'
                        }}
                    >
                        {'[]'}
                    </div>
                    <div
                        className="absolute bottom-1/4 right-1/3 text-cyan-300/30 font-mono text-xs"
                        style={{
                            animation: 'float 3s ease-in-out infinite',
                            animationDelay: '1.5s'
                        }}
                    >
                        {'()'}
                    </div>
                </div>
            </div>

            {/* CSS Animations */}
            <style dangerouslySetInnerHTML={{
                __html: `
                    @keyframes shimmer {
                        0% { background-position: -200% 0; }
                        100% { background-position: 200% 0; }
                    }
                    
                    @keyframes float {
                        0%, 100% { 
                            transform: translateY(0px) rotate(0deg); 
                            opacity: 0.3; 
                        }
                        50% { 
                            transform: translateY(-20px) rotate(180deg); 
                            opacity: 0.7; 
                        }
                    }
                `
            }} />
        </div>
    );
};

export default Loading;