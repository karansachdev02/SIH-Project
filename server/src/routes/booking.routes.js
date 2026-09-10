import express from 'express'
import {
  createPrebooking,
  getFarmerBookings,
  updateBookingStatus,
  getBuyerBookings,
  getBookingPdf,
} from '../controllers/booking.controller.js'
import { protect, authorizeRoles } from '../middleware/auth.middleware.js'

const router = express.Router()

// POST /api/marketplace/crops/:id/prebooking
// Authenticated buyers only — farmer and admin roles are blocked
router.post(
  '/crops/:id/prebooking',
  protect,
  authorizeRoles('buyer'),
  createPrebooking
)

// GET /api/marketplace/farmer/bookings
// Authenticated farmers only — list all booking requests for this farmer
router.get(
  '/farmer/bookings',
  protect,
  authorizeRoles('farmer'),
  getFarmerBookings
)

// PATCH /api/marketplace/farmer/bookings/:id/status
// Authenticated farmers only — confirm or cancel a pending booking
router.patch(
  '/farmer/bookings/:id/status',
  protect,
  authorizeRoles('farmer'),
  updateBookingStatus
)

// GET /api/marketplace/buyer/bookings
// Authenticated buyers only — list all bookings placed by this buyer
router.get(
  '/buyer/bookings',
  protect,
  authorizeRoles('buyer'),
  getBuyerBookings
)

// GET /api/marketplace/buyer/bookings/:id/pdf
// Authenticated buyers only — download a booking slip PDF for a specific booking
router.get(
  '/buyer/bookings/:id/pdf',
  protect,
  authorizeRoles('buyer'),
  getBookingPdf
)

export default router
