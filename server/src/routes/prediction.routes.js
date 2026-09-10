import express from 'express'
import { getPricePrediction, getFeatureVectors } from '../controllers/prediction.controller.js'
import { protect } from '../middleware/auth.middleware.js'

const router = express.Router()

// All prediction endpoints require a valid JWT (farmer or any authenticated user)
router.use(protect)

// GET /api/prediction/price?commodity=Wheat&state=MP&horizon=7
router.get('/price', getPricePrediction)

// GET /api/prediction/features?commodity=Wheat&from=2024-01-01&to=2024-12-31
router.get('/features', getFeatureVectors)

export default router
