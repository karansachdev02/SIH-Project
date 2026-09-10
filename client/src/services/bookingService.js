import { request } from './api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

/**
 * Submit a pre-booking request for an available crop.
 * Buyer identity is derived from the JWT — never sent in body.
 *
 * @param {string} cropId
 * @param {{ quantity: number, quantityUnit?: string, buyerNote?: string }} data
 */
export function createPrebooking(cropId, data) {
  return request(`/marketplace/crops/${encodeURIComponent(cropId)}/prebooking`, {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

/**
 * Fetch all bookings placed by the authenticated buyer.
 * @param {{ status?: string }} [filters]
 */
export function getBuyerBookings(filters = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  const qs = params.toString()
  return request(`/marketplace/buyer/bookings${qs ? `?${qs}` : ''}`)
}

/**
 * Fetch all booking requests received by the authenticated farmer.
 * @param {{ status?: string }} [filters]
 */
export function getFarmerBookings(filters = {}) {
  const params = new URLSearchParams()
  if (filters.status) params.set('status', filters.status)
  const qs = params.toString()
  return request(`/marketplace/farmer/bookings${qs ? `?${qs}` : ''}`)
}

/**
 * Farmer confirms or cancels a pending booking.
 * @param {string} bookingId
 * @param {{ status: 'confirmed'|'cancelled', farmerNote?: string }} data
 */
export function updateBookingStatus(bookingId, data) {
  return request(`/marketplace/farmer/bookings/${encodeURIComponent(bookingId)}/status`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

/**
 * Download a booking slip PDF for the authenticated buyer.
 *
 * Uses raw fetch (not the request() helper) because the response is a binary
 * PDF stream, not JSON. The token is read from localStorage — the same place
 * the request() helper reads it — and is only used in the Authorization header.
 *
 * Triggers a browser file download automatically.
 *
 * @param {string} bookingId
 * @returns {Promise<void>}
 */
export async function downloadBookingPdf(bookingId) {
  const token = localStorage.getItem('smartmandi_token')
  const url   = `${API_BASE_URL}/marketplace/buyer/bookings/${encodeURIComponent(bookingId)}/pdf`

  const response = await fetch(url, {
    method:  'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })

  if (!response.ok) {
    // Try to read a JSON error message from the server
    let message = `Failed to download booking slip (${response.status}).`
    try {
      const json = await response.json()
      if (json?.message) message = json.message
    } catch { /* binary body — ignore */ }
    throw new Error(message)
  }

  // Convert the PDF stream to a Blob and trigger a download
  const blob     = await response.blob()
  const safeId   = String(bookingId).slice(-8).toUpperCase()
  const filename = `smart-mandi-booking-${safeId}.pdf`

  const objectUrl = URL.createObjectURL(blob)
  const anchor    = document.createElement('a')
  anchor.href     = objectUrl
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(objectUrl)
}

export default { createPrebooking, getBuyerBookings, getFarmerBookings, updateBookingStatus, downloadBookingPdf }
