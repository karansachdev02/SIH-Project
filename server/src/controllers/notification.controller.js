import mongoose from 'mongoose'
import Notification from '../models/Notification.js'

// ── Helper ────────────────────────────────────────────────────────────────────

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

/**
 * @desc    Get paginated notifications for the authenticated user
 * @route   GET /api/notifications
 * @access  Private
 *
 * Query params:
 *   page       {number}  default 1
 *   limit      {number}  default 20, max 50
 *   unreadOnly {string}  'true' | 'false' default 'false'
 *
 * Returns:
 *   notifications[], pagination, unreadCount
 *
 * Security: always scoped to req.user._id — no cross-user access.
 */
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id

    // ── Parse pagination params ───────────────────────────────────────────────
    const rawPage  = parseInt(req.query.page,  10)
    const rawLimit = parseInt(req.query.limit, 10)
    const page     = (Number.isFinite(rawPage)  && rawPage  >= 1) ? rawPage  : 1
    const limit    = (Number.isFinite(rawLimit) && rawLimit >= 1) ? Math.min(rawLimit, 50) : 20
    const skip     = (page - 1) * limit

    const unreadOnly = req.query.unreadOnly === 'true'

    // ── Build query — always scoped to this user ──────────────────────────────
    const filter = { recipient: userId }
    if (unreadOnly) {
      filter.read = false
    }

    // ── Parallel: fetch page + total count + unread count ─────────────────────
    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ recipient: userId, read: false }),
    ])

    // ── Shape response ────────────────────────────────────────────────────────
    const shaped = notifications.map((n) => ({
      id:          n._id,
      type:        n.type,
      title:       n.title,
      message:     n.message,
      relatedId:   n.relatedId   || null,
      relatedType: n.relatedType || '',
      read:        n.read,
      createdAt:   n.createdAt,
    }))

    return res.status(200).json({
      success: true,
      notifications: shaped,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    })

  } catch (err) {
    console.error('getNotifications error:', err?.message)
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications.',
    })
  }
}

/**
 * @desc    Mark a single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 *
 * Security: ownership checked via { _id: id, recipient: req.user._id }
 */
export const markNotificationRead = async (req, res) => {
  try {
    const userId = req.user._id
    const { id } = req.params

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID.',
      })
    }

    // Only update if this notification belongs to this user
    const updated = await Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { $set: { read: true } },
      { new: true }
    )

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      })
    }

    return res.status(200).json({
      success: true,
      notification: {
        id:    updated._id,
        read:  updated.read,
      },
    })

  } catch (err) {
    console.error('markNotificationRead error:', err?.message)
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read.',
    })
  }
}

/**
 * @desc    Mark all notifications for the authenticated user as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 *
 * Security: updateMany is scoped to recipient: req.user._id — no cross-user writes.
 */
export const markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user._id

    const result = await Notification.updateMany(
      { recipient: userId, read: false },
      { $set: { read: true } }
    )

    return res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount,
    })

  } catch (err) {
    console.error('markAllNotificationsRead error:', err?.message)
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read.',
    })
  }
}
