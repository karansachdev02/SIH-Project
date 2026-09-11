import mongoose from 'mongoose'

/**
 * Notification Model for KisanMitra.
 *
 * Stores in-app notifications for all users (farmer, buyer, admin).
 * Notifications are always scoped to a single recipient — never cross-user.
 *
 * Allowed types are controlled here to prevent arbitrary injection.
 */

export const ALLOWED_NOTIFICATION_TYPES = [
  'booking_created',
  'booking_confirmed',
  'booking_cancelled',
  'booking_completed',
  'new_review',
  'verification_approved',
  'verification_rejected',
  'delivery_status',
  'payment_status',
]

const notificationSchema = new mongoose.Schema(
  {
    // The user who receives this notification — indexed for fast per-user lookups
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient is required'],
      index: true,
    },

    // Controlled notification type — must be one of ALLOWED_NOTIFICATION_TYPES
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: ALLOWED_NOTIFICATION_TYPES,
        message: 'Invalid notification type',
      },
    },

    // Short display title
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title must not exceed 200 characters'],
    },

    // Full notification message
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [500, 'Message must not exceed 500 characters'],
    },

    // Optional reference to a related document (booking, review, etc.)
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    // Human-readable hint about what relatedId points to
    relatedType: {
      type: String,
      trim: true,
      default: '',
    },

    // Whether the recipient has read this notification
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

// Fast unread count per user
notificationSchema.index(
  { recipient: 1, read: 1, createdAt: -1 },
  { name: 'idx_recipient_read' }
)

const Notification = mongoose.model('Notification', notificationSchema)

export default Notification
