import express from 'express'
import { getAdminStats }                    from '../controllers/adminStats.controller.js'
import { getAdminUsers, getAdminUserById }  from '../controllers/adminUsers.controller.js'
import { protect, authorizeRoles }          from '../middleware/auth.middleware.js'

const router = express.Router()

// All admin routes require authenticated admin
router.use(protect, authorizeRoles('admin'))

// GET /api/admin/stats
router.get('/stats', getAdminStats)

// GET /api/admin/users
// GET /api/admin/users?role=farmer&verificationStatus=pending&search=...&page=1&limit=20
router.get('/users', getAdminUsers)

// GET /api/admin/users/:id
router.get('/users/:id', getAdminUserById)

export default router
