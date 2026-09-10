import express from 'express'
import { createReview, getFarmerReviews, getBookingReview } from '../controllers/review.controller.js'
import { protect, authorizeRoles } from '../middleware/auth.middleware.js'

const router = express.Router()

// POST /api/reviews
// Authenticated buyers only — submit a review for a completed booking
router.post(
  '/',
  protect,
  authorizeRoles('buyer'),
  createReview
)

// GET /api/reviews/farmer/:farmerId
// Public — view all reviews for a farmer
router.get(
  '/farmer/:farmerId',
  getFarmerReviews
)

// GET /api/reviews/booking/:bookingId
// Authenticated buyer only — check whether a specific booking has been reviewed
router.get(
  '/booking/:bookingId',
  protect,
  authorizeRoles('buyer'),
  getBookingReview
)

export default router
