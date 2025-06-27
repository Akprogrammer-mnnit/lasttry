import { server, io } from './app.js';
import createYjsServer from '../yjs-server.js';
import { createExecutionService } from './execution/index.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

const startServices = async () => {
  try {
    await connectDB();
    createYjsServer();
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