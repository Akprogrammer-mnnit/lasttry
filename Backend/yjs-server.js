import { Server } from '@hocuspocus/server'
import mongoose from 'mongoose'
import { Room } from './src/models/Room.js'
import { File } from './src/models/File.js'
import dotenv from 'dotenv'

dotenv.config()

const roomConnections = new Map() // roomId -> Set of WebSocket objects

function parseDocumentName(docName) {
  const parts = docName.split('::')
  if (parts.length < 2) {
    return {
      roomId: docName,
      filePath: null,
      isValid: false
    }
  }

  return {
    roomId: parts[0],
    filePath: parts.slice(1).join('::'),
    isValid: true
  }
}

const server = new Server({
  port: 1234,
  name: 'collab-server',
  debounce: 200,

  async onConnect(data) {
    const { roomId, filePath, isValid } = parseDocumentName(data.documentName)
    const ws = data.connection

    if (!isValid) {
      console.log(`⚠️ Invalid document format: ${data.documentName}`)
      throw new Error('Invalid document format. Use roomId::filePath')
    }

    console.log(`📥 Connection to room: ${roomId}, file: ${filePath}`)

    try {
      const room = await Room.findActiveRoom(roomId)
      if (!room) {
        console.log(`❌ Room ${roomId} not found`)
        throw new Error('Room not found')
      }

      const currentConnections = roomConnections.get(roomId) || new Set()

      if (currentConnections.size >= 2) {
        console.log(`❌ Room ${roomId} is full (${currentConnections.size}/2 users)`)
        throw new Error('Room is full (max 2 users)')
      }

      currentConnections.add(ws)
      roomConnections.set(roomId, currentConnections)

      console.log(`✅ User connected to room ${roomId}. Active: ${currentConnections.size}/2`)

      room.lastActivity = new Date()
      await room.save()

    } catch (error) {
      console.error(`❌ Connection rejected: ${error.message}`)
      throw error
    }
  },

  async onDisconnect(data) {
    const { roomId, filePath } = parseDocumentName(data.documentName)
    const ws = data.connection

    console.log(`📤 Disconnection from room: ${roomId}, file: ${filePath}`)

    try {
      const currentConnections = roomConnections.get(roomId)
      if (currentConnections) {
        currentConnections.delete(ws)

        if (currentConnections.size === 0) {
          roomConnections.delete(roomId)
          console.log(`🗑️ Room ${roomId} removed from active tracking`)

          const room = await Room.findActiveRoom(roomId)
          if (room) {
            const activeUsers = room.users.filter(u => u.isActive)
            if (activeUsers.length === 0) {
              room.isActive = false
              await room.save()
              console.log(`🔒 Room ${roomId} marked as inactive`)
            }
          }
        } else {
          roomConnections.set(roomId, currentConnections)
          console.log(`👋 User disconnected. Remaining: ${currentConnections.size}/2`)
        }
      }

      const room = await Room.findActiveRoom(roomId)
      if (room) {
        room.lastActivity = new Date()
        await room.save()
      }

    } catch (error) {
      console.error(`❌ Disconnect error: ${error.message}`)
    }
  },

  async onChange(data) {
    const { roomId, filePath } = parseDocumentName(data.documentName)

    if (!filePath) {
      console.log('⚠️ No filePath in document name')
      return
    }

    try {
      const content = data.document.getText('codemirror').toString()

      const updatedFile = await File.findOneAndUpdate(
        { roomId, path: filePath },
        {
          content,
          updatedAt: new Date()
        },
        { new: true, upsert: false }
      )

      if (updatedFile) {
        console.log(`💾 Updated file: ${filePath} in room ${roomId}`)
      } else {
        console.log(`⚠️ File not found: ${filePath} in room ${roomId}`)
      }

      const room = await Room.findActiveRoom(roomId)
      if (room) {
        room.lastActivity = new Date()
        await room.save()
      }

    } catch (error) {
      console.error(`❌ File update error: ${error.message}`)
    }
  },

  async onLoadDocument(data) {
    const { roomId, filePath } = parseDocumentName(data.documentName)

    if (!filePath) {
      console.log('⚠️ No filePath - using empty document')
      return
    }

    try {
      const file = await File.findOne({ roomId, path: filePath })

      if (file) {
        console.log(`📂 Loading file: ${filePath} in room ${roomId}`)
        const ydoc = data.document
        const ytext = ydoc.getText('codemirror')

        if (ytext.length === 0 && file.content) {
          ytext.insert(0, file.content)
        }
      }
    } catch (error) {
      console.error(`❌ Document load error: ${error.message}`)
    }

    return data.document
  }
})

setInterval(async () => {
  try {
    const result = await Room.cleanupOldRooms()
    if (result.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${result.deletedCount} old rooms`)
    }

    const fileResult = await File.cleanupOrphanedFiles()
    if (fileResult.deletedCount > 0) {
      console.log(`🧹 Cleaned up ${fileResult.deletedCount} orphaned files`)
    }
  } catch (error) {
    console.error('❌ Cleanup error:', error)
  }
}, 60 * 60 * 1000)
export const getRoomConnectionCount = (roomId) => {
  const connections = roomConnections.get(roomId)
  return connections ? connections.size : 0
}

export const hasRoomSpace = (roomId) => {
  const connections = roomConnections.get(roomId)
  return !connections || connections.size < 2
}

export default server