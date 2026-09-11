import mongoose from 'mongoose'

/**
 * OtpVerification Model Schema for KisanMitra.
 * Stores hashed OTPs with automatic TTL expiration.
 */
const otpVerificationSchema = new mongoose.Schema(
  {
    mobile: {
      type: String,
      required: [true, 'मोबाइल नंबर आवश्यक है / Mobile number is required'],
      trim: true,
    },
    otpHash: {
      type: String,
      required: [true, 'OTP हैश आवश्यक है / OTP hash is required'],
    },
    purpose: {
      type: String,
      enum: ['farmer_registration'],
      required: true,
      default: 'farmer_registration',
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Compound index for fast lookup of active OTP per mobile & purpose
otpVerificationSchema.index({ mobile: 1, purpose: 1 })

// TTL index to automatically purge expired OTP records
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const OtpVerification = mongoose.model('OtpVerification', otpVerificationSchema)

export default OtpVerification
