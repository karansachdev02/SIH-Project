/**
 * predictionService.js
 *
 * Statistical crop price prediction engine for KisanMitra.
 *
 * ARCHITECTURE:
 *   This service is designed as a clean interface that can be backed by:
 *     1. The current statistical engine (moving average + trend + seasonal)
 *     2. Gemini API (plug in GEMINI_API_KEY to .env — zero code changes needed)
 *     3. ONNX/TensorFlow.js model in a future step
 *
 *   The public function `predictPrice()` always returns the same response shape
 *   regardless of which engine is active, so the controller/frontend
 *   never needs to change when upgrading the engine.
 *
 * CURRENT ENGINE: Statistical (no external API required)
 *   Method: exponential smoothing + trend extrapolation + seasonal adjustment
 *   Accuracy: indicative only — always disclosed in response
 *
 * GEMINI ENGINE (future):
 *   When GEMINI_API_KEY is present in process.env:
 *     - Feature vector summary is serialised as structured context
 *     - Gemini Flash is called with a strict JSON prompt
 *     - Response is validated and merged into the standard shape
 *
 * SECURITY:
 *   - GEMINI_API_KEY is read only from process.env
 *   - Never logged, never returned to frontend
 *   - Absent key silently falls back to statistical engine
 */

import { buildFeatureVectors } from './featureService.js'

// ── Gemini configuration (optional) ──────────────────────────────────────────
// NOTE: GEMINI_API_KEY is intentionally NOT cached at module load time.
// It is read from process.env inside geminiPredict() on every call so that the
// key is always current even if dotenv loads asynchronously or tests override it.
const GEMINI_MODEL   = 'gemini-2.5-flash'
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const GEMINI_TIMEOUT = 15_000

// ── Statistical engine ────────────────────────────────────────────────────────

/**
 * Exponential smoothing alpha
 * 0.3 gives moderate weight to recent values vs history.
 */
const ALPHA = 0.3

/**
 * Compute exponentially-smoothed price from a sorted ascending series of prices.
 * Returns null if series is empty.
 *
 * @param {number[]} prices  ascending by date
 * @returns {number|null}
 */
function exponentialSmoothing(prices) {
  if (prices.length === 0) return null
  let s = prices[0]
  for (let i = 1; i < prices.length; i++) {
    s = ALPHA * prices[i] + (1 - ALPHA) * s
  }
  return Math.round(s)
}

/**
 * Estimate price trend per day from the last window of prices.
 * Positive = rising, negative = falling.
 *
 * @param {number[]} prices  ascending by date
 * @param {number}   window  lookback window
 * @returns {number}  trend in ₹/day
 */
function estimateTrend(prices, window = 14) {
  if (prices.length < 2) return 0
  const slice = prices.slice(-Math.min(window, prices.length))
  if (slice.length < 2) return 0
  // Simple linear regression slope
  const n  = slice.length
  const xs = Array.from({ length: n }, (_, i) => i)
  const xm = (n - 1) / 2
  const ym = slice.reduce((s, v) => s + v, 0) / n
  let num = 0, den = 0
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xm) * (slice[i] - ym)
    den += (xs[i] - xm) ** 2
  }
  return den === 0 ? 0 : num / den
}

/**
 * Core statistical prediction.
 * Returns predicted price for `horizon` days ahead.
 *
 * @param {object[]} rows     feature vector rows (ascending by date)
 * @param {object}   summary  summary stats from buildFeatureVectors
 * @param {number}   horizon  days to predict ahead (1, 7, 30)
 * @returns {{
 *   predicted: number,
 *   confidence: 'low' | 'medium' | 'high',
 *   method: string,
 *   trendDirection: 'rising' | 'falling' | 'stable',
 * }}
 */
function statisticalPredict(rows, summary, horizon) {
  const prices = rows
    .map((r) => r.modalPrice)
    .filter((v) => v !== null && v > 0)

  if (prices.length === 0) {
    return {
      predicted: null,
      confidence: 'low',
      method: 'insufficient-data',
      trendDirection: 'stable',
    }
  }

  const smoothed = exponentialSmoothing(prices)
  const trend    = estimateTrend(prices, 14)

  // Apply trend extrapolation for the horizon
  const predicted = Math.max(0, Math.round(smoothed + trend * horizon))

  // Confidence: higher if more data and recent MA agrees with smoothed
  let confidence = 'low'
  if (prices.length >= 30) {
    const latestMA7 = summary?.latestMA7 ?? null
    const deviation = latestMA7
      ? Math.abs(smoothed - latestMA7) / Math.max(smoothed, 1)
      : 1
    if (deviation < 0.05 && prices.length >= 60) {
      confidence = 'high'
    } else if (deviation < 0.15 && prices.length >= 20) {
      confidence = 'medium'
    }
  }

  // Trend direction label
  const trendAbsPerDay = Math.abs(trend)
  const relativeThreshold = (summary?.avgModalPrice ?? 2000) * 0.001  // 0.1% per day
  let trendDirection = 'stable'
  if (trendAbsPerDay > relativeThreshold) {
    trendDirection = trend > 0 ? 'rising' : 'falling'
  }

  return {
    predicted,
    confidence,
    method: 'exponential-smoothing-with-trend',
    trendDirection,
  }
}

// ── Gemini engine ─────────────────────────────────────────────────────────────

/**
 * Build a structured text prompt for Gemini, injecting the feature vector summary.
 * Asks for a strict JSON response to make parsing deterministic.
 *
 * @param {string} commodity
 * @param {object} summary
 * @param {object[]} recentRows  last 30 rows (date, modalPrice, temperatureMean, precipitation)
 * @param {number} horizon  days ahead
 * @returns {string}
 */
function buildGeminiPrompt(commodity, summary, recentRows, horizon) {
  const recentPrices = recentRows
    .slice(-30)
    .map((r) => `${r.date}: \u20b9${r.modalPrice}${r.temperatureMean !== null ? ` (temp ${r.temperatureMean}C, rain ${r.precipitation ?? 0}mm)` : ''}`)
    .join('\n')

  return `You are an agricultural commodity price analyst for Indian mandi (wholesale market) prices.

Analyse the following historical price data for ${commodity} and predict the price ${horizon} day(s) from today.

COMMODITY: ${commodity}
LOCATION: ${summary?.from ? `Data from ${summary.from} to ${summary.to}` : 'India'}
AVERAGE PRICE (period): \u20b9${summary?.avgModalPrice ?? 'N/A'} per quintal
PRICE RANGE: \u20b9${summary?.minPrice ?? 'N/A'} \u2013 \u20b9${summary?.maxPrice ?? 'N/A'}
7-DAY MOVING AVERAGE: \u20b9${summary?.latestMA7 ?? 'N/A'}
30-DAY MOVING AVERAGE: \u20b9${summary?.latestMA30 ?? 'N/A'}
30-DAY PRICE TREND: ${summary?.priceTrend30d !== null ? `${summary.priceTrend30d > 0 ? '+' : ''}${summary.priceTrend30d}%` : 'N/A'}
LATEST PRICE: \u20b9${summary?.latestPrice ?? 'N/A'}

RECENT DAILY DATA (last 30 records):
${recentPrices}

TASK: Predict the modal (most common) wholesale market price for ${commodity} after ${horizon} day(s).

Respond ONLY with valid JSON in exactly this format (no markdown, no explanation):
{
  "predicted": <integer price in rupees per quintal>,
  "confidence": "<low|medium|high>",
  "trendDirection": "<rising|falling|stable>",
  "reasoning": "<one sentence explanation in English>"
}`
}

/**
 * Call Gemini API and return parsed prediction.
 * Returns null if key is absent, call fails, or response is malformed.
 *
 * @param {string} commodity
 * @param {object} summary
 * @param {object[]} recentRows
 * @param {number} horizon
 * @returns {Promise<object|null>}
 */
async function geminiPredict(commodity, summary, recentRows, horizon) {
  // Read at call time — never cache at module level (dotenv may not yet be loaded)
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey || !apiKey.trim() || apiKey === 'your_gemini_api_key_here') return null

  const prompt = buildGeminiPrompt(commodity, summary, recentRows, horizon)

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature:     0.2,
      maxOutputTokens: 256,
      responseMimeType: 'application/json',
    },
  }

  try {
    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), GEMINI_TIMEOUT)

    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      signal:  controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      console.error(`predictionService: Gemini HTTP ${res.status}`)
      return null
    }

    const json = await res.json()
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!text) return null

    // Strip markdown code fences if present
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const parsed  = JSON.parse(cleaned)

    const predicted = parseInt(parsed.predicted, 10)
    if (!Number.isFinite(predicted) || predicted <= 0) return null

    return {
      predicted,
      confidence:     ['low', 'medium', 'high'].includes(parsed.confidence) ? parsed.confidence : 'medium',
      method:         GEMINI_MODEL,
      trendDirection: ['rising', 'falling', 'stable'].includes(parsed.trendDirection) ? parsed.trendDirection : 'stable',
      reasoning:      typeof parsed.reasoning === 'string' ? parsed.reasoning.slice(0, 300) : null,
    }

  } catch (err) {
    const reason = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'unknown')
    console.error(`predictionService: Gemini call failed (${reason})`)
    return null
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Predict crop price for a given commodity + location + horizon.
 *
 * Response shape (always):
 * {
 *   commodity: string,
 *   horizon: number,          // days ahead
 *   engine: string,           // GEMINI_MODEL | 'statistical' | 'insufficient-data'
 *   predicted: number|null,   // predicted modal price in ₹/quintal
 *   confidence: string,       // 'low' | 'medium' | 'high'
 *   trendDirection: string,   // 'rising' | 'falling' | 'stable'
 *   reasoning: string|null,   // text explanation (Gemini only)
 *   dataPoints: number,       // price records used
 *   summary: object|null,     // feature vector summary
 *   disclaimer: string,       // always present — prediction accuracy disclosure
 * }
 *
 * @param {object} opts
 * @param {string} opts.commodity
 * @param {string} [opts.state]
 * @param {string} [opts.district]
 * @param {number} [opts.latitude]
 * @param {number} [opts.longitude]
 * @param {number} [opts.horizon]   days ahead to predict (1, 7, or 30; default 7)
 * @param {number} [opts.lookback]  days of history to use (default 90)
 * @returns {Promise<object>}
 */
export async function predictPrice(opts = {}) {
  const {
    commodity = '',
    state = '',
    district = '',
    latitude,
    longitude,
    horizon  = 7,
    lookback = 90,
  } = opts

  const safeHorizon  = [1, 7, 14, 30].includes(Number(horizon))  ? Number(horizon)  : 7
  const safeLookback = Math.min(Math.max(Number(lookback) || 90, 30), 365)

  const DISCLAIMER = 'Price predictions are indicative only. Actual mandi prices depend on local supply, demand, and government policy. Always consult your local mandi or Krishi Vigyan Kendra before making decisions.'

  if (!commodity) {
    return {
      commodity: '',
      horizon: safeHorizon,
      engine: 'error',
      predicted: null,
      confidence: 'low',
      trendDirection: 'stable',
      reasoning: null,
      dataPoints: 0,
      summary: null,
      disclaimer: DISCLAIMER,
    }
  }

  // ── Fetch feature vectors ───────────────────────────────────────────────────
  const { rows, summary, priceCount } = await buildFeatureVectors({
    commodity,
    state,
    district,
    latitude,
    longitude,
    lookback: safeLookback,
    limit: safeLookback,
  })

  if (rows.length === 0) {
    return {
      commodity,
      horizon: safeHorizon,
      engine: 'insufficient-data',
      predicted: null,
      confidence: 'low',
      trendDirection: 'stable',
      reasoning: 'No historical price data found. Fetch market history first via the Prices page.',
      dataPoints: 0,
      summary: null,
      disclaimer: DISCLAIMER,
    }
  }

  // ── Try Gemini first (if key configured) ────────────────────────────────────
  const geminiResult = await geminiPredict(commodity, summary, rows, safeHorizon)

  if (geminiResult) {
    return {
      commodity,
      horizon: safeHorizon,
      engine: geminiResult.method,
      predicted: geminiResult.predicted,
      confidence: geminiResult.confidence,
      trendDirection: geminiResult.trendDirection,
      reasoning: geminiResult.reasoning,
      dataPoints: priceCount,
      summary,
      disclaimer: DISCLAIMER,
    }
  }

  // ── Fall back to statistical engine ─────────────────────────────────────────
  const stat = statisticalPredict(rows, summary, safeHorizon)

  return {
    commodity,
    horizon: safeHorizon,
    engine: stat.method === 'insufficient-data' ? 'insufficient-data' : 'statistical',
    predicted: stat.predicted,
    confidence: stat.confidence,
    trendDirection: stat.trendDirection,
    reasoning: null,
    dataPoints: priceCount,
    summary,
    disclaimer: DISCLAIMER,
  }
}
