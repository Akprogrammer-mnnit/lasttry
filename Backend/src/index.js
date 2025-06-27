// index.js
import { server, io } from './app.js';
import { setupYjsServer } from '../yjs-server.js';
import { setupExecutionService } from './execution/index.js';
import connectDB from './db/index.js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const startServices = async () => {
  try {
    console.log('🚀 Starting services...');

    // Connect to database first
    await connectDB();
    console.log('✅ Database connected');

    // Setup YJS server (attach to HTTP server)
    const yjsServer = setupYjsServer(server);
    console.log('✅ YJS server configured');

    // Setup execution service
    setupExecutionService(server);
    console.log('✅ Execution service configured');

    const port = process.env.PORT || 3000;

    // Start the server
    const httpServer = server.listen(port, () => {
      console.log(`🚀 Server running on port ${port}`);
      console.log(`🔗 WebSocket endpoints:`);
      console.log(`   - YJS: ws://localhost:${port}/yjs`);
      console.log(`   - Execution: ws://localhost:${port}/execution`);
    });

    // Handle server shutdown gracefully
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully');
      httpServer.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received, shutting down gracefully');
      httpServer.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start services:', error);
    process.exit(1);
  }
};

startServices();