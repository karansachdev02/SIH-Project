import { request } from './api'

/**
 * Get platform summary statistics.
 * @returns {Promise<{ success: boolean, stats: object }>}
 */
export function getAdminStats() {
  return request('/admin/stats')
}

/**
 * List platform users with optional filters and pagination.
 *
 * @param {{
 *   role?: 'farmer'|'buyer'|'admin',
 *   verificationStatus?: 'pending'|'verified'|'rejected',
 *   search?: string,
 *   page?: number,
 *   limit?: number
 * }} [filters]
 * @returns {Promise<{ success: boolean, pagination: object, users: object[] }>}
 */
export function getAdminUsers(filters = {}) {
  const params = new URLSearchParams()
  if (filters.role)               params.set('role',               filters.role)
  if (filters.verificationStatus) params.set('verificationStatus', filters.verificationStatus)
  if (filters.search)             params.set('search',             filters.search)
  if (filters.page)               params.set('page',               String(filters.page))
  if (filters.limit)              params.set('limit',              String(filters.limit))
  const qs = params.toString()
  return request(`/admin/users${qs ? `?${qs}` : ''}`)
}

/**
 * Get detailed information for a single user.
 * @param {string} userId
 * @returns {Promise<{ success: boolean, user: object }>}
 */
export function getAdminUserById(userId) {
  return request(`/admin/users/${encodeURIComponent(userId)}`)
}

export default { getAdminStats, getAdminUsers, getAdminUserById }
