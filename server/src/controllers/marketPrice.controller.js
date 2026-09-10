import { fetchMandiPrices } from '../services/mandiPriceService.js'

// Maximum number of records the frontend can request in a single call
const MAX_LIMIT = 50

/**
 * @desc    Get commodity market prices (proxied from data.gov.in)
 * @route   GET /api/market/prices
 * @access  Public — no authentication required
 *
 * Query params (all optional):
 *   commodity  {string}  — crop/commodity name (Hindi or English)
 *   state      {string}  — Indian state name
 *   district   {string}  — district name
 *   market     {string}  — specific mandi/market name
 *   limit      {number}  — max records to return (1–50, default 10)
 *
 * Success response:
 *   { success: true, source: 'data.gov.in', prices: [...] }
 *
 * Fallback response (API unavailable / key missing / no data):
 *   { success: true, source: 'fallback', prices: [...], message: '...' }
 *
 * The API key is never included in any response.
 */
export const getMarketPrices = async (req, res) => {
  try {
    // ── Sanitise query parameters ──────────────────────────────────────────────
    // Only allow safe string values — strip anything that isn't a plain string
    const sanitise = (val) =>
      typeof val === 'string' ? val.trim().slice(0, 100) : ''

    const commodity = sanitise(req.query.commodity)
    const state     = sanitise(req.query.state)
    const district  = sanitise(req.query.district)
    const market    = sanitise(req.query.market)

    // Clamp limit to 1–MAX_LIMIT
    const rawLimit = parseInt(req.query.limit, 10)
    const limit    = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(rawLimit, MAX_LIMIT))
      : 10

    // ── Fetch prices via service (handles cache + fallback internally) ─────────
    const result = await fetchMandiPrices({ commodity, state, district, market, limit })

    // Build response — never include the API key or internal env details
    const response = {
      success: true,
      source:  result.source,
      count:   result.prices.length,
      prices:  result.prices,
    }

    if (result.message) {
      response.message = result.message
    }

    return res.status(200).json(response)

  } catch (error) {
    // fetchMandiPrices itself should never throw, but defend anyway
    console.error('getMarketPrices controller error:', error?.message)
    return res.status(500).json({
      success: false,
      message: 'Market price service encountered an error. Please try again later.',
    })
  }
}
