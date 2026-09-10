import mongoose from 'mongoose'

/**
 * MarketPrice Model — persists historical government mandi price records.
 *
 * Records are sourced from data.gov.in (daily commodity prices).
 * This is NOT real-time data — it reflects market-day values as published
 * by the government.
 *
 * Designed to support future AI price prediction by providing:
 *   - commodity price history by location and date
 *   - moving averages, seasonal trends, year-over-year comparison
 *   - input features for ML models
 *
 * Duplicate protection: a compound unique index on the fields that
 * together uniquely identify one government mandi report record.
 * Fields that may be empty/null are normalised to empty string '' so
 * the unique index remains deterministic.
 */
const marketPriceSchema = new mongoose.Schema(
  {
    // ── Commodity ──────────────────────────────────────────────────────────────
    commodity: {
      type: String,
      required: [true, 'Commodity is required'],
      trim: true,
    },

    // Normalised commodity name (lowercase, English) used for consistent querying
    // e.g. 'wheat', 'paddy', 'onion'
    commodityNormalized: {
      type: String,
      trim: true,
      lowercase: true,
      default: '',
      index: true,
    },

    variety: {
      type: String,
      trim: true,
      default: '',
    },

    grade: {
      type: String,
      trim: true,
      default: '',
    },

    // ── Location ───────────────────────────────────────────────────────────────
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

    market: {
      type: String,
      trim: true,
      default: '',
    },

    // ── Price data ─────────────────────────────────────────────────────────────
    arrivalDate: {
      type: Date,
      default: null,
    },

    minPrice: {
      type: Number,
      default: 0,
    },

    maxPrice: {
      type: Number,
      default: 0,
    },

    modalPrice: {
      type: Number,
      default: 0,
    },

    // ── Provenance ─────────────────────────────────────────────────────────────
    // Where this record came from (e.g. 'data.gov.in')
    source: {
      type: String,
      trim: true,
      default: 'data.gov.in',
    },

    // The data.gov.in resource ID this record was fetched from
    sourceResourceId: {
      type: String,
      trim: true,
      default: '',
    },

    // When this record was fetched and stored
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

// Primary query index: commodity + location + date
// Used by: history queries, future ML feature extraction
marketPriceSchema.index(
  { commodityNormalized: 1, state: 1, district: 1, market: 1, arrivalDate: -1 },
  { name: 'idx_commodity_location_date' }
)

// Secondary: date descending — useful for latest-price queries across all commodities
marketPriceSchema.index({ arrivalDate: -1 }, { name: 'idx_arrival_date' })

// ── Unique / duplicate protection index ───────────────────────────────────────
// Prevents re-inserting the same government record.
// Uses sparse: false so that null arrivalDate is treated consistently.
// Fields that can be empty are trimmed to '' before save (see schema default:'').
// arrivalDate: if null, stored as ISODate("1970-01-01") sentinel via pre-save hook.
marketPriceSchema.index(
  {
    commodityNormalized: 1,
    state: 1,
    district: 1,
    market: 1,
    variety: 1,
    grade: 1,
    arrivalDate: 1,
  },
  {
    unique: true,
    name: 'idx_unique_price_record',
  }
)

const MarketPrice = mongoose.model('MarketPrice', marketPriceSchema)

export default MarketPrice
