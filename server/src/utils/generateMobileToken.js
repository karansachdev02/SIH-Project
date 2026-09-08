import jwt from 'jsonwebtoken'

/**
 * Generate a short-lived signed JWT proof token confirming OTP mobile verification.
 */
export const generateMobileToken = (mobile, purpose = 'farmer_registration') => {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_SECRET configuration is missing')
  }

  return jwt.sign(
    { mobile, purpose },
    secret,
    { expiresIn: process.env.MOBILE_VERIFICATION_TOKEN_EXPIRES_IN || '10m' }
  )
}

export default generateMobileToken
