import { request } from './api'

/**
 * Submit a review for a completed booking.
 * Buyer identity is derived from the JWT — never sent in body.
 *
 * @param {{ bookingId: string, rating: number, review?: string }} data
 * @returns {Promise<{ success: boolean, review: object }>}
 */
export function createReview(data) {
  return request('/reviews', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Get all reviews for a farmer.
 * Public endpoint.
 *
 * @param {string} farmerId
 * @returns {Promise<{ success: boolean, count: number, average: number|null, newSeller: boolean, reviews: object[] }>}
 */
export function getFarmerReviews(farmerId) {
  return request(`/reviews/farmer/${encodeURIComponent(farmerId)}`)
}

/**
 * Check whether the authenticated buyer has reviewed a specific booking.
 *
 * @param {string} bookingId
 * @returns {Promise<{ success: boolean, reviewed: boolean, review: object|null }>}
 */
export function getBookingReview(bookingId) {
  return request(`/reviews/booking/${encodeURIComponent(bookingId)}`)
}

export default { createReview, getFarmerReviews, getBookingReview }
