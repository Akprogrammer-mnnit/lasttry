import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: './.env' });

export const handleCodeExecutionSocket = (io) => {
    // Piston API endpoint
    const PISTON_API = process.env.PISTON_API;

    const languageConfigs = {
        javascript: {
            language: 'javascript',
            version: '18.15.0',
            timeout: 5000,
            maxLength: 10000
        },
        python: {
            language: 'python',
            version: '3.10.0',
            timeout: 5000,
            maxLength: 10000
        },
        c: {
            language: 'c',
            version: '10.2.0',
            timeout: 10000,
            maxLength: 10000
        },
        cpp: {
            language: 'c++',
            version: '10.2.0',
            timeout: 10000,
            maxLength: 10000
        }
    };

    // Security validation
    const validateCode = (code, language) => {
        if (!code || typeof code !== 'string') {
            return { valid: false, error: 'Invalid code format' };
        }

        if (code.length > languageConfigs[language]?.maxLength) {
            return { valid: false, error: `Code too long (max ${languageConfigs[language].maxLength} characters)` };
        }

        // Basic security checks
        const dangerousPatterns = [
            /import\s+os/i,
            /import\s+subprocess/i,
            /import\s+sys/i,
            /exec\s*\(/i,
            /eval\s*\(/i,
            /system\s*\(/i,
            /popen\s*\(/i,
            /shell_exec/i,
            /passthru/i,
            /__import__/i,
            /file_get_contents/i,
            /file_put_contents/i,
            /fopen\s*\(/i,
            /fwrite\s*\(/i,
            /curl_exec/i,
            /fsockopen/i,
            /socket_create/i,
            /#include\s+<unistd\.h>/i,
            /#include\s+<sys\/socket\.h>/i,
            /fork\s*\(/i,
            /pthread_create/i
        ];

        for (const pattern of dangerousPatterns) {
            if (pattern.test(code)) {
                return { valid: false, error: 'Code contains potentially dangerous operations' };
            }
        }

        return { valid: true };
    };

    const formatOutput = (output, isError = false) => {
        if (!output || output.trim() === '') return '';

        let cleanOutput = output.trim();

        if (isError) {
            // Clean up common error messages
            cleanOutput = cleanOutput
                .replace(/\/tmp\/[a-zA-Z0-9]+\.(c|cpp):/g, 'Line ')
                .replace(/undefined reference to/g, 'Undefined function/variable:')
                .replace(/collect2: error: ld returned/g, 'Linker error:')
                .replace(/_start/g, 'program entry')
                .replace(/\/.*?\/crt1\.o/g, '')
                .replace(/\/usr\/bin\/ld:/g, 'Linker:');
        }

        return cleanOutput;
    };

    const executeCode = async (socket, code, language, sessionId) => {
        const config = languageConfigs[language];

        if (!config) {
            socket.emit('code-execution-error', {
                message: `❌ Language '${language}' not supported. Available: ${Object.keys(languageConfigs).join(', ')}`,
                timestamp: new Date().toISOString()
            });
            return;
        }

        // Validate code for security
        const validation = validateCode(code, language);
        if (!validation.valid) {
            socket.emit('code-execution-error', {
                message: `❌ Security validation failed: ${validation.error}`,
                timestamp: new Date().toISOString()
            });
            return;
        }

        socket.emit('code-execution-status', {
            message: `🚀 Executing ${language.toUpperCase()} code...`,
            timestamp: new Date().toISOString()
        });

        try {
            // Create abort controller for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
                socket.emit('code-execution-error', {
                    message: '⏱️ Execution timed out',
                    timestamp: new Date().toISOString()
                });
            }, config.timeout);

            const response = await fetch(`${PISTON_API}/execute`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'CodeExecutionService/1.0'
                },
                body: JSON.stringify({
                    language: config.language,
                    version: config.version,
                    files: [
                        {
                            name: `main.${language === 'cpp' ? 'cpp' : language === 'c' ? 'c' : language === 'python' ? 'py' : 'js'}`,
                            content: code
                        }
                    ],
                    stdin: '',
                    args: [],
                    compile_timeout: 10000,
                    run_timeout: config.timeout
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`Piston API error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            // Handle compilation stage
            if (result.compile) {
                if (result.compile.code !== 0) {
                    // Compilation failed
                    const compileError = formatOutput(result.compile.stderr || result.compile.stdout, true);
                    if (compileError) {
                        socket.emit('code-execution-error', {
                            message: `Compilation failed:\n${compileError}`,
                            timestamp: new Date().toISOString()
                        });
                    } else {
                        socket.emit('code-execution-error', {
                            message: 'Compilation failed with unknown error',
                            timestamp: new Date().toISOString()
                        });
                    }
                    socket.emit('code-execution-complete', {
                        success: false,
                        message: '❌ Compilation failed',
                        timestamp: new Date().toISOString()
                    });
                    return;
                } else if (result.compile.stdout && result.compile.stdout.trim()) {
                    // Compilation warnings
                    const warnings = formatOutput(result.compile.stdout, false);
                    socket.emit('code-execution-warning', {
                        message: `Compilation warnings:\n${warnings}`,
                        timestamp: new Date().toISOString()
                    });
                }
            }

            // Handle execution stage
            if (result.run) {
                let hasOutput = false;

                // Handle stdout
                if (result.run.stdout && result.run.stdout.trim()) {
                    const stdout = formatOutput(result.run.stdout, false);
                    const lines = stdout.split('\n');
                    lines.forEach(line => {
                        if (line.trim()) {
                            socket.emit('code-execution-output', {
                                message: line.trim(),
                                type: 'stdout',
                                timestamp: new Date().toISOString()
                            });
                            hasOutput = true;
                        }
                    });
                }

                // Handle stderr
                if (result.run.stderr && result.run.stderr.trim()) {
                    const stderr = formatOutput(result.run.stderr, true);
                    const lines = stderr.split('\n');
                    lines.forEach(line => {
                        if (line.trim()) {
                            socket.emit('code-execution-output', {
                                message: line.trim(),
                                type: 'stderr',
                                timestamp: new Date().toISOString()
                            });
                            hasOutput = true;
                        }
                    });
                }

                if (!hasOutput) {
                    socket.emit('code-execution-output', {
                        message: '(no output)',
                        type: 'stdout',
                        timestamp: new Date().toISOString()
                    });
                }

                // Check exit code
                if (result.run.code !== 0) {
                    socket.emit('code-execution-complete', {
                        success: false,
                        message: `❌ Execution failed (exit code: ${result.run.code})`,
                        timestamp: new Date().toISOString()
                    });
                } else {
                    socket.emit('code-execution-complete', {
                        success: true,
                        message: '✅ Execution completed',
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                socket.emit('code-execution-error', {
                    message: 'No execution result received',
                    timestamp: new Date().toISOString()
                });
                socket.emit('code-execution-complete', {
                    success: false,
                    message: '❌ Execution failed',
                    timestamp: new Date().toISOString()
                });
            }

        } catch (error) {
            console.error('Execution error:', error);

            let errorMsg = '💥 Execution failed';

            if (error.name === 'AbortError') {
                errorMsg = '⏱️ Execution timed out';
            } else if (error.message.includes('fetch')) {
                errorMsg = '🌐 Network error - unable to reach execution service';
            } else if (error.message.includes('Piston API')) {
                errorMsg = '🔧 Execution service temporarily unavailable';
            } else if (error.message) {
                errorMsg = `💥 ${error.message}`;
            }

            socket.emit('code-execution-error', {
                message: errorMsg,
                timestamp: new Date().toISOString()
            });
            socket.emit('code-execution-complete', {
                success: false,
                message: '❌ Execution failed',
                timestamp: new Date().toISOString()
            });
        }
    };

    // ONLY handle the separate namespace - no default namespace handling
    const codeExecutionNamespace = io.of('/code-execution');

    codeExecutionNamespace.on('connection', (socket) => {
        console.log('Client connected to code execution service');

        socket.emit('code-execution-status', {
            message: '🔗 Connected to execution service',
            timestamp: new Date().toISOString()
        });

        socket.on('execute-code', async (data) => {
            const { code, language, sessionId } = data;

            if (!code || code.trim() === '') {
                socket.emit('code-execution-error', {
                    message: '❌ No code provided',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            if (!language) {
                socket.emit('code-execution-error', {
                    message: '❌ No language specified',
                    timestamp: new Date().toISOString()
                });
                return;
            }

            // Rate limiting could be added here based on sessionId
            await executeCode(socket, code, language, sessionId);
        });

        socket.on('disconnect', () => {
            console.log('Client disconnected from code execution service');
        });

        socket.on('error', (error) => {
            console.error('Code execution socket error:', error);
        });
    });

    console.log('Code execution service integrated with Socket.IO namespace: /code-execution');
};
