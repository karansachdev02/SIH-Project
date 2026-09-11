import express from 'express'
import mongoose from 'mongoose'

const router = express.Router()

/**
 * GET /api/health
 * Public health check endpoint for monitoring API and database connection status.
 */
router.get('/health', (req, res) => {
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  }
  const currentDbState = mongoose.connection.readyState

  res.status(200).json({
    success: true,
    message: 'KisanMitra API is running',
    timestamp: new Date().toISOString(),
    database: dbStateMap[currentDbState] || 'unknown',
  })
})

export default router
