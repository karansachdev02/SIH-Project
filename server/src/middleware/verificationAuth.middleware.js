import jwt from 'jsonwebtoken'
import User from '../models/User.js'

/**
 * Middleware: Enforces valid verificationSessionToken for document upload endpoints only.
 * Will reject normal platform tokens or invalid verification tokens.
 */
export const verifyVerificationSession = async (req, res, next) => {
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

      // Strict enforcement of verification session purpose & farmer role
      if (
        decoded.purpose !== 'farmer_verification_upload' ||
        decoded.role !== 'farmer'
      ) {
        return res.status(403).json({
          success: false,
          message: 'अमान्य सत्यापन सत्र टोकन / Invalid verification session token',
        })
      }

      req.user = await User.findById(decoded.userId).select('-password')

      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'उपयोगकर्ता नहीं मिला / User not found for verification session',
        })
      }

      return next()
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'सत्यापन सत्र समाप्त या अमान्य है / Verification session expired or invalid',
      })
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'अनधिकृत: कोई सत्यापन टोकन प्रदान नहीं किया गया / Unauthorized: No verification token provided',
    })
  }
}
