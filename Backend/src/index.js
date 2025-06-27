// index.js
import { server, io } from './app.js';
import { setupYjsServer } from '../yjs-server.js';
import { setupExecutionService } from './execution/index.js';
import connectDB from './db/index.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const startServices = async () => {
  try {
    await connectDB();

    // ⬇️ Attach both WS services to shared Express server
    setupYjsServer(server);
    setupExecutionService(server);

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`🧠 Yjs WebSocket at /yjs`);
      console.log(`⚙️ Code Execution WebSocket at /execution`);
    });
  } catch (error) {
    console.error('❌ Failed to start services:', error);
    process.exit(1);
  }
};

startServices();
