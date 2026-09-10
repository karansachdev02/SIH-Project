import mongoose from 'mongoose'

/**
 * Single User Model Schema for Smart Mandi.
 * Supports Farmer, Buyer, and Admin roles.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'नाम आवश्यक है / Name is required'],
      trim: true,
    },
    mobile: {
      type: String,
      required: [true, 'मोबाइल नंबर आवश्यक है / Mobile number is required'],
      unique: true,
      trim: true,
      match: [/^[6-9]\d{9}$/, 'कृपया मान्य 10-अंकीय मोबाइल नंबर दर्ज करें / Enter a valid 10-digit Indian mobile number'],
    },
    password: {
      type: String,
      required: [true, 'पासवर्ड आवश्यक है / Password is required'],
      minlength: [6, 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए / Password must be at least 6 characters'],
      select: false, // Exclude password from query results by default
    },
    role: {
      type: String,
      enum: {
        values: ['farmer', 'buyer', 'admin'],
        message: 'अमान्य भूमिका / Invalid role',
      },
      required: [true, 'भूमिका आवश्यक है / Role is required'],
    },
    preferredLanguage: {
      type: String,
      default: 'hi',
    },
    state: {
      type: String,
      trim: true,
      default: '',
    },
    district: {
      type: String,
      trim: true,
      default: '',
    },

    // Farmer-Specific Fields
    village: {
      type: String,
      trim: true,
      default: '',
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    verificationDocumentStatus: {
      type: String,
      enum: ['none', 'submitted', 'approved', 'rejected'],
      default: 'none',
    },

    // Buyer-Specific Fields
    businessName: {
      type: String,
      trim: true,
      default: '',
    },
    businessType: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

const User = mongoose.model('User', userSchema)

export default User
