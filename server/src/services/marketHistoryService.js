/**
 * marketHistoryService.js
 *
 * Fetches historical government mandi price records from data.gov.in,
 * persists them in MongoDB via the MarketPrice model, and serves them
 * for frontend display and future AI prediction.
 *
 * DATA NOTE:
 *   data.gov.in publishes daily commodity prices — NOT real-time.
 *   Always label data as "Government mandi data" or "Historical mandi data".
 *   Never claim real-time accuracy.
 *
 * SECURITY:
 *   DATA_GOV_API_KEY is read only from process.env.
 *   It is never logged, never returned to the frontend, never stored in DB.
 */

import MarketPrice from '../models/MarketPrice.js'
import { normaliseCropName } from './mandiPriceService.js'

// Read at call time in each function so env changes (e.g. in tests) are always picked up.
// Module-level constant kept only for the safe default — real env value checked per-call.
const DEFAULT_RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070'

// Sentinel date used when arrivalDate is missing — keeps unique index deterministic
const MISSING_DATE_SENTINEL = new Date('1970-01-01T00:00:00.000Z')

// ── Field-safe accessor (local copy — keeps this service self-contained) ───────
function safeGet(record, key) {
  if (!record || typeof record !== 'object') return ''
  if (record[key] !== undefined) return String(record[key] ?? '').trim()
  const lowerKey = key.toLowerCase()
  for (const k of Object.keys(record)) {
    if (k.toLowerCase() === lowerKey) return String(record[k] ?? '').trim()
  }
  return ''
}

// ── Parse a price field safely ─────────────────────────────────────────────────
function safePrice(val) {
  const n = Number(val)
  return Number.isFinite(n) && n >= 0 ? n : 0
}

// ── Parse arrival date safely ──────────────────────────────────────────────────
function parseArrivalDate(raw) {
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Normalise a raw data.gov.in record into our MarketPrice document shape.
 * Returns null if the record is too malformed to be useful (missing commodity).
 * @param {object} raw
 * @returns {object|null}
 */
function normaliseToDocument(raw) {
  const commodity = safeGet(raw, 'commodity') || safeGet(raw, 'Commodity')
  if (!commodity) return null   // skip records with no commodity

  const variety  = safeGet(raw, 'variety')  || safeGet(raw, 'Variety')  || ''
  const grade    = safeGet(raw, 'grade')    || safeGet(raw, 'Grade')    || ''
  const market   = safeGet(raw, 'market')   || safeGet(raw, 'Market')   || ''
  const district = safeGet(raw, 'district') || safeGet(raw, 'District') || ''
  const state    = safeGet(raw, 'state')    || safeGet(raw, 'State')    || ''

  const rawDate  = safeGet(raw, 'arrival_date') || safeGet(raw, 'Arrival_Date') || safeGet(raw, 'date') || ''
  const arrivalDate = parseArrivalDate(rawDate)

  const minPrice   = safePrice(safeGet(raw, 'min_price')   || safeGet(raw, 'min price'))
  const maxPrice   = safePrice(safeGet(raw, 'max_price')   || safeGet(raw, 'max price'))
  const modalPrice = safePrice(safeGet(raw, 'modal_price') || safeGet(raw, 'modal price'))

  return {
    commodity,
    commodityNormalized: normaliseCropName(commodity).toLowerCase(),
    variety,
    grade,
    state,
    district,
    market,
    // Use sentinel for missing dates so unique index works consistently
    arrivalDate: arrivalDate ?? MISSING_DATE_SENTINEL,
    minPrice,
    maxPrice,
    modalPrice,
    source: 'data.gov.in',
    sourceResourceId: process.env.DATA_GOV_RESOURCE_ID || DEFAULT_RESOURCE_ID,
    fetchedAt: new Date(),
  }
}

// ── Fetch from data.gov.in ─────────────────────────────────────────────────────

/**
 * Fetch raw records from data.gov.in for a given set of filters.
 * Returns an array of raw records, or [] on failure.
 * Never throws — always resolves.
 *
 * @param {object} opts
 * @param {string} [opts.commodity]
 * @param {string} [opts.state]
 * @param {string} [opts.district]
 * @param {string} [opts.market]
 * @param {number} [opts.limit]
 * @returns {Promise<object[]>}
 */
async function fetchRawFromGovApi(opts = {}) {
  const apiKey = process.env.DATA_GOV_API_KEY
  if (!apiKey) return []

  const {
    commodity = '',
    state = '',
    district = '',
    market = '',
    limit = 100,
  } = opts

  const normalisedCommodity = normaliseCropName(commodity)

  const params = new URLSearchParams()
  params.set('api-key', apiKey)
  params.set('format', 'json')
  params.set('limit', String(Math.min(Number(limit) || 100, 500)))

  const filters = []
  if (normalisedCommodity) filters.push(`commodity:${normalisedCommodity}`)
  if (state)               filters.push(`state:${state}`)
  if (district)            filters.push(`district:${district}`)
  if (market)              filters.push(`market:${market}`)
  if (filters.length > 0)  params.set('filters[field]', filters.join(','))

  const resourceId = process.env.DATA_GOV_RESOURCE_ID || DEFAULT_RESOURCE_ID
  const url = `https://api.data.gov.in/resource/${resourceId}?${params.toString()}`

  try {
    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), 12_000)
    const response   = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      console.error(`marketHistoryService: data.gov.in HTTP ${response.status}`)
      return []
    }

    const json = await response.json()
    const records = json?.records ?? json?.data ?? []
    return Array.isArray(records) ? records : []

  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'unknown')
    console.error(`marketHistoryService: fetchRawFromGovApi failed (${reason})`)
    return []
  }
}

// ── Upsert records into MongoDB ────────────────────────────────────────────────

/**
 * Fetch historical price records from data.gov.in and upsert them into MongoDB.
 * Skips malformed records individually — never crashes on bad data.
 *
 * Duplicate protection: uses findOneAndUpdate with upsert:true keyed on the
 * unique compound index fields. Repeated calls are safe — existing records
 * are updated (prices refreshed), not duplicated.
 *
 * @param {object} opts - same filters as fetchRawFromGovApi
 * @returns {Promise<{ fetched: number, upserted: number, skipped: number }>}
 */
export async function fetchAndStoreHistory(opts = {}) {
  const rawRecords = await fetchRawFromGovApi(opts)

  let upserted = 0
  let skipped  = 0

  for (const raw of rawRecords) {
    try {
      const doc = normaliseToDocument(raw)
      if (!doc) { skipped++; continue }

      // Unique key for upsert — matches the unique index
      const filter = {
        commodityNormalized: doc.commodityNormalized,
        state:     doc.state,
        district:  doc.district,
        market:    doc.market,
        variety:   doc.variety,
        grade:     doc.grade,
        arrivalDate: doc.arrivalDate,
      }

      await MarketPrice.findOneAndUpdate(
        filter,
        { $set: doc },
        { upsert: true, new: false }
      )

      upserted++
    } catch (err) {
      // E11000 duplicate key is safe to ignore — record already exists
      if (err?.code !== 11000) {
        console.error('marketHistoryService: upsert error on record:', err?.message)
      }
      skipped++
    }
  }

  return { fetched: rawRecords.length, upserted, skipped }
}

// ── Query stored history from MongoDB ─────────────────────────────────────────

/**
 * Query persisted historical mandi price records from MongoDB.
 *
 * @param {object} opts
 * @param {string} [opts.commodity]      - commodity name (normalised internally)
 * @param {string} [opts.state]
 * @param {string} [opts.district]
 * @param {string} [opts.market]
 * @param {Date|string} [opts.from]      - start date (inclusive)
 * @param {Date|string} [opts.to]        - end date (inclusive)
 * @param {number} [opts.limit]          - max records (default 50)
 * @returns {Promise<object[]>}          - array of plain record objects
 */
export async function queryHistory(opts = {}) {
  const {
    commodity = '',
    state = '',
    district = '',
    market = '',
    from,
    to,
    limit = 50,
  } = opts

  const query = {}

  if (commodity) {
    query.commodityNormalized = normaliseCropName(commodity).toLowerCase()
  }
  if (state)    query.state    = { $regex: new RegExp(`^${escapeRegex(state)}$`,    'i') }
  if (district) query.district = { $regex: new RegExp(`^${escapeRegex(district)}$`, 'i') }
  if (market)   query.market   = { $regex: new RegExp(`^${escapeRegex(market)}$`,   'i') }

  // Date range filter — exclude sentinel dates from results
  const dateFilter = {}
  if (from) {
    const d = new Date(from)
    if (!isNaN(d.getTime())) dateFilter.$gte = d
  }
  if (to) {
    const d = new Date(to)
    if (!isNaN(d.getTime())) dateFilter.$lte = d
  }
  // Always exclude sentinel "missing date" records from history results
  if (Object.keys(dateFilter).length > 0) {
    query.arrivalDate = dateFilter
  } else {
    query.arrivalDate = { $gt: MISSING_DATE_SENTINEL }
  }

  const records = await MarketPrice
    .find(query)
    .sort({ arrivalDate: -1, commodity: 1 })
    .limit(Math.min(Number(limit) || 50, 200))
    .lean()

  return records
}

// ── Escape a string for use in a RegExp ───────────────────────────────────────
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
