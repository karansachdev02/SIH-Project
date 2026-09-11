import { request } from './api'

/**
 * Frontend delivery service for KisanMitra.
 * All operations are scoped to the authenticated user via Bearer token.
 */

/**
 * Get all deliveries for the authenticated buyer.
 */
export function getBuyerDeliveries() {
  return request('/deliveries/buyer')
}

/**
 * Get all deliveries for the authenticated farmer.
 */
export function getFarmerDeliveries() {
  return request('/deliveries/farmer')
}

/**
 * Get a single delivery by ID.
 * Only accessible by the buyer or farmer associated with the delivery.
 * @param {string} id
 */
export function getDelivery(id) {
  return request(`/deliveries/${encodeURIComponent(id)}`)
}

/**
 * Farmer updates logistics details (NOT status).
 * @param {string} id
 * @param {object} payload — { transportMode, vehicleNumber, driverName, driverMobile, estimatedDeliveryDate, notes, deliveryAddress, contactName, contactMobile }
 */
export function updateDelivery(id, payload) {
  return request(`/deliveries/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/**
 * Farmer updates delivery status.
 * @param {string} id
 * @param {string} status
 */
export function updateDeliveryStatus(id, status) {
  return request(`/deliveries/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export default { getBuyerDeliveries, getFarmerDeliveries, getDelivery, updateDelivery, updateDeliveryStatus }
