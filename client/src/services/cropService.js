import { request } from './api'

/**
 * Fetch all crops belonging to the authenticated farmer.
 * Token is attached automatically by the shared `request` helper from localStorage.
 * @returns {Promise<{ success: boolean, count: number, crops: Array }>}
 */
export const getMyCrops = () => request('/farmer/crops')

/**
 * Create a new crop listing for the authenticated farmer.
 * @param {object} data - crop fields: cropName, cropType, quantity, quantityUnit,
 *                        expectedPrice, location, description, harvestDate
 * @returns {Promise<{ success: boolean, message: string, crop: object }>}
 */
export const createCrop = (data) =>
  request('/farmer/crops', {
    method: 'POST',
    body: JSON.stringify(data),
  })

/**
 * Update all editable fields of a farmer's own crop.
 * @param {string} id   - crop document _id
 * @param {object} data - partial or full crop fields to update
 * @returns {Promise<{ success: boolean, message: string, crop: object }>}
 */
export const updateCrop = (id, data) =>
  request(`/farmer/crops/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

/**
 * Delete a farmer's own crop (backend enforces booking safety).
 * @param {string} id - crop document _id
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export const deleteCrop = (id) =>
  request(`/farmer/crops/${id}`, {
    method: 'DELETE',
  })

/**
 * Update the status of a farmer's own crop.
 * @param {string} id     - crop document _id
 * @param {string} status - one of: 'available' | 'sold' | 'inactive'
 * @returns {Promise<{ success: boolean, message: string, crop: object }>}
 */
export const updateCropStatus = (id, status) =>
  request(`/farmer/crops/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })

export default { getMyCrops, createCrop, updateCrop, deleteCrop, updateCropStatus }
