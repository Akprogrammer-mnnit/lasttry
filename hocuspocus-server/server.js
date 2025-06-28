import { Server } from '@hocuspocus/server'
import mongoose from 'mongoose'
import dotenv from 'dotenv'

import { Room } from './models/Room.js'
import { File } from './models/File.js'

dotenv.config()
const DB_NAME = "CodeHaven"
// Connect to MongoDB
mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
  .then(() => console.log('✅ MongoDB connected to Hocuspocus server'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err)
    process.exit(1)
  })

const roomConnections = new Map()

function parseDocumentName(docName) {
  const parts = docName.split('::')
  if (parts.length < 2) {
    return { roomId: docName, filePath: null, isValid: false }
  }
  return { roomId: parts[0], filePath: parts.slice(1).join('::'), isValid: true }
}

const server = new Server({
  port: process.env.PORT,
  name: 'collab-server',
  debounce: 200,

  async onConnect({ documentName, connection: ws }) {
    const { roomId, filePath, isValid } = parseDocumentName(documentName)
    if (!isValid) {
      console.warn(`⚠️ Invalid document format: ${documentName}`)
      throw new Error('Invalid document format. Use roomId::filePath')
    }
    console.log(`📥 Connection to room: ${roomId}, file: ${filePath}`)

    const room = await Room.findOne({ roomId, isActive: true })
    if (!room) {
      console.error(`❌ Room ${roomId} not found`)
      throw new Error('Room not found')
    }

    const current = roomConnections.get(roomId) || new Set()
    if (current.size >= 2) {
      console.error(`❌ Room ${roomId} is full (${current.size}/2 users)`)
      throw new Error('Room is full (max 2 users)')
    }

    current.add(ws)
    roomConnections.set(roomId, current)
    console.log(`✅ User connected to room ${roomId}. Active: ${current.size}/2`)

    room.lastActivity = new Date()
    await room.save()
  },

  async onDisconnect({ documentName, connection: ws }) {
    const { roomId, filePath } = parseDocumentName(documentName)
    console.log(`📤 Disconnection from room: ${roomId}, file: ${filePath}`)

    const current = roomConnections.get(roomId)
    if (current) {
      current.delete(ws)
      if (current.size === 0) {
        roomConnections.delete(roomId)
        console.log(`🗑️ Room ${roomId} removed from active tracking`)

        const room = await Room.findOne({ roomId, isActive: true })
        if (room) {
          const activeCount = room.users.filter(u => u.isActive).length
          if (activeCount === 0) {
            room.isActive = false
            await room.save()
            console.log(`🔒 Room ${roomId} marked as inactive`)
          }
        }
      } else {
        roomConnections.set(roomId, current)
        console.log(`👋 User disconnected. Remaining: ${current.size}/2`)
      }
    }

    const room = await Room.findOne({ roomId, isActive: true })
    if (room) {
      room.lastActivity = new Date()
      await room.save()
    }
  },

  async onChange({ documentName, document }) {
    const { roomId, filePath } = parseDocumentName(documentName)
    if (!filePath) {
      console.warn('⚠️ No filePath in document name')
      return
    }

    const content = document.getText('codemirror').toString()
    try {
      const update = await File.updateOne(
        { roomId, path: filePath },
        { content, updatedAt: new Date() }
      )

      if (update.modifiedCount > 0) {
        console.log(`💾 Updated file: ${filePath} in room ${roomId}`)
      } else {
        console.warn(`⚠️ File not found or unchanged: ${filePath} in room ${roomId}`)
      }

      const room = await Room.findOne({ roomId, isActive: true })
      if (room) {
        room.lastActivity = new Date()
        await room.save()
      }
    } catch (error) {
      console.error(`❌ File update error: ${error.message}`)
    }
  },

  async onLoadDocument({ documentName, document }) {
    const { roomId, filePath } = parseDocumentName(documentName)
    if (!filePath) {
      console.warn('⚠️ No filePath - using empty document')
      return
    }

    try {
      const file = await File.findOne({ roomId, path: filePath })
      if (file) {
        console.log(`📂 Loading file: ${filePath} in room ${roomId}`)
        const ytext = document.getText('codemirror')
        if (ytext.length === 0 && file.content) {
          ytext.insert(0, file.content)
        }
      }
    } catch (error) {
      console.error(`❌ Document load error: ${error.message}`)
    }
    return document
  }
})

setInterval(async () => {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  try {
    const roomsDeleted = await Room.deleteMany({
      $or: [
        { isActive: false, updatedAt: { $lt: cutoff } },
        { lastActivity: { $lt: cutoff } }
      ]
    })
    if (roomsDeleted.deletedCount) console.log(`🧹 Cleaned up ${roomsDeleted.deletedCount} old rooms`)

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const filesDeleted = await File.deleteMany({
      updatedAt: { $lt: hourAgo },
      $or: [{ roomId: { $exists: false } }, { roomId: null }]
    })
    if (filesDeleted.deletedCount) console.log(`🧹 Cleaned up ${filesDeleted.deletedCount} orphaned files`)
  } catch (err) {
    console.error('❌ Cleanup error:', err)
  }
}, 60 * 60 * 1000)

export const getRoomConnectionCount = (roomId) => {
  const conns = roomConnections.get(roomId)
  return conns ? conns.size : 0
}

export const hasRoomSpace = (roomId) => {
  const conns = roomConnections.get(roomId)
  return !conns || conns.size < 2
}

server.listen().then(() => {
  console.log('✅ Yjs WebSocket server running on ws://localhost:1234')
})

