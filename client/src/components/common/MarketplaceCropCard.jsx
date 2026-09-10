import { MapPin, User, CheckCircle2, Star, Package } from 'lucide-react'

/**
 * MarketplaceCropCard — displays a single crop listing from the marketplace.
 *
 * Props:
 *   crop        {object}   crop document from /api/marketplace/crops
 *   onViewDetails (id) => void  callback to open crop detail view
 */
export default function MarketplaceCropCard({ crop, onViewDetails }) {
  if (!crop) return null

  const {
    id,
    cropName,
    cropType,
    quantity,
    quantityUnit,
    expectedPrice,
    location,
    farmer,
    rating,
  } = crop

  const fmt = (val) => {
    const n = Number(val)
    if (!n || isNaN(n)) return null
    return `₹${n.toLocaleString('en-IN')}`
  }

  const priceStr = fmt(expectedPrice)
  const isVerified = farmer?.verificationStatus === 'verified'
  const isNewSeller = rating?.newSeller ?? true

  // Location: prefer crop's own location field, fall back to farmer's district/state
  const locationParts = [
    location,
    !location && farmer?.district,
    !location && farmer?.state,
  ].filter(Boolean)
  const locationStr = locationParts[0] || null

  return (
    <div className="bg-white rounded-2xl border border-emerald-100 shadow-sm p-4 space-y-3 hover:shadow-md hover:border-emerald-200 transition-all">

      {/* ── Top row: crop name + price ──────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-900 leading-tight">{cropName}</h3>
          {cropType && (
            <p className="text-xs text-slate-500 mt-0.5">{cropType}</p>
          )}
        </div>

        {priceStr ? (
          <div className="text-right shrink-0">
            <p className="text-lg font-extrabold text-emerald-700">{priceStr}</p>
            <p className="text-[11px] text-slate-400">/ {quantityUnit || 'quintal'}</p>
          </div>
        ) : (
          <span className="text-xs text-slate-400 italic">Price TBD</span>
        )}
      </div>

      {/* ── Details row ─────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <Package size={12} className="text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-700">{quantity}</span>
          <span>{quantityUnit || 'quintal'}</span>
        </span>

        {locationStr && (
          <span className="flex items-center gap-1">
            <MapPin size={12} className="text-slate-400" aria-hidden="true" />
            <span>{locationStr}</span>
          </span>
        )}
      </div>

      {/* ── Farmer row ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <User size={14} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-800 truncate">
              {farmer?.name || 'Farmer'}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {isVerified && (
                <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700">
                  <CheckCircle2 size={10} aria-hidden="true" />
                  Verified
                </span>
              )}
              {isNewSeller && (
                <span className="px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wide">
                  New Seller
                </span>
              )}
              {!isNewSeller && rating?.average !== null && (
                <span className="flex items-center gap-0.5 text-[10px] text-amber-600 font-semibold">
                  <Star size={10} aria-hidden="true" />
                  {Number(rating.average).toFixed(1)} ({rating.count})
                </span>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onViewDetails?.(id)}
          className="shrink-0 px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 active:bg-emerald-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-1"
        >
          View Details
        </button>
      </div>
    </div>
  )
}
