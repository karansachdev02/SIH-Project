import mongoose from 'mongoose'

/**
 * Booking Model for KisanMitra.
 *
 * Represents a pre-booking request made by a buyer for a specific
 * available crop listing created by a farmer.
 *
 * Lifecycle:
 *   pending   → farmer has not yet responded
 *   confirmed → farmer accepted the booking
 *   cancelled → buyer or farmer cancelled
 *
 * Future extensions (do NOT add yet):
 *   - payment reference
 *   - transport request
 *   - rating/review (triggered after confirmed + delivered)
 *   - booking PDF / slip generation
 */
const bookingSchema = new mongoose.Schema(
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

    // ── Crop being booked ─────────────────────────────────────────────────────

    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
      required: [true, 'Crop reference is required'],
      index: true,
    },

    // ── Quantity ──────────────────────────────────────────────────────────────

    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0.01, 'Quantity must be greater than zero'],
    },

    quantityUnit: {
      type: String,
      trim: true,
      default: 'quintal',
    },

    // ── Agreed price ──────────────────────────────────────────────────────────
    // May differ from crop.expectedPrice if negotiated.
    // null = price not yet agreed (pending negotiation).

    agreedPrice: {
      type: Number,
      min: [0, 'Agreed price must be non-negative'],
      default: null,
    },

    // ── Status ────────────────────────────────────────────────────────────────

    status: {
      type: String,
      enum: {
        values: ['pending', 'confirmed', 'completed', 'cancelled'],
        message: 'Invalid booking status. Must be pending, confirmed, completed, or cancelled.',
      },
      default: 'pending',
    },

    // ── Notes ─────────────────────────────────────────────────────────────────

    // Buyer's note to the farmer (e.g. pickup preference, quality requirements)
    buyerNote: {
      type: String,
      trim: true,
      maxlength: [500, 'Buyer note must not exceed 500 characters'],
      default: '',
    },

    // Farmer's response note (e.g. confirmation details, delivery info)
    farmerNote: {
      type: String,
      trim: true,
      maxlength: [500, 'Farmer note must not exceed 500 characters'],
      default: '',
    },
  },
  {
    timestamps: true,  // createdAt = booking request time, updatedAt = last status change
  }
)

// ── Indexes ───────────────────────────────────────────────────────────────────

// Buyer's booking inbox — list all bookings for a buyer, newest first
bookingSchema.index(
  { buyer: 1, createdAt: -1 },
  { name: 'idx_buyer_bookings' }
)

// Farmer's incoming requests — list all bookings for a farmer, newest first
bookingSchema.index(
  { farmer: 1, createdAt: -1 },
  { name: 'idx_farmer_bookings' }
)

// Crop-level view — find all bookings on a specific crop listing
bookingSchema.index(
  { crop: 1, status: 1 },
  { name: 'idx_crop_bookings_by_status' }
)

// Status filter — useful for admin queries and cleanup jobs
bookingSchema.index(
  { status: 1, createdAt: -1 },
  { name: 'idx_status_bookings' }
)

const Booking = mongoose.model('Booking', bookingSchema)

export default Booking
