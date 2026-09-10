import express from 'express'
import { updateFarmerProfile } from '../controllers/farmerProfile.controller.js'
import { protect, authorizeRoles } from '../middleware/auth.middleware.js'

const router = express.Router()

// PATCH /api/farmer/profile
// Update the authenticated farmer's own profile fields.
// Requires valid JWT and farmer role. Identity comes from JWT only.
router.patch('/profile', protect, authorizeRoles('farmer'), updateFarmerProfile)

export default router
