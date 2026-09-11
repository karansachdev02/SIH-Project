import mongoose from 'mongoose'

/**
 * Delivery Model for KisanMitra.
 *
 * Created automatically when a booking is confirmed.
 * Represents the logistics/delivery record for a confirmed booking.
 *
 * Lifecycle:
 *   pending -> assigned / cancelled
 *   assigned -> picked_up / cancelled
 *   picked_up -> in_transit / cancelled
 *   in_transit -> delivered
 *   delivered -> terminal
 *   cancelled -> terminal
 */

export const DELIVERY_STATUSES = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'cancelled']

export const DELIVERY_TRANSITIONS = {
  pending:    ['assigned', 'cancelled'],
  assigned:   ['picked_up', 'cancelled'],
  picked_up:  ['in_transit', 'cancelled'],
  in_transit: ['delivered'],
  delivered:  [],
  cancelled:  [],
}

export const TRANSPORT_MODES = ['self', 'local_transport', 'tractor', 'truck', 'other']

const deliverySchema = new mongoose.Schema(
  {
    // ── Source booking — one delivery per booking ──────────────────────────────
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, 'Booking reference is required'],
      unique: true,
      index: true,
    },

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

    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Crop',
      required: [true, 'Crop reference is required'],
    },

    // ── Delivery status ───────────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: DELIVERY_STATUSES,
        message: 'Invalid delivery status',
      },
      default: 'pending',
    },

    // ── Delivery address (buyer-side destination) ─────────────────────────────
    deliveryAddress: {
      type: String,
      trim: true,
      maxlength: [500, 'Delivery address must not exceed 500 characters'],
      default: '',
    },

    contactName: {
      type: String,
      trim: true,
      maxlength: [100, 'Contact name must not exceed 100 characters'],
      default: '',
    },

    contactMobile: {
      type: String,
      trim: true,
      maxlength: [20, 'Contact mobile must not exceed 20 characters'],
      default: '',
    },

    // ── Transport details (farmer fills in) ───────────────────────────────────
    transportMode: {
      type: String,
      enum: {
        values: TRANSPORT_MODES,
        message: 'Invalid transport mode',
      },
      default: 'local_transport',
    },

    vehicleNumber: {
      type: String,
      trim: true,
      maxlength: [30, 'Vehicle number must not exceed 30 characters'],
      default: '',
    },

    driverName: {
      type: String,
      trim: true,
      maxlength: [100, 'Driver name must not exceed 100 characters'],
      default: '',
    },

    driverMobile: {
      type: String,
      trim: true,
      maxlength: [20, 'Driver mobile must not exceed 20 characters'],
      default: '',
    },

    // ── Dates ─────────────────────────────────────────────────────────────────
    estimatedDeliveryDate: {
      type: Date,
      default: null,
    },

    actualDeliveryDate: {
      type: Date,
      default: null,
    },

    // ── Free-form notes ───────────────────────────────────────────────────────
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes must not exceed 500 characters'],
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

// Fast per-buyer / per-farmer lookups
deliverySchema.index({ buyer: 1, createdAt: -1 },  { name: 'idx_buyer_deliveries' })
deliverySchema.index({ farmer: 1, createdAt: -1 }, { name: 'idx_farmer_deliveries' })
deliverySchema.index({ status: 1, createdAt: -1 }, { name: 'idx_status_deliveries' })

const Delivery = mongoose.model('Delivery', deliverySchema)

export default Delivery
