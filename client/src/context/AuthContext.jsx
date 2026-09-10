import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [pendingFarmer, setPendingFarmer] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore authentication state from localStorage on application load
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem('smartmandi_token')
      const storedUserStr = localStorage.getItem('smartmandi_user')

      if (storedToken && storedUserStr) {
        const parsedUser = JSON.parse(storedUserStr)
        setToken(storedToken)
        setUser(parsedUser)
        setIsAuthenticated(true)
      }
    } catch (error) {
      console.error('Error restoring authentication state:', error)
      localStorage.removeItem('smartmandi_token')
      localStorage.removeItem('smartmandi_user')
    } finally {
      setLoading(false)
    }
  }, [])

  const login = (authToken, userData) => {
    localStorage.setItem('smartmandi_token', authToken)
    localStorage.setItem('smartmandi_user', JSON.stringify(userData))

    setToken(authToken)
    setUser(userData)
    setIsAuthenticated(true)
    setPendingFarmer(null)
  }

  const logout = () => {
    localStorage.removeItem('smartmandi_token')
    localStorage.removeItem('smartmandi_user')

    setToken(null)
    setUser(null)
    setIsAuthenticated(false)
    setPendingFarmer(null)
  }

  /**
   * updateUser — update the stored user object after a profile edit.
   * Merges the returned safe user fields into existing user state and
   * persists to localStorage so the update survives a page refresh.
   * Does NOT touch the JWT token or authentication state.
   */
  const updateUser = (updatedUserData) => {
    const merged = { ...user, ...updatedUserData }
    localStorage.setItem('smartmandi_user', JSON.stringify(merged))
    setUser(merged)
  }

  const setPendingFarmerState = (farmerData) => {
    // Clear any existing authenticated session
    localStorage.removeItem('smartmandi_token')
    localStorage.removeItem('smartmandi_user')

    setToken(null)
    setUser(null)
    setIsAuthenticated(false)
    setPendingFarmer(farmerData)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        pendingFarmer,
        loading,
        login,
        logout,
        updateUser,
        setPendingFarmerState,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext
