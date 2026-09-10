import express from 'express'
import { getMarketplaceCrops, getMarketplaceCropById } from '../controllers/marketplace.controller.js'

const router = express.Router()

// Marketplace browse is PUBLIC — no authentication required.
// Buyers (and visitors) can browse available crops without logging in.
// Write operations (booking, status changes) will be added in future steps
// and will require protect + authorizeRoles('buyer').

// GET /api/marketplace/crops
// GET /api/marketplace/crops?cropName=Wheat&state=MP&minPrice=1000
router.get('/crops', getMarketplaceCrops)

// GET /api/marketplace/crops/:id
router.get('/crops/:id', getMarketplaceCropById)

export default router
