/**
 * mandiPriceService.js
 *
 * Fetches commodity market-price data from the official data.gov.in API.
 * All external calls happen server-side only. The API key is NEVER sent
 * to the frontend and NEVER logged.
 *
 * Data source:  https://data.gov.in
 * Dataset:      Current Daily Price of Various Commodities
 * Resource ID:  configured via DATA_GOV_RESOURCE_ID env variable
 *
 * IMPORTANT: data.gov.in publishes daily/market-day data — it is NOT real-time.
 * Never label results from this service as live or real-time.
 */

// ── In-memory cache ────────────────────────────────────────────────────────────
// Simple object keyed by a string built from the query filters.
// Each entry: { data: [...], fetchedAt: <timestamp ms> }
const cache = {}
const CACHE_TTL_MS = 30 * 60 * 1000 // 30 minutes

/**
 * Build a deterministic cache key from filter options.
 * @param {object} opts
 * @returns {string}
 */
function buildCacheKey(opts) {
  const { commodity = '', state = '', district = '', market = '', limit = 10 } = opts
  return `${commodity}|${state}|${district}|${market}|${limit}`.toLowerCase()
}

// ── Crop name normalisation map ────────────────────────────────────────────────
// Maps common Hindi (Unicode-escaped) or lowercase English variants to the
// English names used in the data.gov.in commodity field.
// Unicode escapes are used for Hindi keys so the file stays ASCII-safe on all
// Node.js / OS / encoding combinations.
const CROP_NAME_MAP = {
  // Hindi Unicode-escaped keys -> API English names
  // \u0917\u0947\u0939\u0942\u0902 = gehuun (Wheat)
  '\u0917\u0947\u0939\u0942\u0902': 'Wheat',
  '\u0917\u0947\u0939\u0941\u0902': 'Wheat',
  // \u0927\u093E\u0928 = dhaan (Paddy)
  '\u0927\u093E\u0928': 'Paddy',
  // \u091A\u093E\u0935\u0932 = chaawal (Rice)
  '\u091A\u093E\u0935\u0932': 'Rice',
  // \u092E\u0915\u094D\u0915\u093E = makka (Maize)
  '\u092E\u0915\u094D\u0915\u093E': 'Maize',
  '\u092E\u0915\u094D\u0915\u0940': 'Maize',
  // \u092C\u093E\u091C\u0930\u093E = baajra (Bajra)
  '\u092C\u093E\u091C\u0930\u093E': 'Bajra',
  // \u091C\u094C = jau (Barley)
  '\u091C\u094C': 'Barley',
  // \u0938\u0930\u0938\u094B\u0902 = sarson (Mustard)
  '\u0938\u0930\u0938\u094B\u0902': 'Mustard',
  '\u0938\u0930\u0938\u094B\u0902 \u0926\u093E\u0928\u093E': 'Mustard',
  // \u091A\u0928\u093E = chana (Gram)
  '\u091A\u0928\u093E': 'Gram',
  // \u092E\u0942\u0902\u0917 = moong
  '\u092E\u0942\u0902\u0917': 'Moong',
  // \u0909\u095C\u0926 = urad
  '\u0909\u095C\u0926': 'Urad',
  // \u092E\u0942\u0902\u0917\u092B\u0932\u0940 = moongphali (Groundnut)
  '\u092E\u0942\u0902\u0917\u092B\u0932\u0940': 'Groundnut',
  // \u0938\u094B\u092F\u093E\u092C\u0940\u0928 = soyabeen
  '\u0938\u094B\u092F\u093E\u092C\u0940\u0928': 'Soyabean',
  // \u0915\u092A\u093E\u0938 = kapas (Cotton)
  '\u0915\u092A\u093E\u0938': 'Cotton',
  // \u0917\u0928\u094D\u0928\u093E = ganna (Sugarcane)
  '\u0917\u0928\u094D\u0928\u093E': 'Sugarcane',
  // \u0906\u0932\u0942 = aalu (Potato)
  '\u0906\u0932\u0942': 'Potato',
  // \u092A\u094D\u092F\u093E\u091C = pyaaj (Onion)
  '\u092A\u094D\u092F\u093E\u091C': 'Onion',
  // \u091F\u092E\u093E\u091F\u0930 = tamatar (Tomato)
  '\u091F\u092E\u093E\u091F\u0930': 'Tomato',
  // Lowercase English -> Correct-case API names
  wheat: 'Wheat',
  paddy: 'Paddy',
  rice: 'Rice',
  maize: 'Maize',
  bajra: 'Bajra',
  barley: 'Barley',
  mustard: 'Mustard',
  gram: 'Gram',
  moong: 'Moong',
  urad: 'Urad',
  groundnut: 'Groundnut',
  soyabean: 'Soyabean',
  soybean: 'Soyabean',
  cotton: 'Cotton',
  sugarcane: 'Sugarcane',
  potato: 'Potato',
  onion: 'Onion',
  tomato: 'Tomato',
}

/**
 * Normalise a crop/commodity name to the value expected by the API.
 * Returns the original string (with first letter uppercased) if no mapping found.
 * @param {string} name
 * @returns {string}
 */
export function normaliseCropName(name) {
  if (!name || typeof name !== 'string') return ''
  const trimmed = name.trim()
  // Exact match first
  if (CROP_NAME_MAP[trimmed]) return CROP_NAME_MAP[trimmed]
  // Lowercase match
  const lower = trimmed.toLowerCase()
  if (CROP_NAME_MAP[lower]) return CROP_NAME_MAP[lower]
  // No mapping — return as-is with first letter uppercased
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

// ── Static fallback data ───────────────────────────────────────────────────────
// Used when the external API is unavailable, key is missing, or rate-limited.
// Prices are approximate historical sample values — NOT current market prices.
// Always returned with source: 'fallback' so the UI can label them clearly.
export const FALLBACK_PRICES = [
  {
    commodity: 'Wheat',
    variety: 'Common',
    market: 'Sample Market',
    district: '–',
    state: '–',
    modalPrice: 2450,
    minPrice: 2200,
    maxPrice: 2650,
    unit: 'Quintal',
    date: null,
  },
  {
    commodity: 'Paddy',
    variety: 'Common',
    market: 'Sample Market',
    district: '–',
    state: '–',
    modalPrice: 1800,
    minPrice: 1650,
    maxPrice: 1950,
    unit: 'Quintal',
    date: null,
  },
  {
    commodity: 'Maize',
    variety: 'Common',
    market: 'Sample Market',
    district: '–',
    state: '–',
    modalPrice: 1700,
    minPrice: 1550,
    maxPrice: 1850,
    unit: 'Quintal',
    date: null,
  },
  {
    commodity: 'Onion',
    variety: 'Common',
    market: 'Sample Market',
    district: '–',
    state: '–',
    modalPrice: 1200,
    minPrice: 900,
    maxPrice: 1500,
    unit: 'Quintal',
    date: null,
  },
  {
    commodity: 'Potato',
    variety: 'Common',
    market: 'Sample Market',
    district: '–',
    state: '–',
    modalPrice: 1100,
    minPrice: 850,
    maxPrice: 1350,
    unit: 'Quintal',
    date: null,
  },
]

// ── Field-safe accessor ────────────────────────────────────────────────────────
// The data.gov.in API uses space-separated title-case field names.
// Read safely regardless of minor casing differences.

/**
 * Safely read a value from a record object using case-insensitive key lookup.
 * Returns '' if not found.
 * @param {object} record
 * @param {string} key  — the expected field name
 * @returns {string}
 */
function safeGet(record, key) {
  if (!record || typeof record !== 'object') return ''
  // Direct access first (fastest path)
  if (record[key] !== undefined) return String(record[key] ?? '')
  // Case-insensitive fallback
  const lowerKey = key.toLowerCase()
  for (const k of Object.keys(record)) {
    if (k.toLowerCase() === lowerKey) return String(record[k] ?? '')
  }
  return ''
}

/**
 * Normalise a raw data.gov.in record into the clean internal shape.
 * @param {object} raw
 * @returns {object}
 */
function normaliseRecord(raw) {
  return {
    commodity: safeGet(raw, 'commodity') || safeGet(raw, 'Commodity'),
    variety:   safeGet(raw, 'variety')   || safeGet(raw, 'Variety'),
    market:    safeGet(raw, 'market')    || safeGet(raw, 'Market'),
    district:  safeGet(raw, 'district')  || safeGet(raw, 'District'),
    state:     safeGet(raw, 'state')     || safeGet(raw, 'State'),
    modalPrice: Number(safeGet(raw, 'modal_price') || safeGet(raw, 'modal price') || 0),
    minPrice:   Number(safeGet(raw, 'min_price')   || safeGet(raw, 'min price')   || 0),
    maxPrice:   Number(safeGet(raw, 'max_price')   || safeGet(raw, 'max price')   || 0),
    unit:       safeGet(raw, 'unit') || 'Quintal',
    date:       safeGet(raw, 'arrival_date') || safeGet(raw, 'Arrival_Date') || safeGet(raw, 'date') || null,
  }
}

// ── External API fetch ─────────────────────────────────────────────────────────

/**
 * Fetch commodity prices from data.gov.in.
 *
 * @param {object} opts
 * @param {string} [opts.commodity]  - commodity name (will be normalised)
 * @param {string} [opts.state]      - Indian state name
 * @param {string} [opts.district]   - district name
 * @param {string} [opts.market]     - specific market/mandi name
 * @param {number} [opts.limit]      - max records to return (default 10)
 *
 * @returns {Promise<{ source: string, prices: object[], message?: string }>}
 *   source is 'data.gov.in' on success or 'fallback' on failure.
 *   Never throws — always resolves.
 */
export async function fetchMandiPrices(opts = {}) {
  const {
    commodity = '',
    state = '',
    district = '',
    market = '',
    limit = 10,
  } = opts

  const apiKey        = process.env.DATA_GOV_API_KEY
  const resourceId    = process.env.DATA_GOV_RESOURCE_ID || '9ef84268-d588-465a-a308-a864a43d0070'

  // ── Fallback immediately if API key is not configured ──
  if (!apiKey) {
    return {
      source: 'fallback',
      prices: filterFallback(commodity, limit),
      message: 'Market price API key not configured. Showing sample data.',
    }
  }

  // ── Check cache ──
  const cacheKey = buildCacheKey({ commodity, state, district, market, limit })
  const cached   = cache[cacheKey]
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { source: 'data.gov.in', prices: cached.data }
  }

  // ── Build API URL ──
  const normalisedCommodity = normaliseCropName(commodity)

  const params = new URLSearchParams()
  params.set('api-key', apiKey)
  params.set('format', 'json')
  params.set('limit', String(Math.min(Number(limit) || 10, 100)))

  // Apply filters using the data.gov.in field-filter syntax
  const filters = []
  if (normalisedCommodity) filters.push(`commodity:${normalisedCommodity}`)
  if (state)               filters.push(`state:${state}`)
  if (district)            filters.push(`district:${district}`)
  if (market)              filters.push(`market:${market}`)
  if (filters.length > 0)  params.set('filters[field]', filters.join(','))

  const url = `https://api.data.gov.in/resource/${resourceId}?${params.toString()}`

  try {
    // 10-second timeout — do not hang the server waiting for a slow external API
    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), 10_000)

    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`data.gov.in responded with HTTP ${response.status}`)
    }

    const json = await response.json()

    // data.gov.in returns records under 'records' key
    const rawRecords = json?.records ?? json?.data ?? []

    if (!Array.isArray(rawRecords) || rawRecords.length === 0) {
      // API returned OK but no matching records — use fallback
      return {
        source: 'fallback',
        prices: filterFallback(commodity, limit),
        message: 'No market price data found for this filter. Showing sample data.',
      }
    }

    const prices = rawRecords.map(normaliseRecord)

    // Store in cache
    cache[cacheKey] = { data: prices, fetchedAt: Date.now() }

    return { source: 'data.gov.in', prices }

  } catch (err) {
    // Log enough to diagnose — but NEVER log the API key
    const reason = err?.name === 'AbortError' ? 'timeout' : err?.message || 'unknown error'
    console.error(`mandiPriceService: External API fetch failed (${reason})`)

    return {
      source: 'fallback',
      prices: filterFallback(commodity, limit),
      message: 'Market price service temporarily unavailable. Showing sample data.',
    }
  }
}

/**
 * Filter static fallback prices by commodity name (case-insensitive partial match).
 * Returns all fallback entries if no commodity filter is applied.
 * @param {string} commodity
 * @param {number} limit
 * @returns {object[]}
 */
function filterFallback(commodity, limit = 10) {
  if (!commodity) return FALLBACK_PRICES.slice(0, limit)
  const lower = commodity.toLowerCase()
  const normalised = normaliseCropName(commodity).toLowerCase()
  const filtered = FALLBACK_PRICES.filter(
    (p) =>
      p.commodity.toLowerCase().includes(lower) ||
      p.commodity.toLowerCase().includes(normalised)
  )
  return (filtered.length > 0 ? filtered : FALLBACK_PRICES).slice(0, limit)
}
