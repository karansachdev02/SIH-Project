const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api'

/**
 * Reusable fetch API helper for KisanMitra frontend.
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
      // 401 — token expired or invalid: clear stored credentials so the user
      // is returned to a clean unauthenticated state on next render cycle.
      // Only trigger for authenticated requests (i.e. a token was actually sent).
      if (response.status === 401 && token) {
        localStorage.removeItem('smartmandi_token')
        localStorage.removeItem('smartmandi_user')
        // Reload so React re-evaluates AuthContext from clean localStorage
        window.location.reload()
      }

      const errorMessage =
        data.message ||
        `Unexpected server error (${response.status})`
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
      message: 'Network connection failure. Please verify backend server is running.',
    })
  }
}

export default { request }
