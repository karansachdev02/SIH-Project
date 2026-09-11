import express from 'express'
import { protect } from '../middleware/auth.middleware.js'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../controllers/notification.controller.js'

const router = express.Router()

// All notification endpoints require authentication
router.use(protect)

// GET /api/notifications — list notifications for authenticated user
router.get('/', getNotifications)

// PATCH /api/notifications/read-all — mark all as read (must be before /:id/read)
router.patch('/read-all', markAllNotificationsRead)

// PATCH /api/notifications/:id/read — mark one notification as read
router.patch('/:id/read', markNotificationRead)

export default router
