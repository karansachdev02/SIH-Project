import User    from '../models/User.js'
import Crop    from '../models/Crop.js'
import Booking from '../models/Booking.js'
import Review  from '../models/Review.js'

/**
 * @desc    Get platform summary statistics
 * @route   GET /api/admin/stats
 * @access  Private (admin only — protect + authorizeRoles('admin'))
 *
 * Returns document counts only. No user data, no passwords, no tokens.
 * Extended with booking, review, and verified-user counts.
 */
export const getAdminStats = async (req, res) => {
  try {
    const [
      totalFarmers,
      totalBuyers,
      pendingVerifications,
      totalCrops,
      verifiedFarmers,
      availableCrops,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      totalReviews,
    ] = await Promise.all([
      User.countDocuments({ role: 'farmer' }),
      User.countDocuments({ role: 'buyer' }),
      User.countDocuments({ role: 'farmer', verificationStatus: 'pending' }),
      Crop.countDocuments({}),
      User.countDocuments({ role: 'farmer', verificationStatus: 'verified' }),
      Crop.countDocuments({ status: 'available' }),
      Booking.countDocuments({}),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'confirmed' }),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ status: 'cancelled' }),
      Review.countDocuments({}),
    ])

    return res.status(200).json({
      success: true,
      stats: {
        // existing fields — unchanged for backward compat
        totalFarmers,
        totalBuyers,
        pendingVerifications,
        totalCrops,
        // new fields
        verifiedFarmers,
        availableCrops,
        totalBookings,
        pendingBookings,
        confirmedBookings,
        completedBookings,
        cancelledBookings,
        totalReviews,
      },
    })
  } catch (error) {
    console.error('getAdminStats error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error: Failed to fetch admin stats.',
    })
  }
}
