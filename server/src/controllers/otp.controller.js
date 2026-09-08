import bcrypt from 'bcryptjs'
import OtpVerification from '../models/OtpVerification.js'
import generateOtp from '../utils/generateOtp.js'
import generateMobileToken from '../utils/generateMobileToken.js'

const isValidMobile = (mobile) => /^[6-9]\d{9}$/.test(mobile)

/**
 * @desc    Send OTP for Farmer Registration
 * @route   POST /api/otp/send/farmer-registration
 * @access  Public
 */
export const sendFarmerRegistrationOtp = async (req, res) => {
  try {
    const { mobile } = req.body

    if (!mobile || !isValidMobile(mobile)) {
      return res.status(400).json({
        success: false,
        message: 'कृपया मान्य 10-अंकीय मोबाइल नंबर दर्ज करें / Enter a valid 10-digit Indian mobile number',
      })
    }

    const purpose = 'farmer_registration'
    const existingOtp = await OtpVerification.findOne({ mobile, purpose })

    // Resend Cooldown Check (60 seconds protection)
    if (existingOtp) {
      const timeElapsedSec = (new Date() - new Date(existingOtp.createdAt)) / 1000
      if (timeElapsedSec < 60) {
        const waitTime = Math.ceil(60 - timeElapsedSec)
        return res.status(429).json({
          success: false,
          message: `कृपया पुनः OTP भेजने से पहले ${waitTime} सेकंड प्रतीक्षा करें / Please wait ${waitTime} seconds before requesting another OTP`,
          retryAfterSeconds: waitTime,
        })
      }
    }

    // Invalidate existing active OTP for this mobile & purpose
    await OtpVerification.deleteMany({ mobile, purpose })

    // Generate & Hash 6-digit OTP
    const rawOtp = generateOtp()
    const salt = await bcrypt.genSalt(10)
    const otpHash = await bcrypt.hash(rawOtp, salt)

    const expiryMinutes = parseInt(process.env.OTP_EXPIRY_MINUTES || '5', 10)
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000)

    // Save OTP record
    await OtpVerification.create({
      mobile,
      otpHash,
      purpose,
      expiresAt,
    })

    const responsePayload = {
      success: true,
      message: 'OTP सफलतापूर्वक भेजा गया / OTP sent successfully',
    }

    // Expose developmentOtp ONLY in development mode for testing
    if (process.env.NODE_ENV === 'development') {
      responsePayload.developmentOtp = rawOtp
    }

    return res.status(200).json(responsePayload)
  } catch (error) {
    console.error('sendFarmerRegistrationOtp error:', error)
    return res.status(500).json({
      success: false,
      message: 'सर्वर त्रुटि: OTP भेजने में विफलता / Server error: Failed to send OTP',
    })
  }
}

/**
 * @desc    Verify OTP for Farmer Registration & issue mobile proof token
 * @route   POST /api/otp/verify/farmer-registration
 * @access  Public
 */
export const verifyFarmerRegistrationOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body

    if (!mobile || !otp || !isValidMobile(mobile) || otp.trim().length !== 6) {
      return res.status(400).json({
        success: false,
        message: 'कृपया मोबाइल नंबर और 6-अंकीय OTP प्रदान करें / Mobile and 6-digit OTP are required',
      })
    }

    const purpose = 'farmer_registration'
    const otpRecord = await OtpVerification.findOne({ mobile, purpose })

    if (!otpRecord) {
      return res.status(400).json({
        success: false,
        message: 'कोई सक्रिय OTP नहीं मिला। कृपया नया OTP अनुरोध करें। / No active OTP found. Please request a new OTP.',
      })
    }

    // Check expiration
    if (new Date() > new Date(otpRecord.expiresAt)) {
      await OtpVerification.deleteOne({ _id: otpRecord._id })
      return res.status(400).json({
        success: false,
        message: 'OTP समय सीमा समाप्त हो गई है। कृपया नया OTP अनुरोध करें। / OTP expired. Please request a new OTP.',
      })
    }

    // Compare OTP hash with bcrypt
    const isMatch = await bcrypt.compare(otp.trim(), otpRecord.otpHash)
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'गलत OTP दर्ज किया गया / Incorrect OTP entered',
      })
    }

    // OTP Verified: Invalidate used record
    await OtpVerification.deleteOne({ _id: otpRecord._id })

    // Issue signed temporary mobile verification proof token
    const mobileVerificationToken = generateMobileToken(mobile, purpose)

    return res.status(200).json({
      success: true,
      message: 'मोबाइल नंबर सफलतापूर्वक सत्यापित हो गया / Mobile number verified successfully',
      mobileVerificationToken,
    })
  } catch (error) {
    console.error('verifyFarmerRegistrationOtp error:', error)
    return res.status(500).json({
      success: false,
      message: 'सर्वर त्रुटि: OTP सत्यापन विफल / Server error: OTP verification failed',
    })
  }
}
