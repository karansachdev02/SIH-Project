import {
  getCurrentWeather,
  getHistoricalWeather,
  queryStoredWeather,
  getWeatherStats,
  validateCoords,
} from '../services/weatherService.js'

// Maximum date range allowed for history requests (2 years)
const MAX_HISTORY_DAYS = 730

// ── Coordinate parsing helper ─────────────────────────────────────────────────
function parseCoords(query) {
  return {
    lat: parseFloat(query.latitude),
    lon: parseFloat(query.longitude),
  }
}

// ── Date sanitiser ────────────────────────────────────────────────────────────
function sanitiseDate(val) {
  if (typeof val !== 'string') return ''
  const s = val.trim().slice(0, 10)
  if (!s) return ''
  const d = new Date(s)
  return isNaN(d.getTime()) ? null : s  // null = invalid, '' = not provided
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Get current weather for a coordinate
 * @route   GET /api/weather/current?latitude=22.7196&longitude=75.8577
 * @access  Public
 */
export const getCurrentWeatherHandler = async (req, res) => {
  try {
    const { lat, lon } = parseCoords(req.query)

    const coordErr = validateCoords(lat, lon)
    if (coordErr) return res.status(400).json({ success: false, message: coordErr })

    const result = await getCurrentWeather(lat, lon)

    return res.status(200).json({
      success:  true,
      source:   result.source,
      note:     'Open-Meteo forecast data. Not exact ground-truth station data.',
      cached:   result.cached,
      weather:  result.weather,
    })

  } catch (err) {
    console.error('getCurrentWeatherHandler error:', err?.message)
    return res.status(503).json({
      success: false,
      message: 'Weather service temporarily unavailable. Please try again.',
    })
  }
}

/**
 * @desc    Get historical daily weather for a coordinate and date range
 * @route   GET /api/weather/history?latitude=...&longitude=...&from=2025-01-01&to=2025-01-07
 * @access  Public
 *
 * Uses ?refresh=1 to re-fetch from Open-Meteo and store in MongoDB.
 * Without refresh, returns only records already stored in MongoDB.
 */
export const getHistoricalWeatherHandler = async (req, res) => {
  try {
    const { lat, lon } = parseCoords(req.query)

    const coordErr = validateCoords(lat, lon)
    if (coordErr) return res.status(400).json({ success: false, message: coordErr })

    const from = sanitiseDate(req.query.from)
    const to   = sanitiseDate(req.query.to)

    if (from === null) return res.status(400).json({ success: false, message: 'Invalid "from" date. Use YYYY-MM-DD.' })
    if (to   === null) return res.status(400).json({ success: false, message: 'Invalid "to" date. Use YYYY-MM-DD.' })

    // If both dates provided, validate range
    if (from && to) {
      const diffDays = (new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)
      if (diffDays < 0) return res.status(400).json({ success: false, message: '"to" date must be after "from" date.' })
      if (diffDays > MAX_HISTORY_DAYS) return res.status(400).json({
        success: false,
        message: `Date range too large. Maximum ${MAX_HISTORY_DAYS} days.`,
      })
    }

    const rawLimit = parseInt(req.query.limit, 10)
    const limit    = Number.isFinite(rawLimit) ? Math.max(1, Math.min(rawLimit, 500)) : 100

    const refresh = req.query.refresh === '1' || req.query.refresh === 'true'
    const meta = {
      locationName: typeof req.query.locationName === 'string' ? req.query.locationName.trim().slice(0, 100) : '',
      state:        typeof req.query.state        === 'string' ? req.query.state.trim().slice(0, 100)        : '',
      district:     typeof req.query.district     === 'string' ? req.query.district.trim().slice(0, 100)     : '',
    }

    let fetchResult = null

    // Fetch from Open-Meteo and persist when refresh requested and dates are provided
    if (refresh && from && to) {
      fetchResult = await getHistoricalWeather(lat, lon, from, to, meta)
    }

    // Query persisted records from MongoDB
    const records = await queryStoredWeather(lat, lon, from, to, limit)

    const weather = records.map((r) => ({
      date:            r.date ? r.date.toISOString().slice(0, 10) : null,
      temperatureMax:  r.temperatureMax,
      temperatureMin:  r.temperatureMin,
      temperatureMean: r.temperatureMean,
      precipitation:   r.precipitation,
      rain:            r.rain,
      humidityMean:    r.humidityMean,
      windSpeedMean:   r.windSpeedMean,
      weatherCode:     r.weatherCode,
    }))

    const response = {
      success:  true,
      source:   'open-meteo',
      dataType: 'historical',
      note:     'Open-Meteo ERA5 reanalysis. Model-based — not exact station data.',
      count:    weather.length,
      weather,
    }

    if (weather.length === 0) {
      response.message = 'No weather records found. Use ?refresh=1&from=YYYY-MM-DD&to=YYYY-MM-DD to fetch and store data.'
    }

    if (fetchResult) {
      response.fetched = { count: fetchResult.count, stored: fetchResult.stored }
    }

    return res.status(200).json(response)

  } catch (err) {
    console.error('getHistoricalWeatherHandler error:', err?.message)
    return res.status(503).json({
      success: false,
      message: 'Historical weather service temporarily unavailable. Please try again.',
    })
  }
}

/**
 * @desc    Get weather statistics for a coordinate and date range
 * @route   GET /api/weather/stats?latitude=...&longitude=...&from=2025-01-01&to=2025-12-31
 * @access  Public
 */
export const getWeatherStatsHandler = async (req, res) => {
  try {
    const { lat, lon } = parseCoords(req.query)

    const coordErr = validateCoords(lat, lon)
    if (coordErr) return res.status(400).json({ success: false, message: coordErr })

    const from = sanitiseDate(req.query.from)
    const to   = sanitiseDate(req.query.to)

    if (from === null) return res.status(400).json({ success: false, message: 'Invalid "from" date. Use YYYY-MM-DD.' })
    if (to   === null) return res.status(400).json({ success: false, message: 'Invalid "to" date. Use YYYY-MM-DD.' })

    const stats = await getWeatherStats(lat, lon, from || undefined, to || undefined)

    if (!stats) {
      return res.status(200).json({
        success: true,
        source:  'open-meteo',
        message: 'No weather data found for these coordinates/dates. Fetch history first.',
        stats:   null,
      })
    }

    return res.status(200).json({
      success:  true,
      source:   'open-meteo',
      dataType: 'stats',
      note:     'Computed from stored Open-Meteo ERA5 records.',
      stats,
    })

  } catch (err) {
    console.error('getWeatherStatsHandler error:', err?.message)
    return res.status(503).json({
      success: false,
      message: 'Weather stats service temporarily unavailable. Please try again.',
    })
  }
}
