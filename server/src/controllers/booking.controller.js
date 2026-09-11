import mongoose from 'mongoose'
import Crop    from '../models/Crop.js'
import Booking from '../models/Booking.js'
import Delivery from '../models/Delivery.js'
import Transaction, { generateTransactionReference } from '../models/Transaction.js'
import { generateBookingSlipPdf } from '../services/bookingPdfService.js'
import { createNotification } from '../services/notificationService.js'

// ── Helper: validate a MongoDB ObjectId string ────────────────────────────────
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

// ── Safe populate field selectors (shared by all handlers) ───────────────────
const BUYER_SELECT = 'name village district state'
const CROP_SELECT  = 'cropName cropType quantity quantityUnit expectedPrice location status'

// Valid booking statuses — must match Booking model enum
const VALID_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled']

// Allowed transitions: maps current status → set of statuses the farmer may move it to
const FARMER_TRANSITIONS = {
  pending:   ['confirmed', 'cancelled'],
  confirmed: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
}

/**
 * @desc    Create a pre-booking request for an available crop
 * @route   POST /api/marketplace/crops/:id/prebooking
 * @access  Private — buyer only (protect + authorizeRoles('buyer'))
 *
 * Body:
 *   quantity     {number}  required  — must be > 0 and ≤ crop.quantity
 *   quantityUnit {string}  optional  — defaults to crop's unit
 *   buyerNote    {string}  optional  — max 500 chars
 *
 * Buyer identity is derived exclusively from req.user._id (JWT).
 * Farmer identity is derived from crop.farmer — never from the request body.
 * Crop status is NOT modified in this step.
 */
export const createPrebooking = async (req, res) => {
  try {
    const { id: cropId } = req.params

    // ── Validate crop ObjectId ────────────────────────────────────────────────
    if (!isValidObjectId(cropId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid crop ID.',
      })
    }

    // ── Load crop — must exist and be available ───────────────────────────────
    const crop = await Crop.findOne({ _id: cropId, status: 'available' }).lean()

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'This crop is no longer available or does not exist.',
      })
    }

    // ── Parse and validate quantity ───────────────────────────────────────────
    const rawQty = req.body.quantity
    if (rawQty === undefined || rawQty === null || rawQty === '') {
      return res.status(400).json({
        success: false,
        message: 'quantity is required.',
      })
    }

    const quantity = Number(rawQty)
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: 'quantity must be a positive number.',
      })
    }

    if (quantity > crop.quantity) {
      return res.status(400).json({
        success: false,
        message: `Requested quantity (${quantity}) exceeds available quantity (${crop.quantity} ${crop.quantityUnit || 'quintal'}).`,
      })
    }

    // ── Sanitise optional fields ──────────────────────────────────────────────
    const rawUnit = req.body.quantityUnit
    const quantityUnit = (typeof rawUnit === 'string' && rawUnit.trim())
      ? rawUnit.trim().slice(0, 50)
      : (crop.quantityUnit || 'quintal')

    const rawNote = req.body.buyerNote
    const buyerNote = (typeof rawNote === 'string')
      ? rawNote.trim().slice(0, 500)
      : ''

    // ── Identities — always from trusted sources, never from request body ─────
    const buyerId  = req.user._id    // from JWT via protect middleware
    const farmerId = crop.farmer     // from the crop document itself

    // ── Prevent a buyer booking their own crop ────────────────────────────────
    if (String(buyerId) === String(farmerId)) {
      return res.status(400).json({
        success: false,
        message: 'You cannot pre-book your own crop.',
      })
    }

    // ── Use crop's expectedPrice as initial agreedPrice (null if unset) ────────
    const agreedPrice = (crop.expectedPrice !== null && crop.expectedPrice !== undefined)
      ? crop.expectedPrice
      : null

    // ── Create booking ────────────────────────────────────────────────────────
    const booking = await Booking.create({
      buyer:        buyerId,
      farmer:       farmerId,
      crop:         crop._id,
      quantity,
      quantityUnit,
      agreedPrice,
      status:       'pending',
      buyerNote,
      // farmerNote defaults to '' — farmer sets it when responding
    })

    // ── Fire notification to farmer (non-blocking) ────────────────────────────
    try {
      await createNotification({
        recipient:   farmerId,
        type:        'booking_created',
        title:       'New Booking Request',
        message:     `A buyer has placed a pre-booking request for your crop.`,
        relatedId:   booking._id,
        relatedType: 'Booking',
      })
    } catch (notifErr) {
      console.error('booking_created notification failed (non-fatal):', notifErr?.message)
    }

    // ── Shape safe response — no passwords, tokens, or sensitive user data ────
    return res.status(201).json({
      success: true,
      message: 'Pre-booking request submitted successfully. Waiting for farmer confirmation.',
      booking: {
        id:           booking._id,
        crop:         booking.crop,
        farmer:       booking.farmer,
        buyer:        booking.buyer,
        quantity:     booking.quantity,
        quantityUnit: booking.quantityUnit,
        agreedPrice:  booking.agreedPrice,
        status:       booking.status,
        buyerNote:    booking.buyerNote,
        createdAt:    booking.createdAt,
      },
    })

  } catch (err) {
    console.error('createPrebooking error:', err?.message)
    return res.status(500).json({
      success: false,
      message: 'Failed to create pre-booking. Please try again.',
    })
  }
}

/**
 * @desc    List all booking requests received by the authenticated farmer
 * @route   GET /api/marketplace/farmer/bookings
 * @access  Private — farmer only (protect + authorizeRoles('farmer'))
 *
 * Query parameters:
 *   status  {string}  optional — filter by 'pending' | 'confirmed' | 'cancelled'
 *
 * Farmer identity is derived exclusively from req.user._id.
 * Populates safe buyer and crop fields only — no passwords or tokens exposed.
 */
export const getFarmerBookings = async (req, res) => {
  try {
    const farmerId = req.user._id

    // ── Build query ───────────────────────────────────────────────────────────
    const query = { farmer: farmerId }

    const rawStatus = typeof req.query.status === 'string'
      ? req.query.status.trim().toLowerCase()
      : ''

    if (rawStatus) {
      if (!VALID_STATUSES.includes(rawStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status filter. Allowed values: ${VALID_STATUSES.join(', ')}.`,
        })
      }
      query.status = rawStatus
    }

    // ── Fetch bookings — newest first ─────────────────────────────────────────
    const bookings = await Booking
      .find(query)
      .sort({ createdAt: -1 })
      .populate('buyer', BUYER_SELECT)
      .populate('crop',  CROP_SELECT)
      .lean()

    // ── Shape response — only safe fields ─────────────────────────────────────
    const shaped = bookings.map((b) => ({
      id:           b._id,
      status:       b.status,
      quantity:     b.quantity,
      quantityUnit: b.quantityUnit,
      agreedPrice:  b.agreedPrice,
      buyerNote:    b.buyerNote,
      farmerNote:   b.farmerNote,
      createdAt:    b.createdAt,
      updatedAt:    b.updatedAt,
      buyer: b.buyer
        ? {
            id:       b.buyer._id,
            name:     b.buyer.name     || '',
            village:  b.buyer.village  || '',
            district: b.buyer.district || '',
            state:    b.buyer.state    || '',
          }
        : null,
      crop: b.crop
        ? {
            id:            b.crop._id,
            cropName:      b.crop.cropName,
            cropType:      b.crop.cropType      || '',
            quantity:      b.crop.quantity,
            quantityUnit:  b.crop.quantityUnit  || 'quintal',
            expectedPrice: b.crop.expectedPrice ?? null,
            location:      b.crop.location      || '',
            status:        b.crop.status        || '',
          }
        : null,
    }))

    return res.status(200).json({
      success: true,
      count:   shaped.length,
      bookings: shaped,
    })

  } catch (err) {
    console.error('getFarmerBookings error:', err?.message)
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings. Please try again.',
    })
  }
}

/**
 * @desc    Farmer updates a booking status (confirm / complete / cancel)
 * @route   PATCH /api/marketplace/farmer/bookings/:id/status
 * @access  Private — farmer only (protect + authorizeRoles('farmer'))
 *
 * Body:
 *   status      {string}  required — target status (see FARMER_TRANSITIONS)
 *   farmerNote  {string}  optional — max 500 chars; only written when supplied
 *
 * Allowed transitions (enforced server-side):
 *   pending   -> confirmed | cancelled
 *   confirmed -> completed | cancelled
 *   completed -> (none)
 *   cancelled -> (none)
 *
 * Farmer identity is always from req.user._id — never from request body.
 * Crop status is NOT changed in this step.
 */
export const updateBookingStatus = async (req, res) => {
  try {
    const farmerId = req.user._id
    const { id }   = req.params

    // ── Validate booking ObjectId ─────────────────────────────────────────────
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID.',
      })
    }

    // ── Parse and coarse-validate requested target status ─────────────────────
    const newStatus = typeof req.body.status === 'string'
      ? req.body.status.trim().toLowerCase()
      : ''

    if (!VALID_STATUSES.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status '${newStatus}'. Allowed values: ${VALID_STATUSES.join(', ')}.`,
      })
    }

    // ── Load booking scoped to this farmer — 404 if not owned ────────────────
    const booking = await Booking
      .findOne({ _id: id, farmer: farmerId })
      .populate('buyer', BUYER_SELECT)
      .populate('crop',  CROP_SELECT)

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      })
    }

    // ── Enforce transition table ───────────────────────────────────────────────
    const allowed = FARMER_TRANSITIONS[booking.status] || []
    if (!allowed.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition booking from '${booking.status}' to '${newStatus}'. Allowed: ${allowed.length ? allowed.join(', ') : 'none (terminal state)'}.`,
      })
    }

    // ── Apply updates ─────────────────────────────────────────────────────────
    booking.status = newStatus

    // farmerNote: write only when explicitly present in request body
    if (typeof req.body.farmerNote === 'string') {
      booking.farmerNote = req.body.farmerNote.trim().slice(0, 500)
    }

    await booking.save()

    // ── Fire notification to buyer (non-blocking) ─────────────────────────────
    try {
      const buyerId = booking.buyer?._id || booking.buyer
      if (newStatus === 'confirmed') {
        await createNotification({
          recipient:   buyerId,
          type:        'booking_confirmed',
          title:       'Booking Confirmed',
          message:     'Your pre-booking request has been confirmed by the farmer.',
          relatedId:   booking._id,
          relatedType: 'Booking',
        })
      } else if (newStatus === 'cancelled') {
        await createNotification({
          recipient:   buyerId,
          type:        'booking_cancelled',
          title:       'Booking Cancelled',
          message:     'Your pre-booking request has been cancelled.',
          relatedId:   booking._id,
          relatedType: 'Booking',
        })
      } else if (newStatus === 'completed') {
        await createNotification({
          recipient:   buyerId,
          type:        'booking_completed',
          title:       'Booking Completed',
          message:     'Your booking has been marked as completed by the farmer.',
          relatedId:   booking._id,
          relatedType: 'Booking',
        })
      }
    } catch (notifErr) {
      console.error('booking status notification failed (non-fatal):', notifErr?.message)
    }

    // ── Auto-create Delivery record when booking is confirmed ─────────────────
    if (newStatus === 'confirmed') {
      try {
        const exists = await Delivery.findOne({ booking: booking._id })
        if (!exists) {
          const buyerId  = booking.buyer?._id  || booking.buyer
          const farmerId = booking.farmer?._id || booking.farmer
          const cropId   = booking.crop?._id   || booking.crop

          // Pre-fill delivery address from buyer populated fields
          const buyer = booking.buyer
          const addrParts = []
          if (buyer?.district) addrParts.push(buyer.district)
          if (buyer?.state)    addrParts.push(buyer.state)
          const deliveryAddress = addrParts.length ? addrParts.join(', ') : ''

          await Delivery.create({
            booking:         booking._id,
            buyer:           buyerId,
            farmer:          farmerId,
            crop:            cropId,
            status:          'pending',
            deliveryAddress,
            contactName:     buyer?.name   || '',
            contactMobile:   buyer?.mobile || '',
          })
        }
      } catch (deliveryErr) {
        console.error('auto-create delivery failed (non-fatal):', deliveryErr?.message)
      }

      // ── Auto-create Transaction record when booking is confirmed ─────────────
      try {
        const txnExists = await Transaction.findOne({ booking: booking._id })
        if (!txnExists) {
          const buyerId  = booking.buyer?._id  || booking.buyer
          const farmerId = booking.farmer?._id || booking.farmer
          const cropId   = booking.crop?._id   || booking.crop

          // Calculate amount server-side: quantity * agreedPrice
          const qty   = booking.quantity   || 0
          const price = booking.agreedPrice || 0
          const amount = Math.max(0, Number((qty * price).toFixed(2)))

          await Transaction.create({
            booking:   booking._id,
            buyer:     buyerId,
            farmer:    farmerId,
            crop:      cropId,
            amount,
            currency:          'INR',
            paymentMethod:     'pending',
            paymentStatus:     'pending',
            transactionStatus: 'pending',
            reference:         generateTransactionReference(),
          })
        }
      } catch (txnErr) {
        console.error('auto-create transaction failed (non-fatal):', txnErr?.message)
      }
    }

    // ── Shape safe response ───────────────────────────────────────────────────
    const b = booking.toObject()
    return res.status(200).json({
      success: true,
      message: `Booking ${newStatus} successfully.`,
      booking: {
        id:           b._id,
        status:       b.status,
        quantity:     b.quantity,
        quantityUnit: b.quantityUnit,
        agreedPrice:  b.agreedPrice,
        buyerNote:    b.buyerNote,
        farmerNote:   b.farmerNote,
        createdAt:    b.createdAt,
        updatedAt:    b.updatedAt,
        buyer: b.buyer
          ? {
              id:       b.buyer._id,
              name:     b.buyer.name     || '',
              village:  b.buyer.village  || '',
              district: b.buyer.district || '',
              state:    b.buyer.state    || '',
            }
          : null,
        crop: b.crop
          ? {
              id:            b.crop._id,
              cropName:      b.crop.cropName,
              cropType:      b.crop.cropType      || '',
              quantity:      b.crop.quantity,
              quantityUnit:  b.crop.quantityUnit  || 'quintal',
              expectedPrice: b.crop.expectedPrice ?? null,
              location:      b.crop.location      || '',
              status:        b.crop.status        || '',
            }
          : null,
      },
    })

  } catch (err) {
    console.error('updateBookingStatus error:', err?.message)
    return res.status(500).json({
      success: false,
      message: 'Failed to update booking status. Please try again.',
    })
  }
}

// ── Safe farmer populate fields for buyer-facing responses ──────────────────
const FARMER_SELECT     = 'name village district state'
// PDF endpoint uses the same safe fields (no phone, no password, no token)
const FARMER_SELECT_PDF = 'name village district state'
const BUYER_SELECT_PDF  = 'name village district state'

/**
 * @desc    List all bookings placed by the authenticated buyer
 * @route   GET /api/marketplace/buyer/bookings
 * @access  Private — buyer only (protect + authorizeRoles('buyer'))
 *
 * Query parameters:
 *   status  {string}  optional — filter by 'pending' | 'confirmed' | 'cancelled'
 *
 * Buyer identity is derived exclusively from req.user._id.
 */
export const getBuyerBookings = async (req, res) => {
  try {
    const buyerId = req.user._id

    const query = { buyer: buyerId }

    const rawStatus = typeof req.query.status === 'string'
      ? req.query.status.trim().toLowerCase()
      : ''

    if (rawStatus) {
      if (!VALID_STATUSES.includes(rawStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status filter. Allowed values: ${VALID_STATUSES.join(', ')}.`,
        })
      }
      query.status = rawStatus
    }

    const bookings = await Booking
      .find(query)
      .sort({ createdAt: -1 })
      .populate('farmer', FARMER_SELECT)
      .populate('crop',   CROP_SELECT)
      .lean()

    const shaped = bookings.map((b) => ({
      id:           b._id,
      status:       b.status,
      quantity:     b.quantity,
      quantityUnit: b.quantityUnit,
      agreedPrice:  b.agreedPrice,
      buyerNote:    b.buyerNote,
      farmerNote:   b.farmerNote,
      createdAt:    b.createdAt,
      updatedAt:    b.updatedAt,
      farmer: b.farmer
        ? {
            id:       b.farmer._id,
            name:     b.farmer.name     || '',
            village:  b.farmer.village  || '',
            district: b.farmer.district || '',
            state:    b.farmer.state    || '',
          }
        : null,
      crop: b.crop
        ? {
            id:            b.crop._id,
            cropName:      b.crop.cropName,
            cropType:      b.crop.cropType      || '',
            quantity:      b.crop.quantity,
            quantityUnit:  b.crop.quantityUnit  || 'quintal',
            expectedPrice: b.crop.expectedPrice ?? null,
            location:      b.crop.location      || '',
            status:        b.crop.status        || '',
          }
        : null,
    }))

    return res.status(200).json({
      success:  true,
      count:    shaped.length,
      bookings: shaped,
    })

  } catch (err) {
    console.error('getBuyerBookings error:', err?.message)
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings. Please try again.',
    })
  }
}

/**
 * @desc    Download a booking slip PDF for a specific booking
 * @route   GET /api/marketplace/buyer/bookings/:id/pdf
 * @access  Private — buyer only (protect + authorizeRoles('buyer'))
 *
 * Security:
 *   - Booking must belong to the authenticated buyer (booking.buyer === req.user._id).
 *   - Farmer identity comes from the booking document — never from the request.
 *   - No sensitive user fields (password, phone, OTP, tokens) are populated.
 *   - Returns a binary PDF stream, not JSON.
 */
export const getBookingPdf = async (req, res) => {
  try {
    const buyerId = req.user._id
    const { id }  = req.params

    // ── Validate booking ObjectId ─────────────────────────────────────────────
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking ID.',
      })
    }

    // ── Load booking — scoped to this buyer to prevent cross-user access ──────
    const booking = await Booking
      .findOne({ _id: id, buyer: buyerId })
      .populate('farmer', FARMER_SELECT_PDF)
      .populate('buyer',  BUYER_SELECT_PDF)
      .populate('crop',   CROP_SELECT)
      .lean()

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found.',
      })
    }

    // ── Stream PDF to response ─────────────────────────────────────────────────
    const safeId = String(id).slice(-8).toUpperCase()
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="smart-mandi-booking-${safeId}.pdf"`
    )
    res.setHeader('Cache-Control', 'no-store')

    generateBookingSlipPdf(booking, res)

  } catch (err) {
    console.error('getBookingPdf error:', err?.message)
    // Only send JSON error headers if we haven't started streaming yet
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate booking PDF. Please try again.',
      })
    }
  }
}
