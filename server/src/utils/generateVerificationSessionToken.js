import jwt from 'jsonwebtoken'

/**
 * Generate a short-lived restricted JWT token for farmer verification document upload only.
 * This token CANNOT be used to access normal platform endpoints.
 */
export const generateVerificationSessionToken = (userId) => {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_SECRET configuration is missing')
  }

  return jwt.sign(
    {
      userId,
      role: 'farmer',
      purpose: 'farmer_verification_upload',
    },
    secret,
    { expiresIn: '30m' }
  )
}

export default generateVerificationSessionToken
