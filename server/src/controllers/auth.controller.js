import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import generateToken from '../utils/generateToken.js'
import generateVerificationSessionToken from '../utils/generateVerificationSessionToken.js'

/**
 * Helper to validate 10-digit Indian mobile number format.
 */
const isValidMobile = (mobile) => /^[6-9]\d{9}$/.test(mobile)

/**
 * @desc    Register a new Farmer account
 * @route   POST /api/auth/register/farmer
 * @access  Public
 */
export const registerFarmer = async (req, res) => {
  try {
    const { name, mobile, password, preferredLanguage, state, district, village, mobileVerificationToken } = req.body

    // Field validation
    if (!name || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: 'कृपया नाम, मोबाइल नंबर और पासवर्ड प्रदान करें / Name, mobile, and password are required',
      })
    }

    if (!isValidMobile(mobile)) {
      return res.status(400).json({
        success: false,
        message: 'कृपया मान्य 10-अंकीय मोबाइल नंबर दर्ज करें / Please enter a valid 10-digit Indian mobile number',
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए / Password must be at least 6 characters',
      })
    }

    // Verify Mobile Proof Token
    if (!mobileVerificationToken) {
      return res.status(403).json({
        success: false,
        message: 'कृपया पहले अपना मोबाइल नंबर OTP से सत्यापित करें / Mobile number must be verified via OTP first',
      })
    }

    try {
      const secret = process.env.JWT_SECRET
      const decodedProof = jwt.verify(mobileVerificationToken, secret)
      if (decodedProof.purpose !== 'farmer_registration' || decodedProof.mobile !== mobile.trim()) {
        return res.status(403).json({
          success: false,
          message: 'मोबाइल सत्यापन प्रमाण अमान्य या बेमेल है / Invalid or mismatched mobile verification proof',
        })
      }
    } catch (tokenErr) {
      return res.status(403).json({
        success: false,
        message: 'सत्यापन टोकन समाप्त हो गया है या अमान्य है / Mobile verification token expired or invalid',
      })
    }

    // Check duplicate mobile
    const existingUser = await User.findOne({ mobile })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'यह मोबाइल नंबर पहले से पंजीकृत है / Mobile number is already registered',
      })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create Farmer user
    const farmer = await User.create({
      name,
      mobile,
      password: hashedPassword,
      role: 'farmer',
      preferredLanguage: preferredLanguage || 'hi',
      state: state || '',
      district: district || '',
      village: village || '',
      verificationStatus: 'pending',
      verificationDocumentStatus: 'none',
    })

    // Generate restricted short-lived verification session token for document upload ONLY
    const verificationSessionToken = generateVerificationSessionToken(farmer._id)

    return res.status(201).json({
      success: true,
      message: 'Farmer registration submitted for verification',
      verificationSessionToken,
      user: {
        _id: farmer._id,
        name: farmer.name,
        mobile: farmer.mobile,
        role: farmer.role,
        verificationStatus: farmer.verificationStatus,
        state: farmer.state,
        district: farmer.district,
        village: farmer.village,
        preferredLanguage: farmer.preferredLanguage,
        createdAt: farmer.createdAt,
      },
    })
  } catch (error) {
    console.error('registerFarmer error:', error)
    return res.status(500).json({
      success: false,
      message: 'सर्वर त्रुटि: पंजीकरण विफल / Server error: Farmer registration failed',
    })
  }
}

/**
 * @desc    Register a new Buyer account
 * @route   POST /api/auth/register/buyer
 * @access  Public
 */
export const registerBuyer = async (req, res) => {
  try {
    const { name, mobile, password, preferredLanguage, state, district, businessName, businessType } = req.body

    // Field validation
    if (!name || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: 'कृपया नाम, मोबाइल नंबर और पासवर्ड प्रदान करें / Name, mobile, and password are required',
      })
    }

    if (!isValidMobile(mobile)) {
      return res.status(400).json({
        success: false,
        message: 'कृपया मान्य 10-अंकीय मोबाइल नंबर दर्ज करें / Please enter a valid 10-digit Indian mobile number',
      })
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'पासवर्ड कम से कम 6 अक्षरों का होना चाहिए / Password must be at least 6 characters',
      })
    }

    // Check duplicate mobile
    const existingUser = await User.findOne({ mobile })
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'यह मोबाइल नंबर पहले से पंजीकृत है / Mobile number is already registered',
      })
    }

    // Hash password
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // Create Buyer user
    const buyer = await User.create({
      name,
      mobile,
      password: hashedPassword,
      role: 'buyer',
      preferredLanguage: preferredLanguage || 'hi',
      state: state || '',
      district: district || '',
      businessName: businessName || '',
      businessType: businessType || '',
      verificationStatus: 'verified', // Buyer active immediately
    })

    // Generate JWT token for active buyer
    const token = generateToken(buyer._id, buyer.role)

    return res.status(201).json({
      success: true,
      message: 'Buyer registration successful',
      token,
      user: {
        _id: buyer._id,
        name: buyer.name,
        mobile: buyer.mobile,
        role: buyer.role,
        businessName: buyer.businessName,
        businessType: buyer.businessType,
        state: buyer.state,
        district: buyer.district,
        preferredLanguage: buyer.preferredLanguage,
        createdAt: buyer.createdAt,
      },
    })
  } catch (error) {
    console.error('registerBuyer error:', error)
    return res.status(500).json({
      success: false,
      message: 'सर्वर त्रुटि: पंजीकरण विफल / Server error: Buyer registration failed',
    })
  }
}

/**
 * @desc    Authenticate User & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res) => {
  try {
    const { mobile, password } = req.body

    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        message: 'कृपया मोबाइल नंबर और पासवर्ड प्रदान करें / Mobile number and password are required',
      })
    }

    // Retrieve user with password
    const user = await User.findOne({ mobile }).select('+password')

    // Reject invalid credentials without revealing whether mobile or password was incorrect
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'अमान्य मोबाइल नंबर या पासवर्ड / Invalid mobile number or password',
      })
    }

    // Check Farmer Verification Rule
    if (user.role === 'farmer') {
      if (user.verificationStatus === 'pending') {
        return res.status(200).json({
          success: true,
          authenticated: false,
          verificationStatus: 'pending',
          message: 'Your account is pending verification',
        })
      }

      if (user.verificationStatus === 'rejected') {
        return res.status(403).json({
          success: false,
          authenticated: false,
          verificationStatus: 'rejected',
          message: 'Your farmer verification was rejected',
        })
      }
    }

    // Active user: Generate JWT token
    const token = generateToken(user._id, user.role)

    return res.status(200).json({
      success: true,
      authenticated: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        mobile: user.mobile,
        role: user.role,
        verificationStatus: user.verificationStatus,
        state: user.state,
        district: user.district,
        preferredLanguage: user.preferredLanguage,
      },
    })
  } catch (error) {
    console.error('loginUser error:', error)
    return res.status(500).json({
      success: false,
      message: 'सर्वर त्रुटि: लॉगिन विफल / Server error: Login failed',
    })
  }
}
