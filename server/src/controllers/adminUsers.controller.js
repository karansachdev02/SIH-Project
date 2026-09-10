import mongoose from 'mongoose'
import User    from '../models/User.js'
import Crop    from '../models/Crop.js'
import Booking from '../models/Booking.js'
import Review  from '../models/Review.js'

// ── Helpers ────────────────────────────────────────────────────────────────────

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

// Safe user fields — never include password, OTP, verificationSessionToken
const SAFE_USER_FIELDS = '-password'

// Shape a user document for list responses
function shapeUserList(u) {
  return {
    id:                         u._id,
    name:                       u.name,
    mobile:                     u.mobile,
    role:                       u.role,
    preferredLanguage:          u.preferredLanguage || 'hi',
    state:                      u.state             || '',
    district:                   u.district          || '',
    village:                    u.village           || '',
    verificationStatus:         u.verificationStatus         ?? null,
    verificationDocumentStatus: u.verificationDocumentStatus ?? null,
    businessName:               u.businessName      || '',
    businessType:               u.businessType      || '',
    createdAt:                  u.createdAt,
    updatedAt:                  u.updatedAt,
  }
}

/**
 * @desc    List platform users with search, role filter, verification filter, pagination
 * @route   GET /api/admin/users
 * @access  Private — admin only (protect + authorizeRoles('admin'))
 *
 * Query:
 *   role               — farmer | buyer | admin   (default: all)
 *   verificationStatus — pending | verified | rejected  (farmers only, default: all)
 *   search             — name, mobile, village, district, state, businessName
 *   page               — 1-based  (default: 1)
 *   limit              — 1–100    (default: 20)
 */
export const getAdminUsers = async (req, res) => {
  try {
    // ── Pagination ────────────────────────────────────────────────────────────
    const rawPage  = parseInt(req.query.page,  10)
    const rawLimit = parseInt(req.query.limit, 10)
    const page  = Number.isFinite(rawPage)  && rawPage  >= 1 ? rawPage  : 1
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, 100) : 20
    const skip  = (page - 1) * limit

    // ── Filters ───────────────────────────────────────────────────────────────
    const filter = {}

    const rawRole = typeof req.query.role === 'string' ? req.query.role.trim().toLowerCase() : ''
    if (['farmer', 'buyer', 'admin'].includes(rawRole)) {
      filter.role = rawRole
    }

    const rawVS = typeof req.query.verificationStatus === 'string'
      ? req.query.verificationStatus.trim().toLowerCase()
      : ''
    if (['pending', 'verified', 'rejected'].includes(rawVS)) {
      filter.verificationStatus = rawVS
    }

    // ── Search (case-insensitive partial across safe text fields) ─────────────
    const rawSearch = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : ''
    if (rawSearch) {
      const re = { $regex: rawSearch, $options: 'i' }
      filter.$or = [
        { name:         re },
        { mobile:       re },
        { village:      re },
        { district:     re },
        { state:        re },
        { businessName: re },
      ]
    }

    // ── Query ─────────────────────────────────────────────────────────────────
    const [users, total] = await Promise.all([
      User.find(filter)
        .select(SAFE_USER_FIELDS)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ])

    const totalPages = Math.ceil(total / limit)

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      users: users.map(shapeUserList),
    })

  } catch (err) {
    console.error('getAdminUsers error:', err?.message)
    return res.status(500).json({
      success: false,
      message: 'Server error: Failed to fetch users.',
    })
  }
}

/**
 * @desc    Get detailed information for a single user
 * @route   GET /api/admin/users/:id
 * @access  Private — admin only (protect + authorizeRoles('admin'))
 *
 * Returns safe user info + role-specific platform counts.
 * Never exposes password, OTP, or session tokens.
 */
export const getAdminUserById = async (req, res) => {
  try {
    const { id } = req.params

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID.' })
    }

    const user = await User.findById(id).select(SAFE_USER_FIELDS).lean()
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' })
    }

    // ── Role-specific platform counts ─────────────────────────────────────────
    let extra = {}

    if (user.role === 'farmer') {
      const [cropCount, bookingCount, reviewCount, reviewAgg] = await Promise.all([
        Crop.countDocuments({ farmer: user._id }),
        Booking.countDocuments({ farmer: user._id }),
        Review.countDocuments({ farmer: user._id }),
        Review.aggregate([
          { $match: { farmer: new mongoose.Types.ObjectId(String(user._id)) } },
          { $group: { _id: null, total: { $sum: '$rating' }, count: { $sum: 1 } } },
        ]),
      ])
      const avgRating = reviewAgg.length > 0
        ? Math.round((reviewAgg[0].total / reviewAgg[0].count) * 10) / 10
        : null
      extra = { cropCount, bookingCount, reviewCount, avgRating }
    }

    if (user.role === 'buyer') {
      const [bookingCount, reviewCount] = await Promise.all([
        Booking.countDocuments({ buyer: user._id }),
        Review.countDocuments({ buyer: user._id }),
      ])
      extra = { bookingCount, reviewCount }
    }

    return res.status(200).json({
      success: true,
      user: {
        ...shapeUserList(user),
        ...extra,
      },
    })

  } catch (err) {
    console.error('getAdminUserById error:', err?.message)
    return res.status(500).json({
      success: false,
      message: 'Server error: Failed to fetch user.',
    })
  }
}
