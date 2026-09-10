import mongoose from 'mongoose'
import Booking from '../models/Booking.js'
import Review  from '../models/Review.js'

// ── Helper ────────────────────────────────────────────────────────────────────

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

// Safe buyer fields exposed in public review responses (no mobile, no password)
const BUYER_SAFE = 'name'

/**
 * @desc    Buyer submits a review for a completed booking
 * @route   POST /api/reviews
 * @access  Private — buyer only (protect + authorizeRoles('buyer'))
 *
 * Body:
 *   bookingId  {string}   required — the completed booking being reviewed
 *   rating     {number}   required — integer 1–5
 *   review     {string}   optional — max 500 chars
 *
 * Security rules enforced server-side:
 *   1. Authenticated buyer only.
 *   2. booking.buyer === req.user._id
 *   3. booking.status === 'completed'
 *   4. No existing review for this booking (unique index + explicit check).
 *   5. farmer and crop are derived from the booking document — never from request body.
 */
export const createReview = async (req, res) => {
  try {
    const buyerId = req.user._id

    // ── Validate bookingId ────────────────────────────────────────────────────
    const { bookingId } = req.body
    if (!bookingId || !isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing bookingId.',
      })
    }

    // ── Validate rating ───────────────────────────────────────────────────────
    const rawRating = req.body.rating
    if (rawRating === undefined || rawRating === null || rawRating === '') {
      return res.status(400).json({
        success: false,
        message: 'Rating is required.',
      })
    }
    const rating = Number(rawRating)
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be an integer between 1 and 5.',
      })
    }

    // ── Sanitise review text ──────────────────────────────────────────────────
    const rawReview = req.body.review
    const reviewText = (typeof rawReview === 'string')
      ? rawReview.trim().slice(0, 500)
      : ''

    // ── Load booking — scoped to this buyer ───────────────────────────────────
    const booking = await Booking.findOne({ _id: bookingId, buyer: buyerId }).lean()

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      })
    }

    // ── Eligibility: must be completed ───────────────────────────────────────
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Reviews can only be submitted for completed bookings.',
      })
    }

    // ── Derive farmer and crop from the booking (never from request body) ─────
    const farmerId = booking.farmer
    const cropId   = booking.crop

    if (!farmerId || !cropId) {
      return res.status(400).json({
        success: false,
        message: 'Booking is missing farmer or crop reference.',
      })
    }

    // ── Duplicate check — explicit, before hitting the unique index ───────────
    const existing = await Review.findOne({ booking: bookingId }).lean()
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted a review for this booking.',
      })
    }

    // ── Create review ─────────────────────────────────────────────────────────
    const rev = await Review.create({
      buyer:   buyerId,
      farmer:  farmerId,
      booking: bookingId,
      crop:    cropId,
      rating,
      review:  reviewText,
    })

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      review: {
        id:        rev._id,
        booking:   rev.booking,
        rating:    rev.rating,
        review:    rev.review,
        createdAt: rev.createdAt,
      },
    })

  } catch (err) {
    // Mongo unique constraint violation (race condition duplicate)
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'You have already submitted a review for this booking.',
      })
    }
    console.error('createReview error:', err?.message)
    return res.status(500).json({
      success: false,
      message: 'Failed to submit review. Please try again.',
    })
  }
}

/**
 * @desc    Get all reviews for a farmer (public)
 * @route   GET /api/reviews/farmer/:farmerId
 * @access  Public
 *
 * Returns safe review data — buyer mobile/password never exposed.
 */
export const getFarmerReviews = async (req, res) => {
  try {
    const { farmerId } = req.params

    if (!isValidObjectId(farmerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid farmer ID.',
      })
    }

    const reviews = await Review
      .find({ farmer: farmerId })
      .sort({ createdAt: -1 })
      .populate('buyer', BUYER_SAFE)
      .lean()

    const shaped = reviews.map((r) => ({
      id:         r._id,
      rating:     r.rating,
      review:     r.review || '',
      buyerName:  r.buyer?.name || 'Buyer',
      createdAt:  r.createdAt,
    }))

    // ── Aggregation ───────────────────────────────────────────────────────────
    const count = shaped.length
    const average = count > 0
      ? Math.round((shaped.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : null

    return res.status(200).json({
      success:   true,
      farmerId,
      count,
      average,
      newSeller: count === 0,
      reviews:   shaped,
    })

  } catch (err) {
    console.error('getFarmerReviews error:', err?.message)
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews. Please try again.',
    })
  }
}

/**
 * @desc    Get the review for a specific booking (if it exists)
 * @route   GET /api/reviews/booking/:bookingId
 * @access  Private — buyer only (protect + authorizeRoles('buyer'))
 *          Only the booking's buyer may fetch this.
 */
export const getBookingReview = async (req, res) => {
  try {
    const buyerId    = req.user._id
    const { bookingId } = req.params

    if (!isValidObjectId(bookingId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID.',
      })
    }

    // ── Verify booking belongs to this buyer ──────────────────────────────────
    const booking = await Booking.findOne({ _id: bookingId, buyer: buyerId }).lean()
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      })
    }

    const rev = await Review.findOne({ booking: bookingId }).lean()

    if (!rev) {
      return res.status(200).json({
        success:  true,
        reviewed: false,
        review:   null,
      })
    }

    return res.status(200).json({
      success:  true,
      reviewed: true,
      review: {
        id:        rev._id,
        rating:    rev.rating,
        review:    rev.review || '',
        createdAt: rev.createdAt,
      },
    })

  } catch (err) {
    console.error('getBookingReview error:', err?.message)
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch review. Please try again.',
    })
  }
}
