import User from '../models/User.js'

/**
 * Allowed profile fields a buyer may update on their own account.
 * mobile, role, password, verificationStatus, verificationDocumentStatus,
 * _id, createdAt, updatedAt, and all authentication fields are NOT allowed.
 *
 * Note: mobile is the OTP-verified login identifier — it is blocked here.
 * Note: village is a farmer-specific field — not included for buyers.
 */
const ALLOWED_BUYER_PROFILE_FIELDS = [
  'name',
  'district',
  'state',
  'businessName',
  'businessType',
  'preferredLanguage',
]

const VALID_LANGUAGES = ['hi', 'en', 'mr', 'pa', 'gu', 'bn', 'te', 'ta', 'kn', 'ml', 'or']

/**
 * @desc    Update the authenticated buyer's own profile
 * @route   PATCH /api/buyer/profile
 * @access  Private (buyer only — protect + authorizeRoles('buyer'))
 *
 * Security guarantees:
 *   - Buyer identity comes ONLY from req.user._id (JWT) — never from request body.
 *   - Only ALLOWED_BUYER_PROFILE_FIELDS are ever written to the document.
 *   - mobile, role, password, verificationStatus, and all auth fields are immutable here.
 *   - MongoDB update operators cannot be injected — we assign plain scalar values only.
 *   - Response never contains password, tokens, OTP, or internal security fields.
 */
export const updateBuyerProfile = async (req, res) => {
  try {
    const buyerId = req.user._id

    // Build a controlled update object — only scalar values from the allowlist
    const updates = {}

    if (req.body.name !== undefined) {
      const val = String(req.body.name).trim()
      if (!val) {
        return res.status(400).json({
          success: false,
          message: 'Name is required.',
        })
      }
      if (val.length > 100) {
        return res.status(400).json({
          success: false,
          message: 'Name must not exceed 100 characters.',
        })
      }
      updates.name = val
    }

    if (req.body.district !== undefined) {
      updates.district = String(req.body.district).trim().slice(0, 100)
    }

    if (req.body.state !== undefined) {
      updates.state = String(req.body.state).trim().slice(0, 100)
    }

    if (req.body.businessName !== undefined) {
      updates.businessName = String(req.body.businessName).trim().slice(0, 150)
    }

    if (req.body.businessType !== undefined) {
      updates.businessType = String(req.body.businessType).trim().slice(0, 100)
    }

    if (req.body.preferredLanguage !== undefined) {
      const lang = String(req.body.preferredLanguage).trim().toLowerCase()
      if (!VALID_LANGUAGES.includes(lang)) {
        return res.status(400).json({
          success: false,
          message: `Invalid language code. Allowed: ${VALID_LANGUAGES.join(', ')}.`,
        })
      }
      updates.preferredLanguage = lang
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update.',
      })
    }

    // Update — scoped to the authenticated buyer's own document only
    const buyer = await User.findByIdAndUpdate(
      buyerId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password')

    if (!buyer) {
      return res.status(404).json({
        success: false,
        message: 'Buyer account not found.',
      })
    }

    // Return safe user object — same shape as buyer login/register responses
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        _id: buyer._id,
        name: buyer.name,
        mobile: buyer.mobile,
        role: buyer.role,
        verificationStatus: buyer.verificationStatus,
        businessName: buyer.businessName,
        businessType: buyer.businessType,
        district: buyer.district,
        state: buyer.state,
        preferredLanguage: buyer.preferredLanguage,
        createdAt: buyer.createdAt,
        updatedAt: buyer.updatedAt,
      },
    })
  } catch (error) {
    console.error('updateBuyerProfile error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error: Failed to update profile.',
    })
  }
}
