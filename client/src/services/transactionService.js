import { request } from './api'

/**
 * Frontend transaction service for KisanMitra.
 * All operations are scoped to the authenticated user via Bearer token.
 */

/** Get all transactions for the authenticated buyer. */
export function getBuyerTransactions() {
  return request('/transactions/buyer')
}

/** Get all transactions for the authenticated farmer. */
export function getFarmerTransactions() {
  return request('/transactions/farmer')
}

/**
 * Get a single transaction by ID.
 * Only accessible by the buyer or farmer associated with the transaction.
 * @param {string} id
 */
export function getTransaction(id) {
  return request(`/transactions/${encodeURIComponent(id)}`)
}

/**
 * Buyer updates payment status (demo payment actions).
 * @param {string} id
 * @param {{ action: string, paymentMethod?: string }} payload
 */
export function updatePayment(id, payload) {
  return request(`/transactions/${encodeURIComponent(id)}/payment`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

/**
 * Farmer refunds a paid transaction (demo only).
 * @param {string} id
 */
export function refundTransaction(id) {
  return request(`/transactions/${encodeURIComponent(id)}/refund`, {
    method: 'PATCH',
  })
}

export default { getBuyerTransactions, getFarmerTransactions, getTransaction, updatePayment, refundTransaction }
