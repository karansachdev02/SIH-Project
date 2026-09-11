import mongoose from 'mongoose'
import Delivery, { DELIVERY_TRANSITIONS, TRANSPORT_MODES, DELIVERY_STATUSES } from '../models/Delivery.js'
import { createNotification } from '../services/notificationService.js'

// ── Helper ────────────────────────────────────────────────────────────────────

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

// Safe fields to populate when returning delivery data
const SAFE_USER = 'name district state village mobile'
const SAFE_CROP = 'cropName cropType quantity quantityUnit expectedPrice location'
const SAFE_BOOKING = 'status quantity quantityUnit agreedPrice buyerNote farmerNote createdAt'

/**
 * Shape a raw delivery document into a safe API response object.
 * Never exposes passwords, tokens, or internal MongoDB references directly.
 */
function shapeDelivery(d) {
  return {
    id:                    d._id,
    status:                d.status,
    transportMode:         d.transportMode,
    vehicleNumber:         d.vehicleNumber  || '',
    driverName:            d.driverName     || '',
    driverMobile:          d.driverMobile   || '',
    deliveryAddress:       d.deliveryAddress || '',
    contactName:           d.contactName    || '',
    contactMobile:         d.contactMobile  || '',
    estimatedDeliveryDate: d.estimatedDeliveryDate || null,
    actualDeliveryDate:    d.actualDeliveryDate    || null,
    notes:                 d.notes          || '',
    createdAt:             d.createdAt,
    updatedAt:             d.updatedAt,
    booking: d.booking
      ? (d.booking._id
          ? {
              id:          d.booking._id,
              status:      d.booking.status,
              quantity:    d.booking.quantity,
              quantityUnit:d.booking.quantityUnit,
              agreedPrice: d.booking.agreedPrice,
              buyerNote:   d.booking.buyerNote  || '',
              farmerNote:  d.booking.farmerNote || '',
              createdAt:   d.booking.createdAt,
            }
          : { id: d.booking })
      : null,
    buyer: d.buyer
      ? (d.buyer._id
          ? {
              id:       d.buyer._id,
              name:     d.buyer.name     || '',
              district: d.buyer.district || '',
              state:    d.buyer.state    || '',
              mobile:   d.buyer.mobile   || '',
            }
          : { id: d.buyer })
      : null,
    farmer: d.farmer
      ? (d.farmer._id
          ? {
              id:       d.farmer._id,
              name:     d.farmer.name     || '',
              district: d.farmer.district || '',
              state:    d.farmer.state    || '',
              village:  d.farmer.village  || '',
            }
          : { id: d.farmer })
      : null,
    crop: d.crop
      ? (d.crop._id
          ? {
              id:            d.crop._id,
              cropName:      d.crop.cropName,
              cropType:      d.crop.cropType      || '',
              quantity:      d.crop.quantity,
              quantityUnit:  d.crop.quantityUnit  || 'quintal',
              expectedPrice: d.crop.expectedPrice ?? null,
              location:      d.crop.location      || '',
            }
          : { id: d.crop })
      : null,
  }
}

// ── Delivery status notification messages ─────────────────────────────────────
const STATUS_NOTIF_MESSAGES = {
  assigned:   { title: 'Delivery Assigned',     message: 'Your crop order has been assigned for delivery.' },
  picked_up:  { title: 'Order Picked Up',        message: 'Your crop order has been picked up by the transporter.' },
  in_transit: { title: 'Order In Transit',       message: 'Your crop order is now in transit to your location.' },
  delivered:  { title: 'Order Delivered',        message: 'Your crop order has been delivered successfully.' },
  cancelled:  { title: 'Delivery Cancelled',     message: 'The delivery for your crop order has been cancelled.' },
}

/**
 * @desc    Get all deliveries for the authenticated buyer
 * @route   GET /api/deliveries/buyer
 * @access  Private
 */
export const getBuyerDeliveries = async (req, res) => {
  try {
    const buyerId = req.user._id

    const deliveries = await Delivery
      .find({ buyer: buyerId })
      .sort({ createdAt: -1 })
      .populate('buyer',   SAFE_USER)
      .populate('farmer',  SAFE_USER)
      .populate('crop',    SAFE_CROP)
      .populate('booking', SAFE_BOOKING)
      .lean()

    return res.status(200).json({
      success: true,
      count: deliveries.length,
      deliveries: deliveries.map(shapeDelivery),
    })
  } catch (err) {
    console.error('getBuyerDeliveries error:', err?.message)
    return res.status(500).json({ success: false, message: 'Failed to fetch deliveries.' })
  }
}

/**
 * @desc    Get all deliveries for the authenticated farmer
 * @route   GET /api/deliveries/farmer
 * @access  Private
 */
export const getFarmerDeliveries = async (req, res) => {
  try {
    const farmerId = req.user._id

    const deliveries = await Delivery
      .find({ farmer: farmerId })
      .sort({ createdAt: -1 })
      .populate('buyer',   SAFE_USER)
      .populate('farmer',  SAFE_USER)
      .populate('crop',    SAFE_CROP)
      .populate('booking', SAFE_BOOKING)
      .lean()

    return res.status(200).json({
      success: true,
      count: deliveries.length,
      deliveries: deliveries.map(shapeDelivery),
    })
  } catch (err) {
    console.error('getFarmerDeliveries error:', err?.message)
    return res.status(500).json({ success: false, message: 'Failed to fetch deliveries.' })
  }
}

/**
 * @desc    Get a single delivery by ID
 * @route   GET /api/deliveries/:id
 * @access  Private — only the buyer or farmer associated with this delivery
 */
export const getDelivery = async (req, res) => {
  try {
    const userId = req.user._id
    const { id } = req.params

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery ID.' })
    }

    const delivery = await Delivery
      .findById(id)
      .populate('buyer',   SAFE_USER)
      .populate('farmer',  SAFE_USER)
      .populate('crop',    SAFE_CROP)
      .populate('booking', SAFE_BOOKING)
      .lean()

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found.' })
    }

    // Ownership check — user must be the buyer or farmer
    const buyerId  = String(delivery.buyer?._id || delivery.buyer)
    const farmerId = String(delivery.farmer?._id || delivery.farmer)
    if (String(userId) !== buyerId && String(userId) !== farmerId) {
      return res.status(403).json({ success: false, message: 'Access denied.' })
    }

    return res.status(200).json({
      success: true,
      delivery: shapeDelivery(delivery),
    })
  } catch (err) {
    console.error('getDelivery error:', err?.message)
    return res.status(500).json({ success: false, message: 'Failed to fetch delivery.' })
  }
}

/**
 * @desc    Farmer updates logistics details (NOT status)
 * @route   PATCH /api/deliveries/:id
 * @access  Private — farmer only
 *
 * Allowed fields: transportMode, vehicleNumber, driverName, driverMobile,
 *                 estimatedDeliveryDate, notes, deliveryAddress, contactName, contactMobile
 */
export const updateDelivery = async (req, res) => {
  try {
    const farmerId = req.user._id
    const { id } = req.params

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery ID.' })
    }

    // Load delivery scoped to this farmer
    const delivery = await Delivery.findOne({ _id: id, farmer: farmerId })
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found.' })
    }

    const {
      transportMode,
      vehicleNumber,
      driverName,
      driverMobile,
      estimatedDeliveryDate,
      notes,
      deliveryAddress,
      contactName,
      contactMobile,
    } = req.body

    // ── transportMode ────────────────────────────────────────────────────────
    if (transportMode !== undefined) {
      if (!TRANSPORT_MODES.includes(transportMode)) {
        return res.status(400).json({
          success: false,
          message: `Invalid transport mode. Allowed: ${TRANSPORT_MODES.join(', ')}.`,
        })
      }
      delivery.transportMode = transportMode
    }

    // ── String fields ────────────────────────────────────────────────────────
    if (vehicleNumber  !== undefined) delivery.vehicleNumber  = String(vehicleNumber).trim().slice(0, 30)
    if (driverName     !== undefined) delivery.driverName     = String(driverName).trim().slice(0, 100)
    if (driverMobile   !== undefined) delivery.driverMobile   = String(driverMobile).trim().slice(0, 20)
    if (notes          !== undefined) delivery.notes          = String(notes).trim().slice(0, 500)
    if (deliveryAddress !== undefined) delivery.deliveryAddress = String(deliveryAddress).trim().slice(0, 500)
    if (contactName    !== undefined) delivery.contactName    = String(contactName).trim().slice(0, 100)
    if (contactMobile  !== undefined) delivery.contactMobile  = String(contactMobile).trim().slice(0, 20)

    // ── estimatedDeliveryDate ────────────────────────────────────────────────
    if (estimatedDeliveryDate !== undefined) {
      if (estimatedDeliveryDate === null || estimatedDeliveryDate === '') {
        delivery.estimatedDeliveryDate = null
      } else {
        const d = new Date(estimatedDeliveryDate)
        if (isNaN(d.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid estimatedDeliveryDate.' })
        }
        delivery.estimatedDeliveryDate = d
      }
    }

    await delivery.save()

    const updated = await Delivery
      .findById(delivery._id)
      .populate('buyer',   SAFE_USER)
      .populate('farmer',  SAFE_USER)
      .populate('crop',    SAFE_CROP)
      .populate('booking', SAFE_BOOKING)
      .lean()

    return res.status(200).json({
      success: true,
      delivery: shapeDelivery(updated),
    })
  } catch (err) {
    console.error('updateDelivery error:', err?.message)
    return res.status(500).json({ success: false, message: 'Failed to update delivery.' })
  }
}

/**
 * @desc    Farmer updates delivery status
 * @route   PATCH /api/deliveries/:id/status
 * @access  Private — farmer only
 *
 * Validates transition map strictly.
 * Notifies buyer on status change.
 */
export const updateDeliveryStatus = async (req, res) => {
  try {
    const farmerId = req.user._id
    const { id } = req.params

    if (!isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: 'Invalid delivery ID.' })
    }

    const rawStatus = typeof req.body.status === 'string'
      ? req.body.status.trim().toLowerCase()
      : ''

    if (!DELIVERY_STATUSES.includes(rawStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${DELIVERY_STATUSES.join(', ')}.`,
      })
    }

    // Load delivery scoped to this farmer
    const delivery = await Delivery
      .findOne({ _id: id, farmer: farmerId })
      .populate('buyer', '_id name')

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found.' })
    }

    // Enforce transition map
    const allowed = DELIVERY_TRANSITIONS[delivery.status] || []
    if (!allowed.includes(rawStatus)) {
      return res.status(400).json({
        success: false,
        message: `Cannot transition delivery from '${delivery.status}' to '${rawStatus}'. Allowed: ${allowed.length ? allowed.join(', ') : 'none (terminal state)'}.`,
      })
    }

    delivery.status = rawStatus

    // Set actualDeliveryDate when delivered
    if (rawStatus === 'delivered') {
      delivery.actualDeliveryDate = new Date()
    }

    await delivery.save()

    // ── Notify buyer (non-blocking) ───────────────────────────────────────────
    try {
      const notifData = STATUS_NOTIF_MESSAGES[rawStatus]
      if (notifData) {
        const buyerId = delivery.buyer?._id || delivery.buyer
        await createNotification({
          recipient:   buyerId,
          type:        'delivery_status',
          title:       notifData.title,
          message:     notifData.message,
          relatedId:   delivery._id,
          relatedType: 'Delivery',
        })
      }
    } catch (notifErr) {
      console.error('delivery_status notification failed (non-fatal):', notifErr?.message)
    }

    const updated = await Delivery
      .findById(delivery._id)
      .populate('buyer',   SAFE_USER)
      .populate('farmer',  SAFE_USER)
      .populate('crop',    SAFE_CROP)
      .populate('booking', SAFE_BOOKING)
      .lean()

    return res.status(200).json({
      success: true,
      delivery: shapeDelivery(updated),
    })
  } catch (err) {
    console.error('updateDeliveryStatus error:', err?.message)
    return res.status(500).json({ success: false, message: 'Failed to update delivery status.' })
  }
}
