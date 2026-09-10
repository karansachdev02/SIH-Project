import express from 'express'
import { updateBuyerProfile } from '../controllers/buyerProfile.controller.js'
import { protect, authorizeRoles } from '../middleware/auth.middleware.js'

const router = express.Router()

// PATCH /api/buyer/profile
// Update the authenticated buyer's own profile fields.
// Requires valid JWT and buyer role. Identity comes from JWT only.
router.patch('/profile', protect, authorizeRoles('buyer'), updateBuyerProfile)

export default router
