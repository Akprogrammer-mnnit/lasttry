import express from 'express'
import http from 'http'
import cors from 'cors'
import { Server as SocketServer } from 'socket.io'
import cookieParser from 'cookie-parser';

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json({ limit: "16kb" }));

app.use(express.urlencoded({ extended: true, limit: "16kb" }));

app.use(express.static("public"));

app.use(cookieParser());

const server = http.createServer(app)

import roomRoutes from './routes/roomRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

app.use('/api/rooms', roomRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/users', userRoutes);
app.use('/api/chat', chatRoutes);

const io = new SocketServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
})

import { handleChatSocket } from './socket/socket.js';
handleChatSocket(io);

export { server, io }