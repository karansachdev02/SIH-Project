import { useState, useEffect, useCallback } from 'react'
import Button from '../../components/common/Button'
import MarketPriceCard from '../../components/common/MarketPriceCard'
import { getMarketPrices } from '../../services/marketPriceService'
import { getMarketHistory } from '../../services/marketHistoryService'
import { useLanguage } from '../../context/LanguageContext'
import {
  TrendingUp,
  Home,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  Info,
  History,
  ChevronDown,
  ChevronUp,
  CalendarDays,
  MapPin,
  Database,
} from 'lucide-react'

// ── Shared constants ──────────────────────────────────────────────────────────

const INDIAN_STATES = [
  'Andhra Pradesh', 'Bihar', 'Chhattisgarh', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
  'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu',
  'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

const COMMON_COMMODITIES = [
  'Wheat', 'Paddy', 'Rice', 'Maize', 'Bajra', 'Barley', 'Mustard',
  'Gram', 'Moong', 'Urad', 'Groundnut', 'Soyabean', 'Cotton',
  'Onion', 'Potato', 'Tomato',
]

// ── Price formatter ───────────────────────────────────────────────────────────

function fmtPrice(val) {
  const n = Number(val)
  if (!n || isNaN(n)) return '–'
  return `₹${n.toLocaleString('en-IN')}`
}

// ── History table row ─────────────────────────────────────────────────────────

function HistoryRow({ rec }) {
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
      <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
        {rec.arrivalDate ?? '–'}
      </td>
      <td className="px-3 py-2.5 text-xs font-semibold text-slate-800">
        {rec.commodity}{rec.variety ? ` (${rec.variety})` : ''}
      </td>
      <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[140px] truncate">
        {[rec.market, rec.district].filter(Boolean).join(', ') || '–'}
      </td>
      <td className="px-3 py-2.5 text-xs text-slate-500 text-right whitespace-nowrap">
        {fmtPrice(rec.minPrice)}
      </td>
      <td className="px-3 py-2.5 text-xs text-slate-500 text-right whitespace-nowrap">
        {fmtPrice(rec.maxPrice)}
      </td>
      <td className="px-3 py-2.5 text-xs font-bold text-emerald-700 text-right whitespace-nowrap">
        {fmtPrice(rec.modalPrice)}
      </td>
    </tr>
  )
}

// ── Historical prices section ─────────────────────────────────────────────────

function HistoricalPricesSection() {
  const { t } = useLanguage()
  const [histPrices, setHistPrices]       = useState([])
  const [histLoading, setHistLoading]     = useState(false)
  const [histError, setHistError]         = useState(null)
  const [histMeta, setHistMeta]           = useState(null)  // { source, note, count }
  const [expanded, setExpanded]           = useState(true)

  // Staged filter state
  const [hCommodity, setHCommodity]       = useState('')
  const [hState, setHState]               = useState('')
  const [hDistrict, setHDistrict]         = useState('')
  const [hFrom, setHFrom]                 = useState('')
  const [hTo, setHTo]                     = useState('')

  const fetchHistory = useCallback(async (filters = {}) => {
    setHistLoading(true)
    setHistError(null)
    try {
      const data = await getMarketHistory({ limit: 50, ...filters })
      setHistPrices(data.prices || [])
      setHistMeta({
        source:  data.source,
        note:    data.note,
        count:   data.count,
        message: data.message,
      })
    } catch (err) {
      setHistError(err?.message || 'Failed to load historical data.')
      setHistPrices([])
    } finally {
      setHistLoading(false)
    }
  }, [])

  // Load on mount — no filters, shows whatever is already in DB
  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const handleHistSearch = (e) => {
    e.preventDefault()
    fetchHistory({ commodity: hCommodity, state: hState, district: hDistrict, from: hFrom, to: hTo, limit: 50 })
  }

  const handleHistReset = () => {
    setHCommodity('')
    setHState('')
    setHDistrict('')
    setHFrom('')
    setHTo('')
    fetchHistory()
  }

  const handleRefresh = () => {
    fetchHistory({
      commodity: hCommodity,
      state: hState,
      district: hDistrict,
      from: hFrom,
      to: hTo,
      limit: 50,
      refresh: true,
    })
  }

  return (
    <section aria-labelledby="history-heading" className="space-y-3">

      {/* Section header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <History size={18} aria-hidden="true" />
          </div>
          <div>
            <h2 id="history-heading" className="text-base font-bold text-slate-900">
              {t('historicalPrices', 'Historical Mandi Prices')}
            </h2>
            <p className="text-[11px] text-slate-500">
              {t('dataType', 'Government mandi data — daily historical prices')}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-controls="history-body"
          className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {!expanded ? null : (
        <div id="history-body" className="space-y-3">

          {/* Data provenance note */}
          <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs">
            <Database size={13} className="shrink-0 mt-0.5 text-slate-400" aria-hidden="true" />
            <p>
              <strong>Data type:</strong> Historical / daily government mandi data.{' '}
              <strong>Source:</strong> data.gov.in (Govt. of India).{' '}
              Not real-time. Use <strong>Fetch Latest</strong> to pull fresh records from the government API.
            </p>
          </div>

          {/* Filter form */}
          <form
            onSubmit={handleHistSearch}
            className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3"
            aria-label="Historical price filter"
          >
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              ऐतिहासिक फ़िल्टर / Historical Filter
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Commodity */}
              <div>
                <label htmlFor="h-commodity" className="block text-xs font-semibold text-slate-600 mb-1">
                  फसल / Commodity
                </label>
                <input
                  id="h-commodity"
                  type="text"
                  list="h-commodity-list"
                  value={hCommodity}
                  onChange={(e) => setHCommodity(e.target.value)}
                  placeholder="e.g. Wheat, Onion"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
                />
                <datalist id="h-commodity-list">
                  {COMMON_COMMODITIES.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>

              {/* State */}
              <div>
                <label htmlFor="h-state" className="block text-xs font-semibold text-slate-600 mb-1">
                  राज्य / State
                </label>
                <select
                  id="h-state"
                  value={hState}
                  onChange={(e) => setHState(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
                >
                  <option value="">All States</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* District */}
              <div>
                <label htmlFor="h-district" className="block text-xs font-semibold text-slate-600 mb-1">
                  जिला / District
                </label>
                <input
                  id="h-district"
                  type="text"
                  value={hDistrict}
                  onChange={(e) => setHDistrict(e.target.value)}
                  placeholder="Optional district"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
                />
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="h-from" className="block text-xs font-semibold text-slate-600 mb-1">
                    From
                  </label>
                  <input
                    id="h-from"
                    type="date"
                    value={hFrom}
                    onChange={(e) => setHFrom(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="h-to" className="block text-xs font-semibold text-slate-600 mb-1">
                    To
                  </label>
                  <input
                    id="h-to"
                    type="date"
                    value={hTo}
                    onChange={(e) => setHTo(e.target.value)}
                    className="w-full px-2 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button type="submit" variant="primary" size="sm" disabled={histLoading}>
                <Search size={14} aria-hidden="true" />
                <span>खोजें / Search</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={histLoading}
                aria-label="Fetch latest government data"
              >
                <RefreshCw size={14} aria-hidden="true" />
                <span>Fetch Latest</span>
              </Button>
              {(hCommodity || hState || hDistrict || hFrom || hTo) && (
                <Button type="button" variant="outline" size="sm" onClick={handleHistReset} disabled={histLoading}>
                  Reset
                </Button>
              )}
            </div>
          </form>

          {/* Loading */}
          {histLoading && (
            <div className="flex items-center justify-center py-8 gap-3 text-slate-500">
              <Loader2 size={24} className="animate-spin text-blue-500" aria-hidden="true" />
              <span className="text-sm">Loading historical data…</span>
            </div>
          )}

          {/* Error */}
          {!histLoading && histError && (
            <div className="bg-white rounded-2xl border border-rose-100 p-5 flex flex-col items-center gap-3 text-center">
              <AlertCircle size={28} className="text-rose-400" aria-hidden="true" />
              <div>
                <p className="font-bold text-slate-900 text-sm">Historical data unavailable</p>
                <p className="text-xs text-slate-500 mt-1">{histError}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => fetchHistory({ commodity: hCommodity, state: hState })}>
                <RefreshCw size={14} />
                <span>Retry</span>
              </Button>
            </div>
          )}

          {/* Meta row */}
          {!histLoading && !histError && histMeta && (
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Database size={11} aria-hidden="true" />
                Source: {histMeta.source} &nbsp;·&nbsp; {histMeta.count ?? histPrices.length} records
              </span>
              {histMeta.note && (
                <span className="italic">{histMeta.note}</span>
              )}
            </div>
          )}

          {/* Empty */}
          {!histLoading && !histError && histPrices.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
              <History size={28} className="mx-auto text-slate-300 mb-2" aria-hidden="true" />
              <p className="font-bold text-slate-700 text-sm">No historical records found</p>
              <p className="text-xs text-slate-500 mt-1">
                {histMeta?.message || 'Click "Fetch Latest" to pull government mandi data into the database.'}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={handleRefresh} disabled={histLoading}>
                <RefreshCw size={14} />
                <span>Fetch Latest Government Data</span>
              </Button>
            </div>
          )}

          {/* Table */}
          {!histLoading && !histError && histPrices.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[520px]" aria-label="Historical mandi prices">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                        <span className="flex items-center gap-1"><CalendarDays size={11} aria-hidden="true" />Date</span>
                      </th>
                      <th className="px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Commodity
                      </th>
                      <th className="px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        <span className="flex items-center gap-1"><MapPin size={11} aria-hidden="true" />Market</span>
                      </th>
                      <th className="px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">
                        Min
                      </th>
                      <th className="px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">
                        Max
                      </th>
                      <th className="px-3 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right whitespace-nowrap">
                        Modal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {histPrices.map((rec, idx) => (
                      <HistoryRow key={`${rec.commodity}-${rec.market}-${rec.arrivalDate}-${idx}`} rec={rec} />
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between">
                <p className="text-[11px] text-slate-400">
                  {histPrices.length} record{histPrices.length !== 1 ? 's' : ''} &nbsp;·&nbsp;
                  Government mandi data · Not real-time
                </p>
                <Button variant="outline" size="sm" onClick={() => fetchHistory({ commodity: hCommodity, state: hState, district: hDistrict, from: hFrom, to: hTo })} disabled={histLoading}>
                  <RefreshCw size={13} />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

// ── Main Prices page ──────────────────────────────────────────────────────────

/**
 * Farmer Mandi Prices Page.
 *
 * Section 1: Current/latest market prices (from /api/market/prices, Step 6.0)
 * Section 2: Historical prices table (from /api/market/history, Step 7.0)
 *
 * Props:
 *   onNavigate — (viewKey: string) => void  callback into App.jsx currentView system
 */
export default function Prices({ onNavigate }) {
  const { language, t } = useLanguage()
  const [prices, setPrices]               = useState([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState(null)
  const [source, setSource]               = useState(null)
  const [sourceMessage, setSourceMessage] = useState(null)

  const [commodity, setCommodity]   = useState('')
  const [state, setState]           = useState('')
  const [stagedCommodity, setStagedCommodity] = useState('')
  const [stagedState, setStagedState]         = useState('')

  const fetchPrices = useCallback(async (filters = {}) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getMarketPrices({ limit: 20, ...filters })
      setPrices(data.prices || [])
      setSource(data.source || null)
      setSourceMessage(data.message || null)
    } catch (err) {
      setError(err?.message || 'Failed to load market prices.')
      setPrices([])
      setSource(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrices()
  }, [fetchPrices])

  const handleSearch = (e) => {
    e.preventDefault()
    setCommodity(stagedCommodity)
    setState(stagedState)
    fetchPrices({ commodity: stagedCommodity, state: stagedState, limit: 20 })
  }

  const handleReset = () => {
    setStagedCommodity('')
    setStagedState('')
    setCommodity('')
    setState('')
    fetchPrices()
  }

  const isFallback = source === 'fallback'

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
      <section aria-labelledby="prices-heading">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs shrink-0">
              <TrendingUp size={24} aria-hidden="true" />
            </div>
            <div>
              <h1 id="prices-heading" className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {t('prices', 'Mandi Prices')}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {t('liveMarketPrices', 'Live Market Prices')}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('home')} aria-label={t('goHome', 'Home')}>
            <Home size={16} />
            <span className="hidden sm:inline">{t('goHome', 'Home')}</span>
          </Button>
        </div>
      </section>

      {/* ── SOURCE NOTE ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs">
        <Info size={14} className="shrink-0 mt-0.5 text-blue-500" aria-hidden="true" />
        <p>
          <strong>Data source:</strong> data.gov.in (Govt. of India) — Daily government mandi data.
          Not real-time — reflects latest available market-day prices.
        </p>
      </div>

      {/* ── FALLBACK WARNING ─────────────────────────────────────────── */}
      {!loading && isFallback && (
        <div role="status" className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
          <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-500" aria-hidden="true" />
          <p><strong>Sample Data:</strong> {sourceMessage || 'Live mandi data currently unavailable. Showing sample prices.'}</p>
        </div>
      )}

      {/* ── CURRENT PRICE FILTER ─────────────────────────────────────── */}
      <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3" aria-label="Filter current prices">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {t('searchFilters', 'Search & Filters')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="commodity-filter" className="block text-xs font-semibold text-slate-600 mb-1">
              {t('commodity', 'Commodity')}
            </label>
            <input
              id="commodity-filter"
              type="text"
              list="commodity-list"
              value={stagedCommodity}
              onChange={(e) => setStagedCommodity(e.target.value)}
              placeholder="e.g. Wheat, Onion"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors"
            />
            <datalist id="commodity-list">
              {COMMON_COMMODITIES.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div>
            <label htmlFor="state-filter" className="block text-xs font-semibold text-slate-600 mb-1">
              {t('state', 'State')}
            </label>
            <select
              id="state-filter"
              value={stagedState}
              onChange={(e) => setStagedState(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors"
            >
              <option value="">{t('noResults', 'All States')}</option>
              {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <Button type="submit" variant="primary" size="sm" disabled={loading}>
            <Search size={15} aria-hidden="true" />
            <span>{t('search', 'Search')}</span>
          </Button>
          {(stagedCommodity || stagedState) && (
            <Button type="button" variant="outline" size="sm" onClick={handleReset} disabled={loading}>
              {t('resetFilters', 'Reset')}
            </Button>
          )}
        </div>
      </form>

      {/* ── CURRENT PRICES LIST ──────────────────────────────────────── */}
      <section aria-label="Latest market prices">
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-500">
            <Loader2 size={32} className="animate-spin text-emerald-500" aria-hidden="true" />
            <p className="text-sm font-medium">{t('loadingMarketPrices', 'Loading market prices…')}</p>
          </div>
        )}
        {!loading && error && (
          <div className="bg-white rounded-2xl border border-rose-100 p-6 flex flex-col items-center gap-3 text-center">
            <AlertCircle size={32} className="text-rose-400" aria-hidden="true" />
            <div>
              <p className="font-bold text-slate-900 text-sm">{t('noData', 'Data unavailable')}</p>
              <p className="text-xs text-slate-500 mt-1">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => fetchPrices({ commodity, state })}>
              <RefreshCw size={15} /><span>{t('retry', 'Retry')}</span>
            </Button>
          </div>
        )}
        {!loading && !error && prices.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
            <TrendingUp size={32} className="mx-auto text-slate-300 mb-3" aria-hidden="true" />
            <p className="font-bold text-slate-800">{t('noResults', 'No prices found')}</p>
            <p className="text-xs text-slate-500 mt-1">{t('noData', 'No mandi data found for this filter.')}</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={handleReset}>{t('viewAll', 'Show All')}</Button>
          </div>
        )}
        {!loading && !error && prices.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {prices.length} record{prices.length !== 1 ? 's' : ''}
              </p>
              {!isFallback && <p className="text-[11px] text-slate-400">Source: data.gov.in</p>}
            </div>
            {prices.map((price, idx) => (
              <MarketPriceCard
                key={`${price.commodity}-${price.market}-${idx}`}
                price={price}
                variant="compact"
                isFallback={isFallback}
                locale={language}
              />
            ))}
            <div className="pt-1 flex justify-center">
              <Button variant="outline" size="sm" onClick={() => fetchPrices({ commodity, state })} disabled={loading}>
                <RefreshCw size={15} /><span>{t('refresh', 'Refresh')}</span>
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ── DIVIDER ──────────────────────────────────────────────────── */}
      <div className="border-t border-slate-200" />

      {/* ── HISTORICAL PRICES SECTION (Step 7.0) ─────────────────────── */}
      <HistoricalPricesSection />

    </div>
  )
}
