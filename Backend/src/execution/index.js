import { WebSocketServer } from 'ws';
import axios from 'axios';

export function setupExecutionService(server) {
  const wss = new WebSocketServer({ server, path: '/execution' });
  console.log('⚙️ Execution service mounted on /execution');

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
        console.log(`⚙️ Executing session: ${sessionId}, language: ${language}`);
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
      console.log('🛑 Execution client disconnected');
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  return wss;
}
