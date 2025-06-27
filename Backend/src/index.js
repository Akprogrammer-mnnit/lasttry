import { server, io } from './app.js';
import createYjsServer from './yjs-server.js';
import { createExecutionService } from './execution/index.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from './db/index.js';

dotenv.config({ path: './.env' });

const startServices = async () => {
  try {
    await connectDB();
    createYjsServer.listen(); // Call listen() on the server instance
    createExecutionService();
    const port = process.env.PORT || 3000;
    server.listen(port, () => {
      console.log(`🚀 Express server running on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start services:', error);
    process.exit(1);
  }
};

startServices();