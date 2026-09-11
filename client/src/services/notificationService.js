import { request } from './api'

/**
 * Frontend notification service for KisanMitra.
 * All operations are scoped to the authenticated user via Bearer token.
 *
 * @param {{ page?: number, limit?: number, unreadOnly?: boolean }} [opts]
 */
export function getNotifications(opts = {}) {
  const params = new URLSearchParams()
  if (opts.page   != null) params.set('page',       String(opts.page))
  if (opts.limit  != null) params.set('limit',      String(opts.limit))
  if (opts.unreadOnly)     params.set('unreadOnly',  'true')
  const qs = params.toString()
  return request(`/notifications${qs ? `?${qs}` : ''}`)
}

/**
 * Mark a single notification as read.
 * @param {string} notificationId
 */
export function markNotificationRead(notificationId) {
  return request(`/notifications/${encodeURIComponent(notificationId)}/read`, {
    method: 'PATCH',
  })
}

/**
 * Mark all notifications for the authenticated user as read.
 */
export function markAllNotificationsRead() {
  return request('/notifications/read-all', {
    method: 'PATCH',
  })
}

export default { getNotifications, markNotificationRead, markAllNotificationsRead }
