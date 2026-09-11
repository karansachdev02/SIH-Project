import mongoose from 'mongoose'
import Transaction, {
  PAYMENT_STATUSES,
  PAYMENT_METHODS,
  BUYER_TRANSITIONS,
  PAYMENT_TO_TRANSACTION_STATUS,
  generateTransactionReference,
} from '../models/Transaction.js'
import { createNotification } from '../services/notificationService.js'

// ── Helper ────────────────────────────────────────────────────────────────────

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

// Safe populate fields — never expose passwords or auth secrets
const SAFE_USER    = 'name district state village mobile'
const SAFE_CROP    = 'cropName cropType quantity quantityUnit expectedPrice location'
const SAFE_BOOKING = 'status quantity quantityUnit agreedPrice buyerNote farmerNote createdAt'

/**
 * Shape a raw transaction document into a safe API response.
 */
function shapeTransaction(t) {
  return {
    id:                t._id,
    reference:         t.reference        || '',
    amount:            t.amount,
    currency:          t.currency         || 'INR',
    paymentMethod:     t.paymentMethod,
    paymentStatus:     t.paymentStatus,
    transactionStatus: t.transactionStatus,
    notes:             t.notes            || '',
    paidAt:            t.paidAt           || null,
    refundedAt:        t.refundedAt        || null,
    createdAt:         t.createdAt,
    updatedAt:         t.updatedAt,
    booking: t.booking
      ? (t.booking._id
          ? {
              id:          t.booking._id,
              status:      t.booking.status,
              quantity:    t.booking.quantity,
              quantityUnit:t.booking.quantityUnit,
              agreedPrice: t.booking.agreedPrice,
              buyerNote:   t.booking.buyerNote  || '',
              farmerNote:  t.booking.farmerNote || '',
              createdAt:   t.booking.createdAt,
            }
          : { id: t.booking })
      : null,
    buyer: t.buyer
      ? (t.buyer._id
          ? { id: t.buyer._id, name: t.buyer.name || '', district: t.buyer.district || '', state: t.buyer.state || '' }
          : { id: t.buyer })
      : null,
    farmer: t.farmer
      ? (t.farmer._id
          ? { id: t.farmer._id, name: t.farmer.name || '', district: t.farmer.district || '', state: t.farmer.state || '', village: t.farmer.village || '' }
          : { id: t.farmer })
      : null,
    crop: t.crop
      ? (t.crop._id
          ? { id: t.crop._id, cropName: t.crop.cropName, cropType: t.crop.cropType || '', quantity: t.crop.quantity, quantityUnit: t.crop.quantityUnit || 'quintal', expectedPrice: t.crop.expectedPrice ?? null, location: t.crop.location || '' }
          : { id: t.crop })
      : null,
  }
}

// ── Notification messages per payment status change ───────────────────────────
const PAYMENT_NOTIF = {
  initiated: {
    forFarmer: { title: 'Payment Initiated',    message: 'The buyer has initiated payment for a booking.' },
  },
  paid: {
    forFarmer: { title: 'Payment Received',     message: 'The buyer has marked payment as paid for a booking.' },
  },
  failed: {
    forFarmer: { title: 'Payment Failed',       message: 'The buyer reported a payment failure for a booking.' },
  },
  cancelled: {
    forFarmer: { title: 'Payment Cancelled',    message: 'The buyer has cancelled payment for a booking.' },
  },
  refunded: {
    forBuyer: { title: 'Payment Refunded',      message: 'The farmer has initiated a refund for your payment.' },
  },
}

/**
 * @desc    Get all transactions for the authenticated buyer
 * @route   GET /api/transactions/buyer
 * @access  Private
 */
export const getBuyerTransactions = async (req, res) => {
  try {
    const buyerId = req.user._id

    const transactions = await Transaction
      .find({ buyer: buyerId })
      .sort({ createdAt: -1 })
      .populate('buyer',   SAFE_USER)
      .populate('farmer',  SAFE_USER)
      .populate('crop',    SAFE_CROP)
      .populate('booking', SAFE_BOOKING)
      .lean()

    return res.status(200).json({
      success: true,
      count: transactions.length,
      transactions: transactions.map(shapeTransaction),
    })
  } catch (err) {
    console.error('getBuyerTransactions error:', err?.message)
    return res.status(500).json({ success: false, message: 'Failed to fetch transactions.' })
  }
}

/**
 * @desc    Get all transactions for the authenticated farmer
 * @route   GET /api/transactions/farmer
 * @access  Private
 */
export const getFarmerTransactions = async (req, res) => {
  try {
    const farmerId = req.user._id

    const transactions = await Transaction
      .find({ farmer: farmerId })
      .sort({ createdAt: -1 })
      .populate('buyer',   SAFE_USER)
      .populate('farmer',  SAFE_USER)
      .populate('crop',    SAFE_CROP)
      .populate('booking', SAFE_BOOKING)
      .lean()

    return res.status(200).json({
      success: true,
      count: transactions.length,
      transactions: transactions.map(shapeTransaction),
    })
  } catch (err) {
    console.error('getFarmerTransactions error:', err?.message)
    return res.status(500).json({ success: false, message: 'Failed to fetch transactions.' })
  }
}

/**
 * @desc    Get a single transaction by ID
 * @route   GET /api/transactions/:id
 * @access  Private — buyer or farmer associated with the transaction
 */
export const getTransaction = async (req, res) => {
  try {
    const userId = req.user._id
    const { id } = req.params

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction ID.' })
    }

    const txn = await Transaction
      .findById(id)
      .populate('buyer',   SAFE_USER)
      .populate('farmer',  SAFE_USER)
      .populate('crop',    SAFE_CROP)
      .populate('booking', SAFE_BOOKING)
      .lean()

    if (!txn) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' })
    }

    const buyerId  = String(txn.buyer?._id  || txn.buyer)
    const farmerId = String(txn.farmer?._id || txn.farmer)
    if (String(userId) !== buyerId && String(userId) !== farmerId) {
      return res.status(403).json({ success: false, message: 'Access denied.' })
    }

    return res.status(200).json({
      success: true,
      transaction: shapeTransaction(txn),
    })
  } catch (err) {
    console.error('getTransaction error:', err?.message)
    return res.status(500).json({ success: false, message: 'Failed to fetch transaction.' })
  }
}

/**
 * @desc    Buyer updates payment status (demo payment actions)
 * @route   PATCH /api/transactions/:id/payment
 * @access  Private — buyer only
 *
 * Body:
 *   action        {string}  required — 'initiate' | 'mark_paid' | 'mark_failed' | 'cancel'
 *   paymentMethod {string}  optional — used when initiating
 *
 * Amount, buyer, farmer, crop, booking are NEVER accepted from request body.
 */
export const updatePayment = async (req, res) => {
  try {
    const buyerId = req.user._id
    const { id } = req.params

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction ID.' })
    }

    // Load transaction scoped to this buyer
    const txn = await Transaction
      .findOne({ _id: id, buyer: buyerId })
      .populate('buyer',  '_id name')
      .populate('farmer', '_id name')

    if (!txn) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' })
    }

    // ── Parse action ─────────────────────────────────────────────────────────
    const VALID_ACTIONS = ['initiate', 'mark_paid', 'mark_failed', 'cancel']
    const action = typeof req.body.action === 'string' ? req.body.action.trim() : ''
    if (!VALID_ACTIONS.includes(action)) {
      return res.status(400).json({
        success: false,
        message: `Invalid action. Allowed: ${VALID_ACTIONS.join(', ')}.`,
      })
    }

    // ── Map action to target paymentStatus ────────────────────────────────────
    const ACTION_TO_STATUS = {
      initiate:    'initiated',
      mark_paid:   'paid',
      mark_failed: 'failed',
      cancel:      'cancelled',
    }
    const targetStatus = ACTION_TO_STATUS[action]

    // ── Validate transition ──────────────────────────────────────────────────
    const allowed = BUYER_TRANSITIONS[txn.paymentStatus] || []
    if (!allowed.includes(targetStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition payment from '${txn.paymentStatus}' to '${targetStatus}'. Allowed: ${allowed.length ? allowed.join(', ') : 'none (terminal state)'}.`,
      })
    }

    // ── Apply payment method when initiating ─────────────────────────────────
    if (action === 'initiate') {
      const rawMethod = typeof req.body.paymentMethod === 'string' ? req.body.paymentMethod.trim() : ''
      if (rawMethod && PAYMENT_METHODS.filter((m) => m !== 'pending').includes(rawMethod)) {
        txn.paymentMethod = rawMethod
      }
    }

    // ── Apply status change ───────────────────────────────────────────────────
    txn.paymentStatus     = targetStatus
    txn.transactionStatus = PAYMENT_TO_TRANSACTION_STATUS[targetStatus]

    if (targetStatus === 'paid') {
      txn.paidAt = new Date()
    }

    await txn.save()

    // ── Notify farmer (non-blocking) ─────────────────────────────────────────
    try {
      const notifData = PAYMENT_NOTIF[targetStatus]?.forFarmer
      if (notifData) {
        const farmerId = txn.farmer?._id || txn.farmer
        await createNotification({
          recipient:   farmerId,
          type:        'payment_status',
          title:       notifData.title,
          message:     notifData.message,
          relatedId:   txn._id,
          relatedType: 'Transaction',
        })
      }
    } catch (notifErr) {
      console.error('payment_status notification failed (non-fatal):', notifErr?.message)
    }

    const updated = await Transaction
      .findById(txn._id)
      .populate('buyer',   SAFE_USER)
      .populate('farmer',  SAFE_USER)
      .populate('crop',    SAFE_CROP)
      .populate('booking', SAFE_BOOKING)
      .lean()

    return res.status(200).json({
      success: true,
      transaction: shapeTransaction(updated),
    })
  } catch (err) {
    console.error('updatePayment error:', err?.message)
    return res.status(500).json({ success: false, message: 'Failed to update payment.' })
  }
}

/**
 * @desc    Farmer refunds a paid transaction (demo only)
 * @route   PATCH /api/transactions/:id/refund
 * @access  Private — farmer only
 *
 * Only allowed when paymentStatus === 'paid'.
 */
export const refundTransaction = async (req, res) => {
  try {
    const farmerId = req.user._id
    const { id }   = req.params

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid transaction ID.' })
    }

    // Load transaction scoped to this farmer
    const txn = await Transaction
      .findOne({ _id: id, farmer: farmerId })
      .populate('buyer',  '_id name')
      .populate('farmer', '_id name')

    if (!txn) {
      return res.status(404).json({ success: false, message: 'Transaction not found.' })
    }

    if (txn.paymentStatus !== 'paid') {
      return res.status(400).json({
        success: false,
        message: `Refund is only available for paid transactions. Current status: ${txn.paymentStatus}.`,
      })
    }

    txn.paymentStatus     = 'refunded'
    txn.transactionStatus = 'refunded'
    txn.refundedAt        = new Date()

    await txn.save()

    // ── Notify buyer (non-blocking) ───────────────────────────────────────────
    try {
      const notifData = PAYMENT_NOTIF['refunded']?.forBuyer
      if (notifData) {
        const buyerId = txn.buyer?._id || txn.buyer
        await createNotification({
          recipient:   buyerId,
          type:        'payment_status',
          title:       notifData.title,
          message:     notifData.message,
          relatedId:   txn._id,
          relatedType: 'Transaction',
        })
      }
    } catch (notifErr) {
      console.error('payment_status refund notification failed (non-fatal):', notifErr?.message)
    }

    const updated = await Transaction
      .findById(txn._id)
      .populate('buyer',   SAFE_USER)
      .populate('farmer',  SAFE_USER)
      .populate('crop',    SAFE_CROP)
      .populate('booking', SAFE_BOOKING)
      .lean()

    return res.status(200).json({
      success: true,
      transaction: shapeTransaction(updated),
    })
  } catch (err) {
    console.error('refundTransaction error:', err?.message)
    return res.status(500).json({ success: false, message: 'Failed to process refund.' })
  }
}
