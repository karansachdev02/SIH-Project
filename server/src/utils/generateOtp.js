import crypto from 'crypto'

/**
 * Generate a cryptographically safe 6-digit OTP string.
 */
export const generateOtp = () => {
  const otpNumber = crypto.randomInt(100000, 1000000)
  return otpNumber.toString()
}

export default generateOtp
