import express from 'express'
import http from 'http'
import cors from 'cors'
import { Server as SocketServer } from 'socket.io'
import cookieParser from 'cookie-parser'
import pkg from 'http-proxy' // Changed from import { createProxyServer } from 'http-proxy'
const { createProxyServer } = pkg // Destructure from default export
import rateLimit from 'express-rate-limit'

import dotenv from 'dotenv'
dotenv.config({ path: './.env' })

const app = express()
const server = http.createServer(app)
const io = new SocketServer(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
})

// Proxy for Yjs and Execution WebSockets
const proxy = createProxyServer()
app.use('/yjs', (req, res) => {
  proxy.web(req, res, { target: 'http://localhost:1234' })
})
const executionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per IP
  message: 'Too many execution requests, please try again later.'
})
app.use('/execution', executionLimiter, (req, res) => {
  proxy.web(req, res, { target: 'http://localhost:8080' })
})
server.on('upgrade', (req, socket, head) => {
  if (req.url.startsWith('/yjs')) {
    proxy.ws(req, socket, head, { target: 'ws://localhost:1234' })
  } else if (req.url.startsWith('/execution')) {
    proxy.ws(req, socket, head, { target: 'ws://localhost:8080' })
  }
})

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}))
app.use(express.json({ limit: '16kb' }))
app.use(express.urlencoded({ extended: true, limit: '16kb' }))
app.use(express.static('public'))
app.use(cookieParser())

import roomRoutes from './routes/roomRoutes.js'
import fileRoutes from './routes/fileRoutes.js'
import userRoutes from './routes/userRoutes.js'
import chatRoutes from './routes/chatRoutes.js'

app.use('/api/rooms', roomRoutes)
app.use('/api/files', fileRoutes)
app.use('/api/users', userRoutes)
app.use('/api/chat', chatRoutes)

import { handleChatSocket } from './socket/socket.js'
handleChatSocket(io)

export { server, io }