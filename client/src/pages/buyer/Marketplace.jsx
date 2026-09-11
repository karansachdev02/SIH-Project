import { useState, useCallback, useEffect } from 'react'
import Card from '../../components/common/Card'
import MarketplaceCropCard from '../../components/common/MarketplaceCropCard'
import VoiceInput from '../../components/common/VoiceInput'
import { getMarketplaceCrops } from '../../services/marketplaceService'
import { useLanguage } from '../../context/LanguageContext'
import {
  ShoppingBag,
  Search,
  SlidersHorizontal,
  Loader2,
  X,
  ArrowLeft,
  Wheat,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ hasFilters, onClear }) {
  const { t } = useLanguage()
  return (
    <div className="py-14 flex flex-col items-center gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
        <Wheat size={32} aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <p className="font-bold text-slate-700">
          {hasFilters ? t('noCropsMatch', 'No crops match your filters') : t('noCropsAvailable', 'No crops are currently available.')}
        </p>
        <p className="text-sm text-slate-500">
          {hasFilters
            ? t('tryAdjustFilters', 'Try adjusting your search or filters.')
            : t('checkBackSoon', 'Check back soon — farmers are adding listings.')}
        </p>
      </div>
      {hasFilters && (
        <button
          type="button"
          onClick={onClear}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {t('clearFilters', 'Clear Filters')}
        </button>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * Buyer Marketplace page.
 *
 * Props:
 *   onNavigate  (viewKey, params?) => void  — App.jsx navigation callback
 */
export default function Marketplace({ onNavigate }) {
  const { t } = useLanguage()
  // ── Search / filter state ─────────────────────────────────────────────────
  const [search,    setSearch]    = useState('')
  const [state,     setState]     = useState('')
  const [district,  setDistrict]  = useState('')
  const [minPrice,  setMinPrice]  = useState('')
  const [maxPrice,  setMaxPrice]  = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  // ── Staged search (only applied on submit) ────────────────────────────────
  const [appliedSearch,   setAppliedSearch]   = useState('')
  const [appliedState,    setAppliedState]    = useState('')
  const [appliedDistrict, setAppliedDistrict] = useState('')
  const [appliedMinPrice, setAppliedMinPrice] = useState('')
  const [appliedMaxPrice, setAppliedMaxPrice] = useState('')

  // ── Result state ──────────────────────────────────────────────────────────
  const [crops,   setCrops]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [count,   setCount]   = useState(0)

  // ── Fetch crops ───────────────────────────────────────────────────────────
  const fetchCrops = useCallback(async (filters) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getMarketplaceCrops(filters)
      setCrops(data.crops || [])
      setCount(data.count || 0)
    } catch (err) {
      setError(err?.message || 'Failed to load marketplace. Please try again.')
      setCrops([])
      setCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial load — all available crops
  useEffect(() => {
    fetchCrops({})
  }, [fetchCrops])

  // ── Apply filters / search ────────────────────────────────────────────────
  const handleSearch = (e) => {
    e.preventDefault()
    const filters = {
      search:   search.trim()   || undefined,
      state:    state.trim()    || undefined,
      district: district.trim() || undefined,
      minPrice: minPrice !== '' ? minPrice : undefined,
      maxPrice: maxPrice !== '' ? maxPrice : undefined,
    }
    setAppliedSearch(search.trim())
    setAppliedState(state.trim())
    setAppliedDistrict(district.trim())
    setAppliedMinPrice(minPrice)
    setAppliedMaxPrice(maxPrice)
    fetchCrops(filters)
  }

  const handleClearAll = () => {
    setSearch('')
    setState('')
    setDistrict('')
    setMinPrice('')
    setMaxPrice('')
    setAppliedSearch('')
    setAppliedState('')
    setAppliedDistrict('')
    setAppliedMinPrice('')
    setAppliedMaxPrice('')
    fetchCrops({})
  }

  const hasFilters = !!(
    appliedSearch || appliedState || appliedDistrict ||
    appliedMinPrice || appliedMaxPrice
  )

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={t('back', 'Go back')}
          onClick={() => onNavigate?.('buyer-authenticated')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <ShoppingBag size={22} className="text-emerald-600" aria-hidden="true" />
            {t('marketplaceTitle', 'Marketplace')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('marketplaceSublabel', 'Browse crops from verified farmers')}</p>
        </div>
        {count > 0 && !loading && (
          <span className="ml-auto px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            {count} {count !== 1 ? t('cropsFound', 'crops found') : t('cropAvailable', 'crop available')}
          </span>
        )}
      </div>

      {/* ── SEARCH + FILTER FORM ────────────────────────────────────────── */}
      <Card className="p-4">
        <form onSubmit={handleSearch} className="space-y-3">
          {/* Search bar + voice input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchCrops', 'Search crops…')}
                className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            {/* Voice input — populates search field */}
            <VoiceInput
              value={search}
              onChange={setSearch}
              placeholder="Search crops…"
              className="shrink-0"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 shrink-0"
            >
              {t('search', 'Search')}
            </button>
          </div>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-emerald-700 transition-colors focus:outline-none"
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            <span>{t('filterLabel', 'Filter')}</span>
            {filtersOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {hasFilters && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold">
                Active
              </span>
            )}
          </button>

          {/* Collapsible filters */}
          {filtersOpen && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('state', 'State')}</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="e.g. Madhya Pradesh"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('district', 'District')}</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="e.g. Indore"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('minPriceLabel', 'Min Price')} (₹)</label>
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">{t('maxPriceLabel', 'Max Price')} (₹)</label>
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Any"
                  min="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
                />
              </div>
            </div>
          )}

          {/* Active filter pills + clear */}
          {hasFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {appliedSearch   && <FilterPill label={`"${appliedSearch}"`} />}
              {appliedState    && <FilterPill label={appliedState} />}
              {appliedDistrict && <FilterPill label={appliedDistrict} />}
              {(appliedMinPrice || appliedMaxPrice) && (
                <FilterPill label={`₹${appliedMinPrice || '0'} – ₹${appliedMaxPrice || '∞'}`} />
              )}
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-rose-600 hover:underline ml-1 focus:outline-none"
              >
                {t('clearFilters', 'Clear all')}
              </button>
            </div>
          )}
        </form>
      </Card>

      {/* ── ERROR ───────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => fetchCrops({})}
            className="text-xs font-semibold underline hover:no-underline shrink-0"
          >
            {t('retry', 'Retry')}
          </button>
        </div>
      )}

      {/* ── LOADING ─────────────────────────────────────────────────────── */}
      {loading && (
        <div className="py-12 flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={28} className="animate-spin text-emerald-500" aria-hidden="true" />
          <p className="text-sm font-medium">{t('loading', 'Loading...')}</p>
        </div>
      )}

      {/* ── CROP LIST ───────────────────────────────────────────────────── */}
      {!loading && !error && crops.length === 0 && (
        <EmptyState hasFilters={hasFilters} onClear={handleClearAll} />
      )}

      {!loading && !error && crops.length > 0 && (
        <div className="space-y-3">
          {crops.map((crop) => (
            <MarketplaceCropCard
              key={crop.id}
              crop={crop}
              onViewDetails={(id) => onNavigate?.('crop-details', { cropId: id })}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Filter pill helper ────────────────────────────────────────────────────────
function FilterPill({ label }) {
  return (
    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-medium">
      {label}
    </span>
  )
}
