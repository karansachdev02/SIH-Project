/**
 * weatherService.js
 *
 * Fetches weather data from Open-Meteo (https://open-meteo.com).
 *
 * KEY FACTS:
 *   - Open-Meteo is FREE for non-commercial use.
 *   - NO API KEY REQUIRED.
 *   - DO NOT add any WEATHER_API_KEY to .env for this service.
 *   - Data is model-based (ERA5 reanalysis for history, forecast models for current).
 *   - Always label as "Open-Meteo" — not exact ground-truth station data.
 *   - Historical data is available back to 1940.
 *   - All calls are made SERVER-SIDE ONLY.
 *   - React frontend must never call Open-Meteo directly.
 */

import WeatherData from '../models/WeatherData.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const OPEN_METEO_FORECAST_BASE  = 'https://api.open-meteo.com/v1/forecast'
const OPEN_METEO_HISTORY_BASE   = 'https://archive-api.open-meteo.com/v1/archive'

// Daily variables requested for agriculture/ML use
const DAILY_VARS = [
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_sum',
  'rain_sum',
  'relative_humidity_2m_mean',
  'wind_speed_10m_mean',
  'weather_code',
].join(',')

// Request timeout — do not hang the backend on a slow external API
const TIMEOUT_MS = 12_000

// ── Simple in-memory cache for current weather ────────────────────────────────
// Key: "lat,lon"  Value: { data, fetchedAt }
const currentWeatherCache = {}
const CURRENT_CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

// ── Coordinate normalisation ───────────────────────────────────────────────────

/**
 * Round coordinates to 4 decimal places (~11m precision).
 * Used as consistent keys for DB storage and cache.
 */
function roundCoord(n) {
  return Math.round(Number(n) * 10000) / 10000
}

/**
 * Validate latitude and longitude values.
 * Returns null if valid, or an error message string if invalid.
 */
export function validateCoords(lat, lon) {
  const la = Number(lat)
  const lo = Number(lon)
  if (!Number.isFinite(la) || la < -90 || la > 90)  return 'Invalid latitude. Must be between -90 and 90.'
  if (!Number.isFinite(lo) || lo < -180 || lo > 180) return 'Invalid longitude. Must be between -180 and 180.'
  return null
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

async function fetchJson(url) {
  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`)
    return await res.json()
  } catch (err) {
    clearTimeout(timeoutId)
    const reason = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'unknown')
    console.error(`weatherService: fetch failed (${reason}) — ${url.split('?')[0]}`)
    throw err
  }
}

// ── Safe number accessor ──────────────────────────────────────────────────────

function safeNum(val) {
  const n = Number(val)
  return Number.isFinite(n) ? n : null
}

// ── Normalise a single daily record from Open-Meteo ──────────────────────────

function normaliseDailyRecord(date, daily, idx) {
  return {
    date:            date,
    temperatureMax:  safeNum(daily.temperature_2m_max?.[idx]),
    temperatureMin:  safeNum(daily.temperature_2m_min?.[idx]),
    temperatureMean: (() => {
      const mx = safeNum(daily.temperature_2m_max?.[idx])
      const mn = safeNum(daily.temperature_2m_min?.[idx])
      return (mx !== null && mn !== null) ? Math.round(((mx + mn) / 2) * 10) / 10 : null
    })(),
    precipitation:   safeNum(daily.precipitation_sum?.[idx]),
    rain:            safeNum(daily.rain_sum?.[idx]),
    humidityMean:    safeNum(daily.relative_humidity_2m_mean?.[idx]),
    windSpeedMean:   safeNum(daily.wind_speed_10m_mean?.[idx]),
    weatherCode:     safeNum(daily.weather_code?.[idx]),
  }
}

// ── Current weather ───────────────────────────────────────────────────────────

/**
 * Fetch current weather for a coordinate.
 * Uses Open-Meteo forecast API with today's date window.
 * Results are cached per coordinate for 10 minutes.
 *
 * @param {number} lat
 * @param {number} lon
 * @returns {Promise<{ source: string, weather: object }>}
 */
export async function getCurrentWeather(lat, lon) {
  const la = roundCoord(lat)
  const lo = roundCoord(lon)

  const cacheKey = `${la},${lo}`
  const cached   = currentWeatherCache[cacheKey]
  if (cached && Date.now() - cached.fetchedAt < CURRENT_CACHE_TTL_MS) {
    return { source: 'open-meteo', cached: true, weather: cached.data }
  }

  const params = new URLSearchParams({
    latitude:      la,
    longitude:     lo,
    daily:         DAILY_VARS,
    timezone:      'Asia/Kolkata',
    forecast_days: '1',
  })

  const json = await fetchJson(`${OPEN_METEO_FORECAST_BASE}?${params}`)

  const daily = json.daily ?? {}
  const dates  = daily.time ?? []

  if (dates.length === 0) {
    throw new Error('Open-Meteo returned no daily data for current weather')
  }

  const idx = 0
  const weather = {
    date:          dates[idx],
    temperature:   (() => {
      const mx = safeNum(daily.temperature_2m_max?.[idx])
      const mn = safeNum(daily.temperature_2m_min?.[idx])
      return (mx !== null && mn !== null) ? Math.round(((mx + mn) / 2) * 10) / 10 : null
    })(),
    temperatureMax: safeNum(daily.temperature_2m_max?.[idx]),
    temperatureMin: safeNum(daily.temperature_2m_min?.[idx]),
    humidity:       safeNum(daily.relative_humidity_2m_mean?.[idx]),
    precipitation:  safeNum(daily.precipitation_sum?.[idx]),
    rain:           safeNum(daily.rain_sum?.[idx]),
    windSpeed:      safeNum(daily.wind_speed_10m_mean?.[idx]),
    weatherCode:    safeNum(daily.weather_code?.[idx]),
    timezone:       json.timezone ?? 'Asia/Kolkata',
  }

  currentWeatherCache[cacheKey] = { data: weather, fetchedAt: Date.now() }
  return { source: 'open-meteo', cached: false, weather }
}

// ── Historical weather ────────────────────────────────────────────────────────

/**
 * Fetch historical daily weather from Open-Meteo ERA5 archive.
 * Persists records in MongoDB. Skips dates already stored.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {string} from  ISO date string e.g. '2025-01-01'
 * @param {string} to    ISO date string e.g. '2025-12-31'
 * @param {object} [meta]  optional { locationName, state, district }
 * @returns {Promise<{ source: string, dataType: string, count: number, stored: number, weather: object[] }>}
 */
export async function getHistoricalWeather(lat, lon, from, to, meta = {}) {
  const la = roundCoord(lat)
  const lo = roundCoord(lon)

  const params = new URLSearchParams({
    latitude:   la,
    longitude:  lo,
    start_date: from,
    end_date:   to,
    daily:      DAILY_VARS,
    timezone:   'Asia/Kolkata',
  })

  const json = await fetchJson(`${OPEN_METEO_HISTORY_BASE}?${params}`)

  const daily = json.daily ?? {}
  const dates  = daily.time ?? []

  const records = dates.map((date, idx) => normaliseDailyRecord(date, daily, idx))

  // Persist to MongoDB (upsert — safe to call repeatedly)
  let stored = 0
  for (const rec of records) {
    try {
      const dateObj = new Date(rec.date + 'T00:00:00.000Z')
      await WeatherData.findOneAndUpdate(
        { latitude: la, longitude: lo, date: dateObj },
        {
          $set: {
            latitude:       la,
            longitude:      lo,
            date:           dateObj,
            locationName:   meta.locationName || '',
            state:          meta.state        || '',
            district:       meta.district     || '',
            temperatureMax:  rec.temperatureMax,
            temperatureMin:  rec.temperatureMin,
            temperatureMean: rec.temperatureMean,
            precipitation:   rec.precipitation,
            rain:            rec.rain,
            humidityMean:    rec.humidityMean,
            windSpeedMean:   rec.windSpeedMean,
            weatherCode:     rec.weatherCode,
            source:          'open-meteo',
            fetchedAt:       new Date(),
          },
        },
        { upsert: true, new: false }
      )
      stored++
    } catch (err) {
      if (err?.code !== 11000) {
        console.error('weatherService: upsert error:', err?.message)
      }
    }
  }

  return {
    source:   'open-meteo',
    dataType: 'historical',
    count:    records.length,
    stored,
    weather:  records,
  }
}

// ── Query stored historical weather from MongoDB ──────────────────────────────

/**
 * Query persisted weather records from MongoDB.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {string} [from]
 * @param {string} [to]
 * @param {number} [limit]
 * @returns {Promise<object[]>}
 */
export async function queryStoredWeather(lat, lon, from, to, limit = 100) {
  const la = roundCoord(lat)
  const lo = roundCoord(lon)

  const query = { latitude: la, longitude: lo }
  const dateFilter = {}

  if (from) {
    const d = new Date(from)
    if (!isNaN(d.getTime())) dateFilter.$gte = d
  }
  if (to) {
    const d = new Date(to + 'T23:59:59.999Z')
    if (!isNaN(d.getTime())) dateFilter.$lte = d
  }
  if (Object.keys(dateFilter).length > 0) query.date = dateFilter

  return WeatherData
    .find(query)
    .sort({ date: -1 })
    .limit(Math.min(limit, 500))
    .lean()
}

// ── Weather statistics (aggregation) ─────────────────────────────────────────

/**
 * Compute weather statistics over a date range using MongoDB aggregation.
 * Returns aggregate metrics useful as ML features.
 *
 * @param {number} lat
 * @param {number} lon
 * @param {string} [from]
 * @param {string} [to]
 * @returns {Promise<object>}
 */
export async function getWeatherStats(lat, lon, from, to) {
  const la = roundCoord(lat)
  const lo = roundCoord(lon)

  const matchStage = { latitude: la, longitude: lo }
  const dateFilter = {}

  if (from) {
    const d = new Date(from)
    if (!isNaN(d.getTime())) dateFilter.$gte = d
  }
  if (to) {
    const d = new Date(to + 'T23:59:59.999Z')
    if (!isNaN(d.getTime())) dateFilter.$lte = d
  }
  if (Object.keys(dateFilter).length > 0) matchStage.date = dateFilter

  const [result] = await WeatherData.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        count:            { $sum: 1 },
        avgTempMax:       { $avg: '$temperatureMax' },
        avgTempMin:       { $avg: '$temperatureMin' },
        avgTempMean:      { $avg: '$temperatureMean' },
        minTempEver:      { $min: '$temperatureMin' },
        maxTempEver:      { $max: '$temperatureMax' },
        avgPrecipitation: { $avg: '$precipitation' },
        totalPrecipitation: { $sum: '$precipitation' },
        avgRain:          { $avg: '$rain' },
        totalRain:        { $sum: '$rain' },
        avgHumidity:      { $avg: '$humidityMean' },
        avgWindSpeed:     { $avg: '$windSpeedMean' },
        // Count rainy days: precipitation > 0.5mm threshold
        rainyDays: {
          $sum: {
            $cond: [{ $gt: ['$precipitation', 0.5] }, 1, 0],
          },
        },
      },
    },
    {
      $project: {
        _id:              0,
        count:            1,
        avgTempMax:       { $round: ['$avgTempMax',   1] },
        avgTempMin:       { $round: ['$avgTempMin',   1] },
        avgTempMean:      { $round: ['$avgTempMean',  1] },
        minTempEver:      { $round: ['$minTempEver',  1] },
        maxTempEver:      { $round: ['$maxTempEver',  1] },
        avgPrecipitation: { $round: ['$avgPrecipitation', 2] },
        totalPrecipitation: { $round: ['$totalPrecipitation', 1] },
        avgRain:          { $round: ['$avgRain',      2] },
        totalRain:        { $round: ['$totalRain',    1] },
        avgHumidity:      { $round: ['$avgHumidity',  1] },
        avgWindSpeed:     { $round: ['$avgWindSpeed', 1] },
        rainyDays:        1,
      },
    },
  ])

  return result || null
}
