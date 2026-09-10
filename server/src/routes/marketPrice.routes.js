import express from 'express'
import { getMarketPrices } from '../controllers/marketPrice.controller.js'

const router = express.Router()

// GET /api/market/prices — public, no authentication required
// Market prices are not user-specific and require no auth guard
router.get('/', getMarketPrices)

export default router
