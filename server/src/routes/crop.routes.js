import express from 'express'
import { getMyCrops, createCrop, updateCrop, deleteCrop, updateCropStatus } from '../controllers/crop.controller.js'
import { protect, authorizeRoles } from '../middleware/auth.middleware.js'

const router = express.Router()

// All routes require a valid platform JWT and farmer role
router.use(protect)
router.use(authorizeRoles('farmer'))

// GET  /api/farmer/crops              — list authenticated farmer's crops
router.get('/', getMyCrops)

// POST /api/farmer/crops              — create a new crop for authenticated farmer
router.post('/', createCrop)

// PATCH /api/farmer/crops/:id/status  — update status only (must come before /:id)
router.patch('/:id/status', updateCropStatus)

// PATCH /api/farmer/crops/:id         — full update of a specific crop (farmer-owned only)
router.patch('/:id', updateCrop)

// DELETE /api/farmer/crops/:id        — delete a specific crop (farmer-owned only, booking-safe)
router.delete('/:id', deleteCrop)

export default router
