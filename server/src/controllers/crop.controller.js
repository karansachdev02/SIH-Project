import mongoose from 'mongoose'
import Crop from '../models/Crop.js'
import Booking from '../models/Booking.js'

// ── Helper: validate a MongoDB ObjectId string ────────────────────────────────
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

const ALLOWED_STATUSES = ['available', 'sold', 'inactive']

/**
 * @desc    Get all crops for the authenticated farmer
 * @route   GET /api/farmer/crops
 * @access  Private (farmer only)
 */
export const getMyCrops = async (req, res) => {
  try {
    // Derive farmer identity exclusively from authenticated JWT — never from request body/params
    const farmerId = req.user._id

    const crops = await Crop.find({ farmer: farmerId }).sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      count: crops.length,
      crops,
    })
  } catch (error) {
    console.error('getMyCrops error:', error)
    return res.status(500).json({
      success: false,
      message: 'सर्वर त्रुटि: फसल सूची प्राप्त करने में विफल / Server error: Failed to fetch crops',
    })
  }
}

/**
 * @desc    Add a new crop listing for the authenticated farmer
 * @route   POST /api/farmer/crops
 * @access  Private (farmer only)
 */
export const createCrop = async (req, res) => {
  try {
    // Derive farmer identity exclusively from authenticated JWT
    const farmerId = req.user._id

    const {
      cropName,
      cropType,
      quantity,
      quantityUnit,
      expectedPrice,
      location,
      description,
      harvestDate,
    } = req.body

    // Required field validation
    if (!cropName || cropName.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'फसल का नाम आवश्यक है / Crop name is required',
      })
    }

    if (quantity === undefined || quantity === null || quantity === '') {
      return res.status(400).json({
        success: false,
        message: 'मात्रा आवश्यक है / Quantity is required',
      })
    }

    const parsedQuantity = Number(quantity)
    if (isNaN(parsedQuantity) || parsedQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'मात्रा एक मान्य गैर-ऋणात्मक संख्या होनी चाहिए / Quantity must be a valid non-negative number',
      })
    }

    // Build crop data — farmer id always from req.user, never from body
    const cropData = {
      farmer: farmerId,
      cropName: cropName.trim(),
      cropType: cropType?.trim() || '',
      quantity: parsedQuantity,
      quantityUnit: quantityUnit?.trim() || 'quintal',
      location: location?.trim() || '',
      description: description?.trim() || '',
    }

    // Optional numeric field
    if (expectedPrice !== undefined && expectedPrice !== null && expectedPrice !== '') {
      const parsedPrice = Number(expectedPrice)
      if (!isNaN(parsedPrice) && parsedPrice >= 0) {
        cropData.expectedPrice = parsedPrice
      }
    }

    // Optional date field
    if (harvestDate) {
      const parsedDate = new Date(harvestDate)
      if (!isNaN(parsedDate.getTime())) {
        cropData.harvestDate = parsedDate
      }
    }

    const crop = await Crop.create(cropData)

    return res.status(201).json({
      success: true,
      message: 'फसल सफलतापूर्वक जोड़ी गई / Crop added successfully',
      crop,
    })
  } catch (error) {
    console.error('createCrop error:', error)
    return res.status(500).json({
      success: false,
      message: 'सर्वर त्रुटि: फसल जोड़ने में विफल / Server error: Failed to create crop',
    })
  }
}

/**
 * @desc    Update a farmer's own crop (all editable fields)
 * @route   PATCH /api/farmer/crops/:id
 * @access  Private (farmer only — must own the crop)
 */
export const updateCrop = async (req, res) => {
  try {
    const farmerId = req.user._id
    const { id } = req.params

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid crop ID.',
      })
    }

    // Find crop — enforces ownership in a single query
    const crop = await Crop.findOne({ _id: id, farmer: farmerId })

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop not found or you are not authorized to modify it.',
      })
    }

    // Build update object — only allow UPDATABLE_FIELDS; ignore everything else
    const updates = {}

    if (req.body.cropName !== undefined) {
      const val = String(req.body.cropName).trim()
      if (!val) {
        return res.status(400).json({ success: false, message: 'Crop name is required.' })
      }
      updates.cropName = val
    }

    if (req.body.cropType !== undefined) {
      updates.cropType = String(req.body.cropType).trim()
    }

    if (req.body.quantity !== undefined) {
      const qty = Number(req.body.quantity)
      if (!Number.isFinite(qty) || qty <= 0) {
        return res.status(400).json({ success: false, message: 'Quantity must be a positive number.' })
      }
      updates.quantity = qty
    }

    if (req.body.quantityUnit !== undefined) {
      const val = String(req.body.quantityUnit).trim()
      if (val) updates.quantityUnit = val
    }

    if (req.body.expectedPrice !== undefined && req.body.expectedPrice !== null && req.body.expectedPrice !== '') {
      const price = Number(req.body.expectedPrice)
      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({ success: false, message: 'Expected price must be a non-negative number.' })
      }
      updates.expectedPrice = price
    } else if (req.body.expectedPrice === null || req.body.expectedPrice === '') {
      updates.expectedPrice = null
    }

    if (req.body.location !== undefined) {
      updates.location = String(req.body.location).trim()
    }

    if (req.body.description !== undefined) {
      updates.description = String(req.body.description).trim()
    }

    if (req.body.harvestDate !== undefined) {
      if (req.body.harvestDate === null || req.body.harvestDate === '') {
        updates.harvestDate = null
      } else {
        const d = new Date(req.body.harvestDate)
        if (isNaN(d.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid harvest date.' })
        }
        updates.harvestDate = d
      }
    }

    if (req.body.status !== undefined) {
      if (!ALLOWED_STATUSES.includes(req.body.status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}.`,
        })
      }
      updates.status = req.body.status
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided for update.' })
    }

    // Apply updates using the safe updates object
    Object.assign(crop, updates)
    await crop.save()

    return res.status(200).json({
      success: true,
      message: 'Crop updated successfully.',
      crop,
    })
  } catch (error) {
    console.error('updateCrop error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error: Failed to update crop.',
    })
  }
}

/**
 * @desc    Delete a farmer's own crop (with booking safety check)
 * @route   DELETE /api/farmer/crops/:id
 * @access  Private (farmer only — must own the crop)
 */
export const deleteCrop = async (req, res) => {
  try {
    const farmerId = req.user._id
    const { id } = req.params

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid crop ID.',
      })
    }

    // Find crop scoped to this farmer
    const crop = await Crop.findOne({ _id: id, farmer: farmerId })

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'Crop not found or you are not authorized to delete it.',
      })
    }

    // Check for active bookings (pending or confirmed) — prevent unsafe deletion
    const activeBookingCount = await Booking.countDocuments({
      crop: crop._id,
      status: { $in: ['pending', 'confirmed'] },
    })

    if (activeBookingCount > 0) {
      return res.status(409).json({
        success: false,
        message: `This crop cannot be deleted because it has ${activeBookingCount} active booking${activeBookingCount > 1 ? 's' : ''}. Please resolve all active bookings first.`,
      })
    }

    await crop.deleteOne()

    return res.status(200).json({
      success: true,
      message: 'Crop deleted successfully.',
    })
  } catch (error) {
    console.error('deleteCrop error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error: Failed to delete crop.',
    })
  }
}

/**
 * @desc    Update the status of a farmer's own crop
 * @route   PATCH /api/farmer/crops/:id/status
 * @access  Private (farmer only — must own the crop)
 */
export const updateCropStatus = async (req, res) => {
  try {
    const farmerId = req.user._id
    const { id } = req.params
    const { status } = req.body

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `स्थिति अमान्य है। allowed: ${ALLOWED_STATUSES.join(', ')} / Invalid status. Allowed: ${ALLOWED_STATUSES.join(', ')}`,
      })
    }

    // Find crop and verify ownership — farmer can only update their own crop
    const crop = await Crop.findOne({ _id: id, farmer: farmerId })

    if (!crop) {
      return res.status(404).json({
        success: false,
        message: 'फसल नहीं मिली या आप इसे संशोधित करने के अधिकृत नहीं हैं / Crop not found or you are not authorized to modify it',
      })
    }

    crop.status = status
    await crop.save()

    return res.status(200).json({
      success: true,
      message: 'फसल की स्थिति अपडेट की गई / Crop status updated successfully',
      crop,
    })
  } catch (error) {
    console.error('updateCropStatus error:', error)
    return res.status(500).json({
      success: false,
      message: 'सर्वर त्रुटि: फसल स्थिति अपडेट विफल / Server error: Failed to update crop status',
    })
  }
}
