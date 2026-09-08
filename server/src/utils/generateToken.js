import jwt from 'jsonwebtoken'

/**
 * Generate JWT Token for authenticated user.
 * Payload includes only userId and role.
 */
const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_SECRET configuration is missing in environment variables.')
  }

  return jwt.sign(
    { userId, role },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

export default generateToken
