import { request } from './api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

/**
 * Upload a farmer verification document using a restricted verificationSessionToken.
 *
 * Uses fetch directly with FormData so the browser can set the correct
 * multipart/form-data Content-Type boundary automatically.
 * The verificationSessionToken is a short-lived restricted JWT that must NOT
 * be stored as the normal platform auth token.
 *
 * @param {File}   file                 - The document File object
 * @param {string} documentType         - One of: farmer_id | land_record | kisan_credit_card | other
 * @param {string} verificationToken    - The restricted verificationSessionToken from farmer registration
 * @returns {Promise<object>}           - Parsed API response
 */
export const uploadFarmerDocument = async (file, documentType, verificationToken) => {
  const url = `${API_BASE_URL}/verification/farmer/document`

  const formData = new FormData()
  formData.append('document', file)
  formData.append('documentType', documentType)

  // Do NOT set Content-Type manually — browser sets multipart/form-data with boundary
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${verificationToken}`,
    },
    body: formData,
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    const errorMessage =
      data.message ||
      `अनपेक्षित सर्वर त्रुटि (${response.status}) / Unexpected server error (${response.status})`
    return Promise.reject({
      status: response.status,
      message: errorMessage,
      data,
    })
  }

  return data
}

// ─── Admin API helpers ────────────────────────────────────────────────────────
// These use the shared api request helper so they automatically attach the
// admin's platform token from localStorage.

/**
 * Fetch verification documents for admin review.
 * @param {'pending'|'approved'|'rejected'|''} status - optional filter
 */
export const adminListDocuments = (status = '') => {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  return request(`/admin/verification/documents${qs}`)
}

/**
 * Approve a verification document.
 * @param {string} docId
 */
export const adminApproveDocument = (docId) =>
  request(`/admin/verification/documents/${docId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'approved' }),
  })

/**
 * Reject a verification document with a reason.
 * @param {string} docId
 * @param {string} rejectionReason
 */
export const adminRejectDocument = (docId, rejectionReason) =>
  request(`/admin/verification/documents/${docId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'rejected', rejectionReason }),
  })

/**
 * Returns the authenticated file URL for viewing a document.
 * Must be fetched with Authorization header (not opened as plain link).
 * @param {string} docId
 */
export const getDocumentFileUrl = (docId) =>
  `${API_BASE_URL}/admin/verification/documents/${docId}/file`

export default {
  uploadFarmerDocument,
  adminListDocuments,
  adminApproveDocument,
  adminRejectDocument,
  getDocumentFileUrl,
}
