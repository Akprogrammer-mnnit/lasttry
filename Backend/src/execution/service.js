import Dockerode from 'dockerode';
import { WebSocketServer } from 'ws';

export const createExecutionService = () => {
  const docker = new Dockerode({
    socketPath: process.platform === 'win32'
      ? '//./pipe/docker_engine'
      : '/var/run/docker.sock'
  });

  const wss = new WebSocketServer({ port: 8080 });

  const languageConfigs = {
    javascript: {
      image: 'node:16',
      cmd: ['sh', '-c'],
      script: 'echo "$CODE_BASE64" | base64 -d > /tmp/program.js && node /tmp/program.js',
      timeout: 5000
    },
    python: {
      image: 'python:3.9',
      cmd: ['sh', '-c'],
      script: 'echo "$CODE_BASE64" | base64 -d > /tmp/program.py && python /tmp/program.py',
      timeout: 5000
    },
    c: {
      image: 'gcc:latest',
      cmd: ['sh', '-c'],
      script: 'echo "$CODE_BASE64" | base64 -d > /tmp/program.c && gcc /tmp/program.c -o /tmp/program 2>/tmp/compile_errors.txt && if [ -s /tmp/compile_errors.txt ]; then echo "Compilation errors:" && cat /tmp/compile_errors.txt; exit 1; else echo "Program output:" && /tmp/program 2>/tmp/runtime_errors.txt || (echo "Runtime errors:" && cat /tmp/runtime_errors.txt); fi',
      timeout: 10000
    },
    cpp: {
      image: 'gcc:latest',
      cmd: ['sh', '-c'],
      script: 'echo "$CODE_BASE64" | base64 -d > /tmp/program.cpp && g++ /tmp/program.cpp -o /tmp/program 2>/tmp/compile_errors.txt && if [ -s /tmp/compile_errors.txt ]; then echo "Compilation errors:" && cat /tmp/compile_errors.txt; exit 1; else echo "Program output:" && /tmp/program 2>/tmp/runtime_errors.txt || (echo "Runtime errors:" && cat /tmp/runtime_errors.txt); fi',
      timeout: 10000
    }
  };

  const parseDockerStream = (buffer) => {
    const messages = [];
    let offset = 0;

    while (offset < buffer.length) {
      if (buffer.length - offset < 8) break;

      const header = buffer.slice(offset, offset + 8);
      const streamType = header[0];
      const size = header.readUInt32BE(4);

      if (size === 0) {
        offset += 8;
        continue;
      }

      const payload = buffer.slice(offset + 8, offset + 8 + size);
      const content = payload.toString('utf8');


      const cleanContent = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');


      if (cleanContent.trim()) {
        messages.push({
          type: streamType === 1 ? 'stdout' : 'stderr',
          content: cleanContent
        });
      }

      offset += 8 + size;
    }

    return messages;
  };

  const formatOutput = (output, isError = false) => {
    if (!output || output.trim() === '') return '';

    let cleanOutput = output.trim();

    if (isError) {

      cleanOutput = cleanOutput
        .replace(/\/tmp\/program\.(c|cpp):/g, 'Line ')
        .replace(/undefined reference to/g, 'Undefined function/variable:')
        .replace(/collect2: error: ld returned/g, 'Linker error:')
        .replace(/_start/g, 'program entry')
        .replace(/\/lib\/x86_64-linux-gnu\/crt1\.o/g, '')
        .replace(/\/usr\/bin\/ld:/g, 'Linker:');
    }

    return cleanOutput;
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

      sendMessage(ws, 'system', `🚀 Executing ${language.toUpperCase()} code...`);

      let container;
      try {

        await new Promise((resolve, reject) => {
          docker.pull(config.image, (err, stream) => {
            if (err) return reject(err);

            docker.modem.followProgress(stream, (err) => {
              err ? reject(err) : resolve();
            });
          });
        });


        const containerEnv = [
          'LANG=en_US.UTF-8',
          'PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin',
          `CODE_BASE64=${Buffer.from(code).toString('base64')}`
        ];

        if (language === 'javascript') {
          containerEnv.push('NODE_ENV=production');
        }

        container = await docker.createContainer({
          Image: config.image,
          Cmd: [...config.cmd, config.script],
          Tty: false,
          HostConfig: {
            AutoRemove: true,
            Memory: 100 * 1024 * 1024,
            MemorySwap: 200 * 1024 * 1024,
            CpuPeriod: 100000,
            CpuQuota: 50000,
            CpuShares: 512,
            BlkioWeight: 300,
            OomKillDisable: false,
            PidsLimit: 100,
            NetworkMode: 'none',
            CapDrop: ['ALL'],
            SecurityOpt: ['no-new-privileges']
          },
          Env: containerEnv
        });

        await container.start();

        const stream = await container.logs({
          follow: true,
          stdout: true,
          stderr: true,
          timestamps: false
        });

        let hasOutput = false;
        let allOutput = [];
        let buffer = Buffer.alloc(0);


        stream.on('data', (chunk) => {
          hasOutput = true;
          buffer = Buffer.concat([buffer, chunk]);


          const messages = parseDockerStream(buffer);

          messages.forEach(msg => {
            if (msg.content.trim()) {
              allOutput.push({
                type: msg.type,
                content: msg.content
              });
            }
          });


          if (messages.length > 0) {
            buffer = Buffer.alloc(0);
          }
        });

        stream.on('end', () => {

          const stdoutLines = [];
          const stderrLines = [];

          allOutput.forEach(msg => {
            const lines = msg.content.split('\n');
            lines.forEach(line => {
              if (line.trim()) {
                if (msg.type === 'stdout') {
                  stdoutLines.push(line);
                } else {
                  stderrLines.push(line);
                }
              }
            });
          });


          if (stdoutLines.length > 0) {
            stdoutLines.forEach(line => {
              sendMessage(ws, 'output', line, false);
            });
          }


          if (stderrLines.length > 0) {
            const formattedErrors = stderrLines.map(line => formatOutput(line, true));
            formattedErrors.forEach(line => {
              if (line) {
                sendMessage(ws, 'error', line, false);
              }
            });
          }

          if (!hasOutput || (stdoutLines.length === 0 && stderrLines.length === 0)) {
            sendMessage(ws, 'output', '(no output)', false);
          }

          sendMessage(ws, 'end', '✅ Execution completed');
        });


        const timeout = setTimeout(async () => {
          try {
            await container.stop();
            sendMessage(ws, 'error', '⏱️ Execution timed out');
          } catch (e) {
            console.error('Error stopping container:', e);
          }
        }, config.timeout);


        ws.on('close', async () => {
          clearTimeout(timeout);
          try {
            if (container) await container.stop();
          } catch (e) {
            console.error('Error cleaning up container:', e);
          }
        });

      } catch (error) {
        console.error('Execution error:', error);
        let errorMsg = '💥 Execution failed';

        if (error.message.includes('pull')) {
          errorMsg = '🐳 Docker image unavailable';
        } else if (error.message.includes('No such container')) {
          errorMsg = '🔧 Container setup failed';
        } else if (error.message) {
          errorMsg = `💥 ${error.message}`;
        }

        sendMessage(ws, 'error', errorMsg);

        try {
          await docker.pruneImages({ filters: { dangling: { false: false } } });
        } catch (pruneError) {
          console.error('Image pruning failed:', pruneError);
        }
      }
    });

    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });

  console.log('Execution service running on ws://localhost:8080');
};