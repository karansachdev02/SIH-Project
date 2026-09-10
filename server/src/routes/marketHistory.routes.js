import express from 'express'
import { getMarketHistory } from '../controllers/marketHistory.controller.js'

const router = express.Router()

// GET /api/market/history — public, no authentication required
// Returns historical government mandi price records from MongoDB.
// Supports optional ?refresh=1 to pull fresh data from data.gov.in first.
router.get('/', getMarketHistory)

export default router
