import express from 'express'
import { protect, authorizeRoles } from '../middleware/auth.middleware.js'
import {
  getBuyerDeliveries,
  getFarmerDeliveries,
  getDelivery,
  updateDelivery,
  updateDeliveryStatus,
} from '../controllers/delivery.controller.js'

const router = express.Router()

// All delivery endpoints require authentication
router.use(protect)

// GET /api/deliveries/buyer  — buyer only: list deliveries for authenticated buyer
router.get('/buyer',  authorizeRoles('buyer'),  getBuyerDeliveries)

// GET /api/deliveries/farmer — farmer only: list deliveries for authenticated farmer
router.get('/farmer', authorizeRoles('farmer'), getFarmerDeliveries)

// GET /api/deliveries/:id    — buyer or farmer owner only (ownership checked in controller)
router.get('/:id', getDelivery)

// PATCH /api/deliveries/:id/status — farmer only: update delivery status
router.patch('/:id/status', authorizeRoles('farmer'), updateDeliveryStatus)

// PATCH /api/deliveries/:id  — farmer only: update logistics details
router.patch('/:id', authorizeRoles('farmer'), updateDelivery)

export default router
