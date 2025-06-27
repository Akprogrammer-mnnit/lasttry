import { WebSocketServer } from 'ws';
import axios from 'axios';

let wss = null; // Singleton to prevent multiple instances

export const createExecutionService = () => {
  if (wss) {
    console.log('Execution service already running on ws://localhost:8080');
    return wss; // Return existing instance
  }

  try {
    wss = new WebSocketServer({ port: 8080 });
    console.log('Execution service running on ws://localhost:8080');

    const languageConfigs = {
      javascript: { language: 'javascript', version: '18.15.0' },
      python: { language: 'python', version: '3.10.0' },
      c: { language: 'c', version: '10.2.0' },
      cpp: { language: 'cpp', version: '10.2.0' }
    };

    const sendMessage = (ws, type, data, timestamp = true) => {
      const message = {
        type,
        data,
        ...(timestamp && { timestamp: new Date().toISOString() })
      };
      ws.send(JSON.stringify(message));
    };

    wss.on('connection', (ws) => {
      sendMessage(ws, 'system', '🔗 Connected to execution service', false);

      ws.on('message', async (message) => {
        let parsed;
        try {
          parsed = JSON.parse(message);
        } catch (err) {
          sendMessage(ws, 'error', '❌ Invalid JSON format');
          return;
        }

        const { code, language, sessionId } = parsed;
        const config = languageConfigs[language];

        if (!config) {
          sendMessage(ws, 'error', `❌ Language '${language}' not supported. Available: ${Object.keys(languageConfigs).join(', ')}`);
          return;
        }

        if (!code || code.trim() === '') {
          sendMessage(ws, 'error', '❌ No code provided');
          return;
        }

        if (code.length > 10000) {
          sendMessage(ws, 'error', '❌ Code exceeds 10,000 characters');
          return;
        }

        sendMessage(ws, 'system', `🚀 Executing ${language.toUpperCase()} code...`);

        try {
          console.log(`Executing code for session ${sessionId}, language: ${language}`);
          const response = await axios.post('https://emkc.org/api/v2/piston/execute', {
            language: config.language,
            version: config.version,
            files: [{ content: code }],
            stdin: '',
            args: [],
            compile_timeout: 10000,
            run_timeout: 5000
          });

          const { run } = response.data;

          if (run.stdout) {
            run.stdout.split('\n').forEach(line => {
              if (line.trim()) sendMessage(ws, 'output', line, false);
            });
          }

          if (run.stderr) {
            run.stderr.split('\n').forEach(line => {
              if (line.trim()) sendMessage(ws, 'error', line, false);
            });
          }

          if (!run.stdout && !run.stderr) {
            sendMessage(ws, 'output', '(no output)', false);
          }

          sendMessage(ws, 'end', '✅ Execution completed');
        } catch (error) {
          console.error('Execution error:', error);
          sendMessage(ws, 'error', error.response?.data?.message || '💥 Execution failed');
        }
      });

      ws.on('close', () => {
        console.log('Client disconnected');
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
    });

    return wss;
  } catch (error) {
    console.error('Failed to start execution service:', error);
    throw error;
  }
};
