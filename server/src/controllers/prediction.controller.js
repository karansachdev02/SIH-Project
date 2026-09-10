import { predictPrice }       from '../services/predictionService.js'
import { buildFeatureVectors } from '../services/featureService.js'
import { normaliseCropName }   from '../services/mandiPriceService.js'

// ── Input sanitisers ──────────────────────────────────────────────────────────

function sanitiseString(val, maxLen = 100) {
  if (typeof val !== 'string') return ''
  return val.trim().slice(0, maxLen)
}

function sanitiseInt(val, allowed, defaultVal) {
  const n = parseInt(val, 10)
  return allowed.includes(n) ? n : defaultVal
}

function sanitiseCoord(val) {
  const n = parseFloat(val)
  return Number.isFinite(n) ? n : undefined
}

function sanitiseLookback(val) {
  const n = parseInt(val, 10)
  if (!Number.isFinite(n)) return 90
  return Math.min(Math.max(n, 30), 365)
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Predict price for a commodity
 * @route   GET /api/prediction/price?commodity=Wheat&state=Madhya Pradesh&horizon=7
 * @access  Private (farmer authenticated)
 *
 * Query parameters:
 *   commodity  {string}  required
 *   state      {string}  optional
 *   district   {string}  optional
 *   latitude   {number}  optional — enables weather-joined features
 *   longitude  {number}  optional
 *   horizon    {number}  1 | 7 | 14 | 30  (days ahead; default 7)
 *   lookback   {number}  30–365  (days of history; default 90)
 */
export const getPricePrediction = async (req, res) => {
  try {
    const commodity = sanitiseString(req.query.commodity, 100)
    if (!commodity) {
      return res.status(400).json({
        success: false,
        message: 'commodity query parameter is required',
      })
    }

    const state    = sanitiseString(req.query.state,    100)
    const district = sanitiseString(req.query.district, 100)
    const lat      = sanitiseCoord(req.query.latitude)
    const lon      = sanitiseCoord(req.query.longitude)
    const horizon  = sanitiseInt(req.query.horizon,  [1, 7, 14, 30], 7)
    const lookback = sanitiseLookback(req.query.lookback)

    const result = await predictPrice({
      commodity,
      state,
      district,
      latitude:  lat,
      longitude: lon,
      horizon,
      lookback,
    })

    return res.status(200).json({
      success: true,
      ...result,
    })

  } catch (err) {
    console.error('getPricePrediction error:', err?.message)
    return res.status(500).json({
      success: false,
      message: 'Price prediction service temporarily unavailable. Please try again.',
    })
  }
}

/**
 * @desc    Get feature vectors (joined price + weather data)
 * @route   GET /api/prediction/features?commodity=Wheat&state=MP&from=2024-01-01&to=2024-12-31
 * @access  Private (farmer authenticated)
 *
 * Useful for developers / advanced users to inspect the raw joined data.
 */
export const getFeatureVectors = async (req, res) => {
  try {
    const commodity = sanitiseString(req.query.commodity, 100)
    if (!commodity) {
      return res.status(400).json({
        success: false,
        message: 'commodity query parameter is required',
      })
    }

    const state    = sanitiseString(req.query.state,    100)
    const district = sanitiseString(req.query.district, 100)
    const from     = sanitiseString(req.query.from,      10)
    const to       = sanitiseString(req.query.to,        10)
    const lat      = sanitiseCoord(req.query.latitude)
    const lon      = sanitiseCoord(req.query.longitude)
    const limit    = Math.min(Math.max(parseInt(req.query.limit, 10) || 90, 1), 365)

    const result = await buildFeatureVectors({
      commodity,
      state,
      district,
      from:      from || undefined,
      to:        to   || undefined,
      latitude:  lat,
      longitude: lon,
      limit,
    })

    return res.status(200).json({
      success: true,
      commodityNormalized: normaliseCropName(commodity),
      ...result,
    })

  } catch (err) {
    console.error('getFeatureVectors error:', err?.message)
    return res.status(500).json({
      success: false,
      message: 'Feature vector service temporarily unavailable. Please try again.',
    })
  }
}
