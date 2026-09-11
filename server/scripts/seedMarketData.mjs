/**
 * KisanMitra — Demo Market Data Seed Script
 *
 * Seeds realistic sample market price records into MongoDB for SIH demo use.
 * These are representative values sourced from publicly known Indian mandi
 * price ranges — NOT live government data.
 *
 * All seeded records are clearly marked source: 'demo-seed' so they can
 * be distinguished from real data.gov.in records if/when the live API
 * becomes accessible.
 *
 * Usage:
 *   node scripts/seedMarketData.mjs
 *   OR: npm run seed:market
 *
 * Safe to run multiple times — uses upsert, no duplicates created.
 * Inserts ~90 records: 6 commodities × 15 days of history.
 */

import dotenv from 'dotenv'
import mongoose from 'mongoose'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const MONGODB_URI = process.env.MONGODB_URI
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in server/.env')
  process.exit(1)
}

// ── MarketPrice schema (inline, mirrors server/src/models/MarketPrice.js) ─────
const marketPriceSchema = new mongoose.Schema({
  commodity:           { type: String, required: true, trim: true },
  commodityNormalized: { type: String, trim: true, lowercase: true, default: '' },
  variety:             { type: String, trim: true, default: '' },
  grade:               { type: String, trim: true, default: '' },
  state:               { type: String, trim: true, default: '' },
  district:            { type: String, trim: true, default: '' },
  market:              { type: String, trim: true, default: '' },
  arrivalDate:         { type: Date, default: null },
  minPrice:            { type: Number, default: 0 },
  maxPrice:            { type: Number, default: 0 },
  modalPrice:          { type: Number, default: 0 },
  source:              { type: String, trim: true, default: 'data.gov.in' },
  sourceResourceId:    { type: String, trim: true, default: '' },
  fetchedAt:           { type: Date, default: Date.now },
}, { timestamps: true })

marketPriceSchema.index(
  { commodityNormalized: 1, state: 1, district: 1, market: 1, variety: 1, grade: 1, arrivalDate: 1 },
  { unique: true, name: 'idx_unique_price_record' }
)

// Reuse model if already registered
const MarketPrice = mongoose.models.MarketPrice || mongoose.model('MarketPrice', marketPriceSchema)

// ── Realistic price baselines (₹/Quintal) ─────────────────────────────────────
// Based on representative Indian mandi price ranges for major commodities.
const COMMODITIES = [
  { name: 'Wheat',        norm: 'wheat',        min: 2150, max: 2700, modal: 2400, unit: 'Quintal', trend: +8  },
  { name: 'Paddy',        norm: 'paddy',        min: 1700, max: 2100, modal: 1900, unit: 'Quintal', trend: +5  },
  { name: 'Maize',        norm: 'maize',        min: 1500, max: 2000, modal: 1750, unit: 'Quintal', trend: +4  },
  { name: 'Onion',        norm: 'onion',        min: 800,  max: 1800, modal: 1200, unit: 'Quintal', trend: -15 },
  { name: 'Potato',       norm: 'potato',       min: 700,  max: 1500, modal: 1050, unit: 'Quintal', trend: +6  },
  { name: 'Soybean',      norm: 'soybean',      min: 4200, max: 5200, modal: 4700, unit: 'Quintal', trend: +12 },
]

const LOCATIONS = [
  { state: 'Madhya Pradesh', district: 'Indore',   market: 'Indore Mandi' },
  { state: 'Madhya Pradesh', district: 'Bhopal',   market: 'Bhopal Mandi' },
  { state: 'Uttar Pradesh',  district: 'Agra',     market: 'Agra Mandi'   },
]

const DAYS_HISTORY = 30   // 30 days of daily records
const SOURCE       = 'demo-seed'
const RESOURCE_ID  = 'demo-seed-v1'

// ── Date helper ───────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(0, 0, 0, 0)
  return d
}

// ── Generate price with realistic day-to-day variation ───────────────────────
function generateDayPrice(base, trend, dayIndex, totalDays) {
  // linear trend component
  const trendFactor = 1 + (trend / 100) * (dayIndex / totalDays)
  // small random noise ±3%
  const noise = 1 + (Math.random() * 0.06 - 0.03)
  const modal = Math.round(base * trendFactor * noise)
  return {
    modal,
    min:  Math.round(modal * (0.88 + Math.random() * 0.06)),
    max:  Math.round(modal * (1.06 + Math.random() * 0.08)),
  }
}

// ── Connect and seed ──────────────────────────────────────────────────────────
console.log('⏳ Connecting to MongoDB…')
await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
console.log('✅ MongoDB connected')

let total = 0, upserted = 0, skipped = 0

for (const loc of LOCATIONS) {
  for (const crop of COMMODITIES) {
    for (let d = 0; d < DAYS_HISTORY; d++) {
      const { modal, min, max } = generateDayPrice(crop.modal, crop.trend, DAYS_HISTORY - d, DAYS_HISTORY)
      const arrivalDate = daysAgo(d)

      const doc = {
        commodity:           crop.name,
        commodityNormalized: crop.norm,
        variety:             'Common',
        grade:               '',
        state:               loc.state,
        district:            loc.district,
        market:              loc.market,
        arrivalDate,
        minPrice:            min,
        maxPrice:            max,
        modalPrice:          modal,
        source:              SOURCE,
        sourceResourceId:    RESOURCE_ID,
        fetchedAt:           new Date(),
      }

      const filter = {
        commodityNormalized: doc.commodityNormalized,
        state:               doc.state,
        district:            doc.district,
        market:              doc.market,
        variety:             doc.variety,
        grade:               doc.grade,
        arrivalDate:         doc.arrivalDate,
      }

      try {
        const result = await MarketPrice.findOneAndUpdate(
          filter,
          { $set: doc },
          { upsert: true, new: false }
        )
        total++
        if (!result) upserted++   // null result means it was newly inserted
        else skipped++
      } catch (err) {
        if (err?.code === 11000) { skipped++; total++ }
        else console.warn('  ⚠️  Upsert error:', err?.message)
      }
    }
  }
}

console.log(`\n✅ Seed complete`)
console.log(`   Total processed : ${total}`)
console.log(`   New records      : ${upserted}`)
console.log(`   Already existed  : ${skipped}`)
console.log(`   Commodities      : ${COMMODITIES.map(c => c.name).join(', ')}`)
console.log(`   Locations        : ${LOCATIONS.map(l => l.market).join(', ')}`)
console.log(`   Days of history  : ${DAYS_HISTORY}`)
console.log(`   Source label     : ${SOURCE}`)
console.log('\n⚠️  These are representative demo values, NOT live government data.')
console.log('   Real data.gov.in records have source: "data.gov.in"')

await mongoose.disconnect()
console.log('🔌 MongoDB disconnected. Done.')
process.exit(0)
