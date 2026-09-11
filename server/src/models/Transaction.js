import mongoose from 'mongoose'
import crypto from 'crypto'

/**
 * Transaction Model for KisanMitra.
 *
 * Created automatically when a booking is confirmed.
 * Tracks the payment status for a confirmed booking.
 * This is a demo payment workflow — no real money is transferred.
 *
 * Payment lifecycle:
 *   pending -> initiated / cancelled
 *   initiated -> paid / failed / cancelled
 *   paid -> refunded
 *   failed -> initiated (retry)
 *   cancelled -> terminal
 *   refunded -> terminal
 */

export const PAYMENT_STATUSES = ['pending', 'initiated', 'paid', 'failed', 'refunded', 'cancelled']

export const TRANSACTION_STATUSES = ['pending', 'processing', 'successful', 'failed', 'refunded', 'cancelled']

export const PAYMENT_METHODS = ['cash_on_delivery', 'upi_demo', 'bank_transfer_demo', 'pending']

/**
 * Strict buyer-side action transitions.
 * Maps current paymentStatus -> allowed new paymentStatus.
 */
export const BUYER_TRANSITIONS = {
  pending:   ['initiated', 'cancelled'],
  initiated: ['paid', 'failed', 'cancelled'],
  paid:      [],
  failed:    ['initiated'],          // retry
  refunded:  [],
  cancelled: [],
}

/**
 * Map paymentStatus -> transactionStatus (kept in sync).
 */
export const PAYMENT_TO_TRANSACTION_STATUS = {
  pending:   'pending',
  initiated: 'processing',
  paid:      'successful',
  failed:    'failed',
  refunded:  'refunded',
  cancelled: 'cancelled',
}

/**
 * Generate a unique transaction reference: SM-TXN-<16 hex chars>
 */
export function generateTransactionReference() {
  return `SM-TXN-${crypto.randomBytes(8).toString('hex').toUpperCase()}`
}

const transactionSchema = new mongoose.Schema(
  {
    // ── Source booking — one transaction per booking ───────────────────────────
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

    // ── Amount ────────────────────────────────────────────────────────────────
    // Calculated server-side: booking.quantity * booking.agreedPrice
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0, 'Amount must be non-negative'],
    },

    currency: {
      type: String,
      default: 'INR',
      trim: true,
    },

    // ── Payment method ────────────────────────────────────────────────────────
    paymentMethod: {
      type: String,
      enum: {
        values: PAYMENT_METHODS,
        message: 'Invalid payment method',
      },
      default: 'pending',
    },

    // ── Payment status ────────────────────────────────────────────────────────
    paymentStatus: {
      type: String,
      enum: {
        values: PAYMENT_STATUSES,
        message: 'Invalid payment status',
      },
      default: 'pending',
    },

    // ── Transaction status (mirrors paymentStatus) ────────────────────────────
    transactionStatus: {
      type: String,
      enum: {
        values: TRANSACTION_STATUSES,
        message: 'Invalid transaction status',
      },
      default: 'pending',
    },

    // ── Unique transaction reference ──────────────────────────────────────────
    reference: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
      trim: true,
    },

    // ── Notes ─────────────────────────────────────────────────────────────────
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes must not exceed 500 characters'],
      default: '',
    },

    // ── Timestamps for payment events ─────────────────────────────────────────
    paidAt: {
      type: Date,
      default: null,
    },

    refundedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

// Fast per-buyer / per-farmer lookups, newest first
transactionSchema.index({ buyer: 1, createdAt: -1 },  { name: 'idx_buyer_transactions' })
transactionSchema.index({ farmer: 1, createdAt: -1 }, { name: 'idx_farmer_transactions' })
transactionSchema.index({ paymentStatus: 1 },          { name: 'idx_payment_status' })

const Transaction = mongoose.model('Transaction', transactionSchema)

export default Transaction
