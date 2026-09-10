import mongoose from 'mongoose'
import Crop   from '../models/Crop.js'
import Review from '../models/Review.js'

// ── Safe farmer fields — the ONLY User fields ever exposed via marketplace ────
// Password is select:false in User model so it never comes through populate.
// We explicitly list only the fields we want even so.
const FARMER_SELECT = 'name village district state verificationStatus createdAt'

/**
 * Aggregate real ratings for a batch of farmerIds.
 * Returns a Map keyed by farmerId string -> { average, count, newSeller }.
 * Uses a single $group aggregation — no N+1 queries.
 *
 * @param {string[]} farmerIds
 * @returns {Promise<Map<string, {average: number|null, count: number, newSeller: boolean}>>}
 */
async function batchFarmerRatings(farmerIds) {
  if (!farmerIds || farmerIds.length === 0) return new Map()

  const agg = await Review.aggregate([
    { $match: { farmer: { $in: farmerIds.map((id) => new mongoose.Types.ObjectId(String(id))) } } },
    {
      $group: {
        _id:     '$farmer',
        total:   { $sum: '$rating' },
        count:   { $sum: 1 },
      },
    },
  ])

  const map = new Map()
  for (const row of agg) {
    const avg = Math.round((row.total / row.count) * 10) / 10
    map.set(String(row._id), { average: avg, count: row.count, newSeller: false })
  }
  return map
}

// ── Shape a single crop document for marketplace response ─────────────────────
function shapeCrop(doc, ratingMap) {
  const farmer  = doc.farmer || {}
  const fid     = String(farmer._id ?? '')
  const ratingData = ratingMap?.get(fid) ?? { average: null, count: 0, newSeller: true }

  return {
    id:           doc._id,
    cropName:     doc.cropName,
    cropType:     doc.cropType  || '',
    quantity:     doc.quantity,
    quantityUnit: doc.quantityUnit,
    expectedPrice: doc.expectedPrice ?? null,
    location:     doc.location   || '',
    description:  doc.description || '',
    harvestDate:  doc.harvestDate ?? null,
    status:       doc.status,
    farmer: {
      id:                 farmer._id  ?? null,
      name:               farmer.name ?? '',
      village:            farmer.village    || '',
      district:           farmer.district   || '',
      state:              farmer.state      || '',
      verificationStatus: farmer.verificationStatus ?? null,
    },
    rating: ratingData,
    createdAt: doc.createdAt,
  }
}

// ── Input sanitisers ──────────────────────────────────────────────────────────

function sanitiseStr(val, maxLen = 100) {
  if (typeof val !== 'string') return ''
  return val.trim().slice(0, maxLen)
}

function sanitisePositiveNum(val) {
  const n = parseFloat(val)
  return Number.isFinite(n) && n >= 0 ? n : null
}

function sanitiseLimit(val) {
  const n = parseInt(val, 10)
  if (!Number.isFinite(n)) return 20
  return Math.min(Math.max(n, 1), 100)
}

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id)
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Browse available crops on the marketplace
 * @route   GET /api/marketplace/crops
 * @access  Public (no authentication required — read-only browse)
 *
 * Query parameters:
 *   cropName  {string}  partial match on cropName
 *   cropType  {string}  partial match on cropType
 *   state     {string}  farmer's state (matched on populated farmer)
 *   district  {string}  farmer's district (matched on populated farmer)
 *   minPrice  {number}  minimum expectedPrice
 *   maxPrice  {number}  maximum expectedPrice
 *   search    {string}  free-text match across cropName, cropType, location
 *   limit     {number}  1–100, default 20
 */
export const getMarketplaceCrops = async (req, res) => {
  try {
    const cropName  = sanitiseStr(req.query.cropName,  100)
    const cropType  = sanitiseStr(req.query.cropType,  100)
    const search    = sanitiseStr(req.query.search,    100)
    const location  = sanitiseStr(req.query.location,  100)
    const minPrice  = sanitisePositiveNum(req.query.minPrice)
    const maxPrice  = sanitisePositiveNum(req.query.maxPrice)
    const limit     = sanitiseLimit(req.query.limit)

    // Only show available crops
    const query = { status: 'available' }

    // cropName filter — case-insensitive partial match
    if (cropName) {
      query.cropName = { $regex: cropName, $options: 'i' }
    }

    // cropType filter
    if (cropType) {
      query.cropType = { $regex: cropType, $options: 'i' }
    }

    // location filter on crop's own location field
    if (location) {
      query.location = { $regex: location, $options: 'i' }
    }

    // Free-text search across cropName, cropType, location
    if (search && !cropName) {
      query.$or = [
        { cropName:  { $regex: search, $options: 'i' } },
        { cropType:  { $regex: search, $options: 'i' } },
        { location:  { $regex: search, $options: 'i' } },
      ]
    }

    // Price range filter
    if (minPrice !== null || maxPrice !== null) {
      query.expectedPrice = {}
      if (minPrice !== null) query.expectedPrice.$gte = minPrice
      if (maxPrice !== null) query.expectedPrice.$lte = maxPrice
    }

    // Fetch with farmer populated — select only safe fields
    let dbQuery = Crop
      .find(query)
      .populate('farmer', FARMER_SELECT)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    const docs = await dbQuery

    // Post-populate filter: state / district filters must match farmer fields
    // (MongoDB can't filter on populated subdoc fields at query time without $lookup)
    const rawState    = sanitiseStr(req.query.state,    100)
    const rawDistrict = sanitiseStr(req.query.district, 100)

    let filtered = docs
    if (rawState) {
      const re = new RegExp(rawState, 'i')
      filtered = filtered.filter((d) => re.test(d.farmer?.state || ''))
    }
    if (rawDistrict) {
      const re = new RegExp(rawDistrict, 'i')
      filtered = filtered.filter((d) => re.test(d.farmer?.district || ''))
    }

    // ── Batch-fetch real farmer ratings (single aggregation, no N+1) ──────────
    const farmerIds = [...new Set(filtered.map((d) => String(d.farmer?._id)).filter(Boolean))]
    const ratingMap = await batchFarmerRatings(farmerIds)

    const crops = filtered.map((d) => shapeCrop(d, ratingMap))

    return res.status(200).json({
      success: true,
      count:   crops.length,
      crops,
    })

  } catch (err) {
    console.error('getMarketplaceCrops error:', err?.message)
    return res.status(500).json({
      success: false,
      message: 'Marketplace service temporarily unavailable. Please try again.',
    })
  }
}

/**
 * @desc    Get a single available crop by ID
 * @route   GET /api/marketplace/crops/:id
 * @access  Public
 */
export const getMarketplaceCropById = async (req, res) => {
  try {
    const { id } = req.params

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid crop ID.',
      })
    }

    const doc = await Crop
      .findOne({ _id: id, status: 'available' })
      .populate('farmer', FARMER_SELECT)
      .lean()

    if (!doc) {
      // Could be: doesn't exist, sold, inactive — don't distinguish for security
      return res.status(404).json({
        success: false,
        message: 'This crop is no longer available or does not exist.',
      })
    }

    // Single-crop rating lookup
    const farmerId = String(doc.farmer?._id ?? '')
    const ratingMap = farmerId ? await batchFarmerRatings([farmerId]) : new Map()

    return res.status(200).json({
      success: true,
      crop: shapeCrop(doc, ratingMap),
    })

  } catch (err) {
    console.error('getMarketplaceCropById error:', err?.message)
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch crop details. Please try again.',
    })
  }
}
