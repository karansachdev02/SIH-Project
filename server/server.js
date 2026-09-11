import app from './src/app.js'
import connectDB from './src/config/db.js'

// Environment variables are loaded via --import dotenv/config in package.json start scripts.
// This ensures process.env is populated before any ESM module code runs.

const PORT = process.env.PORT || 5000

// Start Express HTTP server & initiate MongoDB connection
const server = app.listen(PORT, () => {
  console.log(`🚀 KisanMitra Server running on port ${PORT}`)
  console.log(`🔗 Health Check: http://localhost:${PORT}/api/health`)

  // Non-blocking database connection attempt
  connectDB()
})

export default server
