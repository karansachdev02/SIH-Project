import express from 'express'
import {
  getCurrentWeatherHandler,
  getHistoricalWeatherHandler,
  getWeatherStatsHandler,
} from '../controllers/weather.controller.js'

const router = express.Router()

// All weather endpoints are public — no authentication required
// Weather data is not user-specific

// GET /api/weather/current?latitude=22.7196&longitude=75.8577
router.get('/current', getCurrentWeatherHandler)

// GET /api/weather/history?latitude=...&longitude=...&from=...&to=...
// Add ?refresh=1 to re-fetch from Open-Meteo and persist to MongoDB
router.get('/history', getHistoricalWeatherHandler)

// GET /api/weather/stats?latitude=...&longitude=...&from=...&to=...
router.get('/stats', getWeatherStatsHandler)

export default router
