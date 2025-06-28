import dotenv from 'dotenv'
import { server } from './app.js'
import connectDB from './db/index.js'
import './execution/index.js'

dotenv.config({ path: './.env' })

connectDB()
  .then(() => {
    const PORT = process.env.PORT || 3000
    server.on('upgrade', (req) => {
      console.log(`🧪 Upgrade requested: ${req.url}`);
    });

    server.listen(PORT, () => {
      console.log(`🚀 Express server running on port ${PORT}`)
    })
  })
  .catch((error) => {
    console.error("❌ MongoDB connection error:", error)
  })
