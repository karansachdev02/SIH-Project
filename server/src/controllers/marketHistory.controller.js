import { fetchAndStoreHistory, queryHistory } from '../services/marketHistoryService.js'

const MAX_LIMIT = 200

/**
 * @desc    Get historical government mandi price records
 * @route   GET /api/market/history
 * @access  Public — no authentication required
 *
 * Query params (all optional):
 *   commodity  {string}  — crop/commodity name
 *   state      {string}  — Indian state name
 *   district   {string}  — district name
 *   market     {string}  — specific mandi/market name
 *   from       {string}  — ISO date, e.g. 2025-01-01
 *   to         {string}  — ISO date, e.g. 2025-12-31
 *   limit      {number}  — max records (1–200, default 50)
 *   refresh    {string}  — if '1' or 'true', fetch fresh data from gov API first
 *
 * Success response:
 *   { success: true, source: 'government', count: N, prices: [...] }
 *
 * Empty response:
 *   { success: true, source: 'government', count: 0, prices: [],
 *     message: 'No historical data found...' }
 */
export const getMarketHistory = async (req, res) => {
  try {
    const sanitise = (val) =>
      typeof val === 'string' ? val.trim().slice(0, 100) : ''

    const commodity = sanitise(req.query.commodity)
    const state     = sanitise(req.query.state)
    const district  = sanitise(req.query.district)
    const market    = sanitise(req.query.market)
    const from      = sanitise(req.query.from)
    const to        = sanitise(req.query.to)

    const rawLimit = parseInt(req.query.limit, 10)
    const limit    = Number.isFinite(rawLimit)
      ? Math.max(1, Math.min(rawLimit, MAX_LIMIT))
      : 50

    // Optional: refresh flag tells us to pull fresh data from gov API before query
    const refresh = req.query.refresh === '1' || req.query.refresh === 'true'

    // Validate date params — reject obviously bad values
    if (from && isNaN(new Date(from).getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid "from" date. Use ISO format, e.g. 2025-01-01.',
      })
    }
    if (to && isNaN(new Date(to).getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid "to" date. Use ISO format, e.g. 2025-12-31.',
      })
    }

    // ── Optionally refresh from gov API ──────────────────────────────────────
    let refreshResult = null
    if (refresh) {
      refreshResult = await fetchAndStoreHistory({ commodity, state, district, market, limit: 100 })
    }

    // ── Query from MongoDB ────────────────────────────────────────────────────
    const records = await queryHistory({ commodity, state, district, market, from, to, limit })

    // Format records for frontend consumption — expose only clean fields
    const prices = records.map((r) => ({
      commodity:    r.commodity,
      variety:      r.variety    || '',
      grade:        r.grade      || '',
      market:       r.market     || '',
      district:     r.district   || '',
      state:        r.state      || '',
      arrivalDate:  r.arrivalDate ? r.arrivalDate.toISOString().slice(0, 10) : null,
      minPrice:     r.minPrice   ?? 0,
      maxPrice:     r.maxPrice   ?? 0,
      modalPrice:   r.modalPrice ?? 0,
      fetchedAt:    r.fetchedAt  ? r.fetchedAt.toISOString() : null,
    }))

    const response = {
      success: true,
      source:  'government',
      dataType: 'historical',
      note: 'Government mandi data — daily prices. Not real-time.',
      count: prices.length,
      prices,
    }

    if (prices.length === 0) {
      response.message = 'No historical data found for the given filters. Try fetching with ?refresh=1 to pull latest government data.'
    }

    if (refreshResult) {
      response.refreshed = refreshResult
    }

    return res.status(200).json(response)

  } catch (error) {
    console.error('getMarketHistory controller error:', error?.message)
    return res.status(500).json({
      success: false,
      message: 'Historical market data service encountered an error. Please try again.',
    })
  }
}
