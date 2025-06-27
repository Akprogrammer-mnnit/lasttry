import dotenv from 'dotenv'
import { server } from './app.js'
import connectDB from './db/index.js'
import './execution/index.js'
import yjsServer from '../yjs-server.js'

dotenv.config({ path: './.env' })

connectDB()
  .then(() => {
    const PORT = process.env.PORT || 3000

    server.listen(PORT, () => {
      console.log(`🚀 Express server running on port ${PORT}`)
    })

    yjsServer.listen().then(() => {
      console.log('✅ Yjs WebSocket server running on ws://localhost:1234')
    })
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error)
  })
