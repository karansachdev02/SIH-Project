import jwt from 'jsonwebtoken'
import User from '../models/User.js'

/**
 * Protect middleware: Ensures valid Bearer JWT token in Authorization header.
 * Attaches user object (without password) to req.user.
 * Rejects restricted verification tokens from accessing normal platform endpoints.
 */
export const protect = async (req, res, next) => {
  let token

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1]

      const secret = process.env.JWT_SECRET
      if (!secret) {
        return res.status(500).json({
          success: false,
          message: 'Server configuration error: JWT secret missing',
        })
      }

      const decoded = jwt.verify(token, secret)

      // Reject limited verification session tokens from accessing normal platform endpoints
      if (decoded.purpose === 'farmer_verification_upload') {
        return res.status(403).json({
          success: false,
          message: 'सत्यापन टोकन का उपयोग सामान्य प्लेटफ़ॉर्म पहुँच के लिए नहीं किया जा सकता / Verification session token cannot be used for normal platform endpoints',
        })
      }

      // Fetch user without password
      req.user = await User.findById(decoded.userId).select('-password')

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'अमान्य टोकन: उपयोगकर्ता नहीं मिला / Invalid token: User not found',
        })
      }

      return next()
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'अनधिकृत पहुँच: टोकन अमान्य या समाप्त हो गया है / Unauthorized: Invalid or expired token',
      })
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'अनधिकृत पहुँच: कोई टोकन प्रदान नहीं किया गया / Unauthorized: No token provided',
    })
  }
}

/**
 * Role Authorization middleware: Restricts endpoint access to specific roles.
 * Usage: authorizeRoles('admin', 'buyer')
 */
export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `भूमिका (${req.user?.role || 'अज्ञात'}) को इस संसाधन तक पहुँचने की अनुमति नहीं है / Access denied for role: ${req.user?.role}`,
      })
    }
    next()
  }
}
