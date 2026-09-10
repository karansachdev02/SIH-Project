import mongoose from 'mongoose'

/**
 * WeatherData Model — persists daily weather records from Open-Meteo.
 *
 * Data source: Open-Meteo (https://open-meteo.com)
 * No API key required — Open-Meteo is free for non-commercial use.
 *
 * NOTE: Open-Meteo provides model-based weather data, not exact
 * ground-truth station readings. Always identify source as "Open-Meteo".
 *
 * Designed to support future AI crop-price prediction by providing
 * weather features alongside mandi price history:
 *   - temperature trends
 *   - rainfall history
 *   - humidity patterns
 *   - seasonal weather averages
 */
const weatherDataSchema = new mongoose.Schema(
  {
    // ── Location ──────────────────────────────────────────────────────────────
    locationName: {
      type: String,
      trim: true,
      default: '',
    },

    state: {
      type: String,
      trim: true,
      default: '',
    },

    district: {
      type: String,
      trim: true,
      default: '',
    },

    // Coordinates — stored with 4 decimal places of precision (~11m accuracy)
    // Rounded before storage so nearby queries hit the same records
    latitude: {
      type: Number,
      required: [true, 'Latitude is required'],
    },

    longitude: {
      type: Number,
      required: [true, 'Longitude is required'],
    },

    // ── Date ──────────────────────────────────────────────────────────────────
    // ISO calendar date (time stored as UTC midnight)
    date: {
      type: Date,
      required: [true, 'Date is required'],
    },

    // ── Daily weather variables ────────────────────────────────────────────────
    // All temperature fields in degrees Celsius
    temperatureMax: {
      type: Number,
      default: null,
    },

    temperatureMin: {
      type: Number,
      default: null,
    },

    temperatureMean: {
      type: Number,
      default: null,
    },

    // Precipitation sum in mm (rain + snow/sleet)
    precipitation: {
      type: Number,
      default: null,
    },

    // Rain sum in mm (liquid only, excludes snow)
    rain: {
      type: Number,
      default: null,
    },

    // Relative humidity in % (daily mean)
    humidityMean: {
      type: Number,
      default: null,
    },

    // Wind speed in km/h (daily mean at 10m height)
    windSpeedMean: {
      type: Number,
      default: null,
    },

    // WMO weather interpretation code (e.g. 0=clear, 61=rain, 95=thunderstorm)
    weatherCode: {
      type: Number,
      default: null,
    },

    // ── Provenance ─────────────────────────────────────────────────────────────
    source: {
      type: String,
      trim: true,
      default: 'open-meteo',
    },

    fetchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

// ── Indexes ────────────────────────────────────────────────────────────────────

// Unique record per coordinate + date — prevents duplicate inserts
// Coordinates are rounded to 4dp before storage (see weatherService.js)
weatherDataSchema.index(
  { latitude: 1, longitude: 1, date: 1 },
  { unique: true, name: 'idx_unique_weather_record' }
)

// Query index: location + date range — used by history and stats queries
weatherDataSchema.index(
  { latitude: 1, longitude: 1, date: -1 },
  { name: 'idx_weather_location_date' }
)

const WeatherData = mongoose.model('WeatherData', weatherDataSchema)

export default WeatherData
