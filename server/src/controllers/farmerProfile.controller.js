import User from '../models/User.js'

/**
 * Allowed profile fields a farmer may update on their own account.
 * mobile, role, password, verificationStatus, verificationDocumentStatus,
 * _id, createdAt, updatedAt, and all authentication fields are NOT allowed.
 *
 * Note: mobile is the login/OTP-verified identifier — changing it would
 * bypass OTP verification and is therefore blocked at this endpoint.
 */
const ALLOWED_PROFILE_FIELDS = ['name', 'village', 'district', 'state', 'preferredLanguage']

/**
 * @desc    Update the authenticated farmer's own profile
 * @route   PATCH /api/farmer/profile
 * @access  Private (farmer only — protect + authorizeRoles('farmer'))
 *
 * Security guarantees:
 *   - Farmer identity comes ONLY from req.user._id (JWT) — never from request body.
 *   - Only ALLOWED_PROFILE_FIELDS are ever written to the document.
 *   - mobile, role, password, verificationStatus, and all auth fields are immutable here.
 *   - MongoDB update operators cannot be injected — we assign plain scalar values only.
 *   - Response never contains password, tokens, OTP, or internal security fields.
 */
export const updateFarmerProfile = async (req, res) => {
  try {
    const farmerId = req.user._id

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

    if (req.body.village !== undefined) {
      updates.village = String(req.body.village).trim().slice(0, 100)
    }

    if (req.body.district !== undefined) {
      updates.district = String(req.body.district).trim().slice(0, 100)
    }

    if (req.body.state !== undefined) {
      updates.state = String(req.body.state).trim().slice(0, 100)
    }

    if (req.body.preferredLanguage !== undefined) {
      const VALID_LANGUAGES = ['hi', 'en', 'mr', 'pa', 'gu', 'bn', 'te', 'ta', 'kn', 'ml', 'or']
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

    // Update — scoped to the authenticated farmer's own document only
    const farmer = await User.findByIdAndUpdate(
      farmerId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password')

    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Farmer account not found.',
      })
    }

    // Return safe user object — same shape as login/register responses
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        _id: farmer._id,
        name: farmer.name,
        mobile: farmer.mobile,
        role: farmer.role,
        verificationStatus: farmer.verificationStatus,
        village: farmer.village,
        district: farmer.district,
        state: farmer.state,
        preferredLanguage: farmer.preferredLanguage,
        createdAt: farmer.createdAt,
        updatedAt: farmer.updatedAt,
      },
    })
  } catch (error) {
    console.error('updateFarmerProfile error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error: Failed to update profile.',
    })
  }
}
