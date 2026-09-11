import { TrendingUp, MapPin, CalendarDays, AlertTriangle } from 'lucide-react'
import SpeakButton from './SpeakButton'
import { useLanguage } from '../../context/LanguageContext'

/**
 * MarketPriceCard — reusable component for displaying a single mandi price record.
 *
 * Two variants:
 *   "hero"    — large dark gradient card used on FarmerHome dashboard (one record, prominent)
 *   "compact" — smaller white card used in the Prices list page (multiple records)
 *
 * Props:
 *   price      {object}  — normalised price record from the backend
 *   variant    {string}  — 'hero' | 'compact'  (default: 'compact')
 *   isFallback {boolean} — true when source is 'fallback'; shows sample-data label
 */
export default function MarketPriceCard({ price, variant = 'compact', isFallback = false, locale }) {
  const { t } = useLanguage()

  if (!price) return null

  const {
    commodity,
    variety,
    market,
    district,
    state,
    modalPrice,
    minPrice,
    maxPrice,
    unit,
    date,
  } = price

  // Format price with Indian locale — handles numbers safely
  const fmt = (val) => {
    const n = Number(val)
    if (!n || isNaN(n)) return '–'
    return `₹${n.toLocaleString('en-IN')}`
  }

  const locationParts = [market, district, state].filter(Boolean)
  const locationStr   = locationParts.join(', ') || null

  const commodityDisplay = variety && variety !== 'Common' && variety !== ''
    ? `${commodity} (${variety})`
    : commodity

  // ── HERO variant — dark gradient, used on FarmerHome ──────────────────────
  if (variant === 'hero') {
    return (
      <div className="bg-gradient-to-br from-emerald-900 via-emerald-850 to-teal-900 text-white rounded-2xl relative overflow-hidden p-6 shadow-xl border-none">
        {/* Decorative background icon */}
        <TrendingUp
          className="absolute -right-6 -bottom-6 w-40 h-40 text-emerald-500/10 pointer-events-none"
          aria-hidden="true"
        />

        {/* Header row */}
        <div className="flex items-center justify-between mb-4 border-b border-emerald-700/50 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700/60 text-emerald-300 flex items-center justify-center">
              <TrendingUp size={20} aria-hidden="true" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-wide">
              {t('todaysMandiBhav', "Today's Mandi Rate")}
            </h2>
          </div>

          {/* Source / fallback badge */}
          {isFallback ? (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-200 text-xs font-semibold border border-amber-400/30">
              <AlertTriangle size={12} aria-hidden="true" />
              <span>{t('sampleDataLabel', 'Sample Data / Demo')}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600/30 text-emerald-200 text-xs font-semibold border border-emerald-500/30">
              <TrendingUp size={12} aria-hidden="true" />
              <span>{t('latestDataLabel', 'Latest Available Data')}</span>
            </div>
          )}
        </div>

        {/* Price metrics */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="text-emerald-300 text-sm font-semibold tracking-wider uppercase">
              {t('commodity', 'Commodity')}
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
              {commodityDisplay || '–'}
            </div>
            {locationStr && (
              <div className="flex items-center gap-1.5 mt-2 text-emerald-300 text-xs">
                <MapPin size={12} aria-hidden="true" />
                <span>{locationStr}</span>
              </div>
            )}
          </div>

          <div className="bg-emerald-800/50 backdrop-blur-xs rounded-2xl p-4 border border-emerald-700/50 flex flex-col gap-1.5 sm:items-end">
            <div className="text-xs text-emerald-200 font-medium">
              {t('mandiRate', 'Mandi Rate')}
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-300">
              {fmt(modalPrice)}{' '}
              <span className="text-sm font-medium text-emerald-100">/ {unit || 'Quintal'}</span>
            </div>
            {(minPrice > 0 || maxPrice > 0) && (
              <div className="text-[11px] text-emerald-300 font-medium">
                Min {fmt(minPrice)} — Max {fmt(maxPrice)}
              </div>
            )}
            {date && (
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-0.5">
                <CalendarDays size={11} aria-hidden="true" />
                <span>{date}</span>
              </div>
            )}
          </div>
        </div>

        {/* Source attribution */}
        {!isFallback && (
          <p className="mt-3 text-[11px] text-emerald-500 text-right">
            {t('sourceAttribution', 'Source: data.gov.in (Daily Market Data)')}
          </p>
        )}
      </div>
    )
  }

  // ── COMPACT variant — white card, used in Prices list ────────────────────
  const speakText = `${commodityDisplay || 'Crop'}, ${locationStr || ''}, price ${fmt(modalPrice)} per ${unit || 'Quintal'}.`
  return (
    <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs p-4 space-y-2.5">
      {/* Top row: commodity + modal price + speak */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-bold text-slate-900 truncate">{commodityDisplay || '–'}</p>
          {locationStr && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
              <MapPin size={11} className="text-slate-400 shrink-0" aria-hidden="true" />
              <span className="truncate">{locationStr}</span>
            </div>
          )}
        </div>
        <div className="text-right shrink-0 flex items-start gap-1.5">
          <div>
            <p className="text-lg font-extrabold text-emerald-700">{fmt(modalPrice)}</p>
            <p className="text-[11px] text-slate-400">/ {unit || 'Quintal'}</p>
          </div>
          <SpeakButton text={speakText} language={locale} label={commodityDisplay} size={13} />
        </div>
      </div>

      {/* Min / Max row */}
      {(minPrice > 0 || maxPrice > 0) && (
        <div className="flex gap-4 text-xs text-slate-600 border-t border-slate-100 pt-2">
          <span>
            <span className="text-slate-400">Min </span>
            <span className="font-semibold">{fmt(minPrice)}</span>
          </span>
          <span>
            <span className="text-slate-400">Max </span>
            <span className="font-semibold">{fmt(maxPrice)}</span>
          </span>
          {date && (
            <span className="ml-auto flex items-center gap-1 text-slate-400">
              <CalendarDays size={11} aria-hidden="true" />
              {date}
            </span>
          )}
        </div>
      )}

      {/* Fallback label */}
      {isFallback && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1">
          <AlertTriangle size={11} aria-hidden="true" />
          <span>{t('sampleDataLabel', 'Sample Data / Demo')} — actual prices may differ</span>
        </div>
      )}
    </div>
  )
}
