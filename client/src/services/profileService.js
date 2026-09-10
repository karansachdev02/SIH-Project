import { request } from './api'

/**
 * Update the authenticated farmer's own profile.
 * Token is attached automatically by the shared `request` helper from localStorage.
 *
 * @param {object} data - Allowed fields: name, village, district, state, preferredLanguage
 * @returns {Promise<{ success: boolean, message: string, user: object }>}
 */
export const updateFarmerProfile = (data) =>
  request('/farmer/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

/**
 * Update the authenticated buyer's own profile.
 * Token is attached automatically by the shared `request` helper from localStorage.
 *
 * @param {object} data - Allowed fields: name, district, state, businessName, businessType, preferredLanguage
 * @returns {Promise<{ success: boolean, message: string, user: object }>}
 */
export const updateBuyerProfile = (data) =>
  request('/buyer/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export default { updateFarmerProfile, updateBuyerProfile }
