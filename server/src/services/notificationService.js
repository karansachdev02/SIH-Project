import Notification, { ALLOWED_NOTIFICATION_TYPES } from '../models/Notification.js'

/**
 * notificationService — safe helper for creating in-app notifications.
 *
 * All callers (booking, review, verification controllers) must use this helper.
 * Direct Notification.create() outside this service is not permitted.
 *
 * createNotification() is intentionally fire-and-forget tolerant:
 * callers should wrap it in try/catch so that a notification failure
 * never breaks the primary business operation.
 */

/**
 * Create a notification for a single recipient.
 *
 * @param {object} opts
 * @param {import('mongoose').Types.ObjectId|string} opts.recipient
 * @param {string} opts.type           - must be in ALLOWED_NOTIFICATION_TYPES
 * @param {string} opts.title
 * @param {string} opts.message
 * @param {import('mongoose').Types.ObjectId|string} [opts.relatedId]
 * @param {string} [opts.relatedType]
 * @returns {Promise<import('../models/Notification.js').default>}
 */
export async function createNotification({ recipient, type, title, message, relatedId, relatedType }) {
  if (!recipient) {
    throw new Error('createNotification: recipient is required')
  }

  if (!ALLOWED_NOTIFICATION_TYPES.includes(type)) {
    throw new Error(`createNotification: type "${type}" is not allowed`)
  }

  if (!title || !message) {
    throw new Error('createNotification: title and message are required')
  }

  const notification = await Notification.create({
    recipient,
    type,
    title: String(title).trim().slice(0, 200),
    message: String(message).trim().slice(0, 500),
    relatedId: relatedId || null,
    relatedType: relatedType ? String(relatedType).trim() : '',
    read: false,
  })

  return notification
}

export default { createNotification }
