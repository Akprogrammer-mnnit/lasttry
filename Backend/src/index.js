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

    const yjsServer = setupYjsServer(server);
    yjsServer.listen(); // ✅ Make sure this completes before .listen

    setupExecutionService(server); // also attached properly

    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
    });
  } catch (error) {
    console.error('❌ Failed to start services:', error);
    process.exit(1);
  }
};

startServices();
