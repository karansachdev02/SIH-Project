const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

/**
 * Reusable fetch API helper for Smart Mandi frontend.
 */
export const request = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`

  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  // Attach token if present in localStorage
  const token = localStorage.getItem('smartmandi_token')
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const config = {
    ...options,
    headers,
  }

  try {
    const response = await fetch(url, config)
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
  } catch (error) {
    // Check if error is custom rejection or network error
    if (error && error.message && error.status) {
      return Promise.reject(error)
    }

    return Promise.reject({
      status: 0,
      message: 'नेटवर्क से संपर्क नहीं हो सका। कृपया जांचें कि बैकएंड सर्वर चालू है या नहीं। / Network connection failure. Please verify backend server is running.',
    })
  }
}

export default { request }
