import mongoose from 'mongoose'

/**
 * Review Model for Smart Mandi.
 *
 * A buyer may leave one review per completed booking.
 * The review is tied to a specific booking, farmer, buyer, and crop.
 *
 * Lifecycle eligibility: booking.status must be 'completed' at review creation time.
 * The booking field has a unique index — one review per booking, enforced at DB level.
 */
const reviewSchema = new mongoose.Schema(
  {
    // ── Parties ───────────────────────────────────────────────────────────────

    buyer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Buyer reference is required'],
      index: true,
    },

    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Farmer reference is required'],
      index: true,
    },

    // ── Source documents ──────────────────────────────────────────────────────

    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
      unique: true,   // one review per completed booking — enforced at DB level
    },

    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
      required: [true, 'Crop reference is required'],
      index: true,
    },

    // ── Rating ────────────────────────────────────────────────────────────────

    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must be at most 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be an integer',
      },
    },

    // ── Review text ───────────────────────────────────────────────────────────

    review: {
      type: String,
      trim: true,
      maxlength: [500, 'Review must not exceed 500 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

// ── Indexes ───────────────────────────────────────────────────────────────────

// Farmer's review inbox — list all reviews for a farmer, newest first
reviewSchema.index(
  { farmer: 1, createdAt: -1 },
  { name: 'idx_farmer_reviews' }
)

// Buyer's review history
reviewSchema.index(
  { buyer: 1, createdAt: -1 },
  { name: 'idx_buyer_reviews' }
)

const Review = mongoose.model('Review', reviewSchema)

export default Review
