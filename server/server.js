import dotenv from 'dotenv'
import app from './src/app.js'
import connectDB from './src/config/db.js'

// Load environment variables
dotenv.config()

const PORT = process.env.PORT || 5000

// Start Express HTTP server & initiate MongoDB connection
const server = app.listen(PORT, () => {
  console.log(`🚀 Smart Mandi Server running on port ${PORT}`)
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`)

  // Non-blocking database connection attempt
  connectDB()
})

export default server
