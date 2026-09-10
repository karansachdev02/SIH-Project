/**
 * featureService.js
 *
 * Builds ML feature vectors by joining:
 *   - Historical mandi price records (MarketPrice model)
 *   - Historical weather records (WeatherData model)
 *
 * Produces a per-date feature row suitable for:
 *   - Statistical price analysis (moving averages, seasonal trends)
 *   - Future ML model training / inference
 *   - Gemini API context injection
 *
 * DESIGN PRINCIPLES:
 *   - Never crashes — returns empty arrays on data shortage
 *   - All joins by date string (YYYY-MM-DD) for simplicity
 *   - Weather joined by nearest available coordinate if exact match absent
 *   - Exported functions are the only public API
 */

import MarketPrice from '../models/MarketPrice.js'
import WeatherData from '../models/WeatherData.js'
import { normaliseCropName } from './mandiPriceService.js'

// ── Constants ─────────────────────────────────────────────────────────────────

// Maximum feature rows returned in one call
const MAX_ROWS = 365

// ── Date helpers ──────────────────────────────────────────────────────────────

function toDateStr(d) {
  if (!d) return null
  const dt = d instanceof Date ? d : new Date(d)
  if (isNaN(dt.getTime())) return null
  return dt.toISOString().slice(0, 10)
}

function dateRangeFilter(from, to) {
  const filter = {}
  if (from) {
    const d = new Date(from)
    if (!isNaN(d.getTime())) filter.$gte = d
  }
  if (to) {
    const d = new Date(to + 'T23:59:59.999Z')
    if (!isNaN(d.getTime())) filter.$lte = d
  }
  return Object.keys(filter).length > 0 ? filter : null
}

// ── Price history query ────────────────────────────────────────────────────────

/**
 * Fetch and group mandi price records by date.
 * Each date entry may aggregate multiple market/variety records (take average).
 *
 * @param {object} opts
 * @param {string} opts.commodity
 * @param {string} [opts.state]
 * @param {string} [opts.district]
 * @param {string} [opts.from]   YYYY-MM-DD
 * @param {string} [opts.to]     YYYY-MM-DD
 * @param {number} [opts.limit]
 * @returns {Promise<Map<string, { minPrice, maxPrice, modalPrice, count }>>}
 */
async function fetchPricesByDate(opts) {
  const { commodity, state = '', district = '', from, to, limit = MAX_ROWS } = opts

  if (!commodity) return new Map()

  const query = {
    commodityNormalized: normaliseCropName(commodity).toLowerCase(),
  }
  if (state)    query.state    = { $regex: new RegExp(`^${state}$`,    'i') }
  if (district) query.district = { $regex: new RegExp(`^${district}$`, 'i') }

  // Exclude sentinel "missing date" records
  const SENTINEL = new Date('1970-01-01T00:00:00.000Z')
  const df = dateRangeFilter(from, to)
  if (df) {
    query.arrivalDate = { ...df, $gt: SENTINEL }
  } else {
    query.arrivalDate = { $gt: SENTINEL }
  }

  const records = await MarketPrice
    .find(query)
    .sort({ arrivalDate: -1 })
    .limit(Math.min(limit * 3, 1000))   // over-fetch to allow per-date aggregation
    .lean()

  // Group by date string
  const byDate = new Map()
  for (const r of records) {
    const dateStr = toDateStr(r.arrivalDate)
    if (!dateStr) continue
    if (!byDate.has(dateStr)) {
      byDate.set(dateStr, { minSum: 0, maxSum: 0, modalSum: 0, count: 0 })
    }
    const entry = byDate.get(dateStr)
    entry.minSum   += r.minPrice   ?? 0
    entry.maxSum   += r.maxPrice   ?? 0
    entry.modalSum += r.modalPrice ?? 0
    entry.count    += 1
  }

  // Normalise to averages
  const result = new Map()
  for (const [dateStr, e] of byDate.entries()) {
    result.set(dateStr, {
      minPrice:   Math.round(e.minSum   / e.count),
      maxPrice:   Math.round(e.maxSum   / e.count),
      modalPrice: Math.round(e.modalSum / e.count),
      count: e.count,
    })
  }

  return result
}

// ── Weather query ─────────────────────────────────────────────────────────────

/**
 * Fetch stored weather records by date range, indexed by date string.
 * If no exact coordinate match, the query returns all stored records
 * (the caller passes lat/lon only as an optional filter hint).
 *
 * @param {object} opts
 * @param {number} [opts.latitude]
 * @param {number} [opts.longitude]
 * @param {string} [opts.from]
 * @param {string} [opts.to]
 * @returns {Promise<Map<string, object>>}  date → weather record
 */
async function fetchWeatherByDate(opts) {
  const { latitude, longitude, from, to } = opts

  const query = {}

  // Coordinate filter: round to 4dp for consistency
  if (latitude !== undefined && longitude !== undefined) {
    const la = Math.round(Number(latitude)  * 10000) / 10000
    const lo = Math.round(Number(longitude) * 10000) / 10000
    if (Number.isFinite(la) && Number.isFinite(lo)) {
      query.latitude  = la
      query.longitude = lo
    }
  }

  const df = dateRangeFilter(from, to)
  if (df) query.date = df

  const records = await WeatherData
    .find(query)
    .sort({ date: -1 })
    .limit(MAX_ROWS)
    .lean()

  const byDate = new Map()
  for (const r of records) {
    const dateStr = toDateStr(r.date)
    if (dateStr && !byDate.has(dateStr)) {
      byDate.set(dateStr, r)
    }
  }
  return byDate
}

// ── Moving average helper ──────────────────────────────────────────────────────

/**
 * Compute a simple N-day moving average over an array of values.
 * Input: array of { date, value } sorted ascending.
 * Returns: array of { date, ma } with nulls where window is incomplete.
 */
function movingAverage(series, window = 7) {
  return series.map((pt, idx) => {
    if (idx < window - 1) return { date: pt.date, ma: null }
    const slice = series.slice(idx - window + 1, idx + 1)
    const valid  = slice.filter((p) => p.value !== null && p.value !== undefined)
    if (valid.length === 0) return { date: pt.date, ma: null }
    const avg = valid.reduce((s, p) => s + p.value, 0) / valid.length
    return { date: pt.date, ma: Math.round(avg) }
  })
}

// ── Main export: feature vector builder ──────────────────────────────────────

/**
 * Build joined feature vectors for a commodity + location + date range.
 *
 * Each row in the returned array represents one calendar day and contains:
 *   date, modalPrice, minPrice, maxPrice (from mandi),
 *   temperatureMean, precipitation, humidityMean, windSpeedMean (from weather),
 *   plus derived fields: priceMA7, priceMA30
 *
 * Rows without price data are excluded.
 * Weather fields default to null where no matching record exists.
 *
 * @param {object} opts
 * @param {string} opts.commodity
 * @param {string} [opts.state]
 * @param {string} [opts.district]
 * @param {string} [opts.from]       YYYY-MM-DD
 * @param {string} [opts.to]         YYYY-MM-DD
 * @param {number} [opts.latitude]   for weather join
 * @param {number} [opts.longitude]  for weather join
 * @param {number} [opts.limit]
 * @returns {Promise<{
 *   commodity: string,
 *   rows: object[],
 *   summary: object,
 *   hasWeather: boolean,
 *   priceCount: number,
 *   weatherCount: number
 * }>}
 */
export async function buildFeatureVectors(opts = {}) {
  const {
    commodity = '',
    state = '',
    district = '',
    from,
    to,
    latitude,
    longitude,
    limit = MAX_ROWS,
  } = opts

  if (!commodity) {
    return { commodity: '', rows: [], summary: null, hasWeather: false, priceCount: 0, weatherCount: 0 }
  }

  // ── Fetch both data sources in parallel ──────────────────────────────────────
  const [priceByDate, weatherByDate] = await Promise.all([
    fetchPricesByDate({ commodity, state, district, from, to, limit }),
    fetchWeatherByDate({ latitude, longitude, from, to }),
  ])

  if (priceByDate.size === 0) {
    return {
      commodity,
      rows: [],
      summary: null,
      hasWeather: weatherByDate.size > 0,
      priceCount: 0,
      weatherCount: weatherByDate.size,
    }
  }

  // ── Join on date ──────────────────────────────────────────────────────────────
  const sortedDates = Array.from(priceByDate.keys()).sort()   // ascending

  const rows = sortedDates.map((dateStr) => {
    const price   = priceByDate.get(dateStr)
    const weather = weatherByDate.get(dateStr) ?? null

    return {
      date:           dateStr,
      modalPrice:     price.modalPrice,
      minPrice:       price.minPrice,
      maxPrice:       price.maxPrice,
      priceRecords:   price.count,
      // Weather (null if no matching record)
      temperatureMax:  weather?.temperatureMax  ?? null,
      temperatureMin:  weather?.temperatureMin  ?? null,
      temperatureMean: weather?.temperatureMean ?? null,
      precipitation:   weather?.precipitation   ?? null,
      humidityMean:    weather?.humidityMean     ?? null,
      windSpeedMean:   weather?.windSpeedMean    ?? null,
      weatherCode:     weather?.weatherCode      ?? null,
    }
  })

  // ── Compute moving averages (MA7, MA30) ───────────────────────────────────────
  const priceSeries = rows.map((r) => ({ date: r.date, value: r.modalPrice }))
  const ma7  = movingAverage(priceSeries,  7)
  const ma30 = movingAverage(priceSeries, 30)

  for (let i = 0; i < rows.length; i++) {
    rows[i].priceMA7  = ma7[i].ma
    rows[i].priceMA30 = ma30[i].ma
  }

  // ── Summary statistics ────────────────────────────────────────────────────────
  const modalPrices = rows.map((r) => r.modalPrice).filter((v) => v !== null)
  const weatherRows = rows.filter((r) => r.temperatureMean !== null)

  let summary = null
  if (modalPrices.length > 0) {
    const sorted = [...modalPrices].sort((a, b) => a - b)
    const avg    = Math.round(modalPrices.reduce((s, v) => s + v, 0) / modalPrices.length)
    const latest = rows[rows.length - 1]?.modalPrice ?? null
    const oldest = rows[0]?.modalPrice ?? null

    // Simple trend: compare latest to 30-day-ago price
    const trendRow  = rows.length >= 30 ? rows[rows.length - 30] : rows[0]
    const trendBase = trendRow?.modalPrice ?? null
    const trendPct  = (trendBase && latest)
      ? Math.round(((latest - trendBase) / trendBase) * 1000) / 10
      : null

    // Seasonal min/max within range
    const minP = sorted[0]
    const maxP = sorted[sorted.length - 1]

    summary = {
      commodity,
      from:          rows[0]?.date ?? null,
      to:            rows[rows.length - 1]?.date ?? null,
      days:          rows.length,
      avgModalPrice: avg,
      minPrice:      minP,
      maxPrice:      maxP,
      latestPrice:   latest,
      priceTrend30d: trendPct,   // percent change over 30 days; positive = rising
      // Latest moving averages
      latestMA7:  rows[rows.length - 1]?.priceMA7  ?? null,
      latestMA30: rows[rows.length - 1]?.priceMA30 ?? null,
    }
  }

  return {
    commodity,
    rows: rows.slice(-limit),     // return most recent `limit` rows
    summary,
    hasWeather:   weatherByDate.size > 0,
    priceCount:   rows.length,
    weatherCount: weatherRows.length,
  }
}

// ── Recent stats for prediction context ──────────────────────────────────────

/**
 * Return a compact summary of the last N days of feature data.
 * Used as context for the prediction engine.
 *
 * @param {object} opts  same as buildFeatureVectors
 * @param {number} [opts.days]  lookback window (default 90)
 * @returns {Promise<object>}
 */
export async function getRecentStats(opts = {}) {
  const { days = 90, ...rest } = opts

  // Compute `from` as today - days
  const toDate   = new Date()
  const fromDate = new Date(toDate - days * 24 * 60 * 60 * 1000)
  const from = fromDate.toISOString().slice(0, 10)
  const to   = toDate.toISOString().slice(0, 10)

  return buildFeatureVectors({ ...rest, from, to, limit: days })
}
