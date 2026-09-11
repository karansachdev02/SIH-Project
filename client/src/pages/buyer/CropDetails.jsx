import { useState, useEffect, useCallback } from 'react'
import Card from '../../components/common/Card'
import { getMarketplaceCropById } from '../../services/marketplaceService'
import { createPrebooking } from '../../services/bookingService'
import { getFarmerReviews } from '../../services/reviewService'
import { useLanguage } from '../../context/LanguageContext'
import {
  ArrowLeft,
  MapPin,
  User,
  CheckCircle2,
  Package,
  CalendarDays,
  Tag,
  Star,
  Info,
  Loader2,
  AlertTriangle,
  ClipboardList,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// ── Helpers ───────────────────────────────────────────────────────────────────

function DetailRow({ icon: Icon, label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
        <Icon size={15} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-sm font-semibold text-slate-800 mt-0.5 leading-snug">{value}</p>
      </div>
    </div>
  )
}

function BackButton({ onNavigate, t }) {
  return (
    <button
      type="button"
      aria-label={t('backToMarketplace')}
      onClick={() => onNavigate?.('marketplace')}
      className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg px-1 py-0.5"
    >
      <ArrowLeft size={18} />
      {t('backToMarketplace')}
    </button>
  )
}

// ── Pre-booking form ──────────────────────────────────────────────────────────

function PrebookingForm({ crop, onSuccess, t }) {
  const maxQty = crop.quantity || 0
  const defaultUnit = crop.quantityUnit || 'quintal'

  const [qty,      setQty]      = useState('')
  const [unit,     setUnit]     = useState(defaultUnit)
  const [note,     setNote]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [formErr,  setFormErr]  = useState(null)

  const fmt = (val) => {
    const n = Number(val)
    return (!n || isNaN(n)) ? null : `₹${n.toLocaleString('en-IN')}`
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormErr(null)

    const parsedQty = Number(qty)
    if (!qty || !Number.isFinite(parsedQty) || parsedQty <= 0) {
      setFormErr(t('error'))
      return
    }
    if (parsedQty > maxQty) {
      setFormErr(`${t('quantity')} ${t('maxPrice', `Max ${maxQty}`)} ${defaultUnit}`)
      return
    }

    setLoading(true)
    try {
      const res = await createPrebooking(crop.id, {
        quantity:     parsedQty,
        quantityUnit: unit,
        buyerNote:    note.trim() || undefined,
      })
      onSuccess(res.booking)
    } catch (err) {
      setFormErr(err?.message || t('error'))
    } finally {
      setLoading(false)
    }
  }

  const priceStr = fmt(crop.expectedPrice)

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 space-y-4">
      <div>
        <p className="text-sm font-bold text-emerald-900">{t('preBookThisCrop')}</p>
        <p className="text-xs text-emerald-700 mt-0.5">
          {t('available')}: <strong>{maxQty} {defaultUnit}</strong>
          {priceStr && <span className="ml-2">· {t('expectedPriceLabel')}: <strong>{priceStr}/{defaultUnit}</strong></span>}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {/* Quantity + Unit */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('quantity')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              min="0.01"
              max={maxQty}
              step="any"
              placeholder={`Max ${maxQty}`}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">{t('unit')}</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              disabled={loading}
            />
          </div>
        </div>

        {/* Buyer note */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            {t('noteToFarmer')} <span className="text-slate-400">({t('noteOptional')})</span>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            rows={2}
            placeholder={t('noteToFarmerPlaceholder')}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white resize-none"
            disabled={loading}
          />
          <p className="text-[11px] text-slate-400 text-right mt-0.5">{note.length}/500</p>
        </div>

        {/* Error */}
        {formErr && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <span>{formErr}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-6 rounded-2xl bg-emerald-600 text-white font-bold text-base hover:bg-emerald-700 active:bg-emerald-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 size={18} className="animate-spin" /><span>{t('submittingBooking')}</span></>
          ) : (
            <><ClipboardList size={18} /><span>{t('submitBookingRequest')}</span></>
          )}
        </button>
      </form>
    </div>
  )
}

// ── Booking confirmation state helpers ────────────────────────────────────────

function BookingStatusBadge({ status }) {
  const cfg = {
    pending:   'bg-amber-100   text-amber-800   border-amber-200',
    confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    cancelled: 'bg-rose-100    text-rose-800    border-rose-200',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full border text-xs font-bold uppercase ${cfg[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {status}
    </span>
  )
}

function BookingRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-800">{value}</span>
    </div>
  )
}

// ── Booking confirmation state ─────────────────────────────────────────────────

function BookingSuccess({ booking, cropName, onNavigate, t }) {
  const fmt = (val) => {
    const n = Number(val)
    return (!n || isNaN(n)) ? '—' : `₹${n.toLocaleString('en-IN')}`
  }

  return (
    <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-6 space-y-4 text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
        <CheckCircle2 size={28} aria-hidden="true" />
      </div>
      <div>
        <p className="text-lg font-extrabold text-emerald-900">{t('bookingSubmitted')}</p>
        <p className="text-sm text-emerald-700 mt-1">{t('bookingSubmittedMsg')}</p>
      </div>
      <div className="bg-white rounded-xl border border-emerald-200 p-4 text-left space-y-2 text-sm">
        <BookingRow label={t('crop')}          value={cropName} />
        <BookingRow label={t('quantity')}      value={`${booking.quantity} ${booking.quantityUnit || 'quintal'}`} />
        <BookingRow label={t('agreedPrice')}   value={fmt(booking.agreedPrice)} />
        <BookingRow label={t('status')}        value={<BookingStatusBadge status={booking.status} />} />
        <BookingRow label={t('bookingRef')}    value={<span className="font-mono text-xs text-slate-500">{String(booking.id).slice(-8).toUpperCase()}</span>} />
      </div>
      <button
        type="button"
        onClick={() => onNavigate?.('my-bookings')}
        className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {t('viewMyBookings')}
      </button>
    </div>
  )
}

// ── Farmer reviews panel (lazy-loaded on CropDetails) ────────────────────────
function FarmerReviewsPanel({ farmerId, t }) {
  const [reviews,  setReviews]  = useState([])
  const [summary,  setSummary]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    getFarmerReviews(farmerId)
      .then((data) => {
        if (!cancelled) {
          setReviews(data.reviews || [])
          setSummary({ count: data.count, average: data.average, newSeller: data.newSeller })
        }
      })
      .catch(() => { /* silently skip panel on error */ })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [farmerId])

  if (loading) return null
  if (!summary || summary.newSeller) return null  // nothing to show for new sellers

  const shown = expanded ? reviews : reviews.slice(0, 2)

  return (
    <Card className="p-5 space-y-3">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg"
      >
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">
          {t('sellerReviews')} ({summary.count})
        </h2>
        <div className="flex items-center gap-2 shrink-0">
          <span className="flex items-center gap-0.5 text-sm font-bold text-amber-600">
            <Star size={14} fill="currentColor" aria-hidden="true" />
            {Number(summary.average).toFixed(1)}
          </span>
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="space-y-3">
          {shown.map((r) => (
            <div key={String(r.id)} className="border-t border-slate-100 pt-3 space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-0.5">
                  {[1,2,3,4,5].map((n) => (
                    <Star key={n} size={12}
                      className={n <= r.rating ? 'text-amber-400' : 'text-slate-200'}
                      fill={n <= r.rating ? 'currentColor' : 'none'}
                    />
                  ))}
                </div>
                <span className="text-[10px] text-slate-400 ml-auto">
                  {new Date(r.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
              </div>
              {r.review && <p className="text-xs text-slate-600 italic">&ldquo;{r.review}&rdquo;</p>}
              <p className="text-[10px] text-slate-400">{r.buyerName}</p>
            </div>
          ))}
          {reviews.length > 2 && !expanded && (
            <button type="button" onClick={() => setExpanded(true)}
              className="text-xs text-emerald-600 font-semibold hover:underline">
              {t('showAllReviews')} {reviews.length} {t('reviews')}
            </button>
          )}
        </div>
      )}
    </Card>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * CropDetails page — shows full detail for a single marketplace crop.
 *
 * Props:
 *   cropId     {string}  MongoDB ObjectId string of the crop to display
 *   onNavigate (viewKey, params?) => void
 */
export default function CropDetails({ cropId, onNavigate }) {
  const { t } = useLanguage()
  const [crop,           setCrop]           = useState(null)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)
  const [showForm,       setShowForm]       = useState(false)
  const [confirmedBooking, setConfirmedBooking] = useState(null)

  const fetchCrop = useCallback(async () => {
    if (!cropId) { setError(t('noData')); setLoading(false); return }
    setLoading(true); setError(null)
    try {
      const data = await getMarketplaceCropById(cropId)
      setCrop(data.crop)
    } catch (err) {
      const status = err?.status
      if (status === 404)      setError(t('noCropsAvailable'))
      else if (status === 400) setError(t('error'))
      else                     setError(err?.message || t('error'))
      setCrop(null)
    } finally {
      setLoading(false)
    }
  }, [cropId, t])

  useEffect(() => { fetchCrop() }, [fetchCrop])

  const fmt = (val) => {
    const n = Number(val)
    return (!n || isNaN(n)) ? null : `₹${n.toLocaleString('en-IN')}`
  }

  const formatDate = (val) => {
    if (!val) return null
    const d = new Date(val)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <BackButton onNavigate={onNavigate} t={t} />
        <div className="py-14 flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={28} className="animate-spin text-emerald-500" aria-hidden="true" />
          <p className="text-sm font-medium">{t('loading')}</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <BackButton onNavigate={onNavigate} t={t} />
        <Card className="text-center p-8 space-y-4">
          <AlertTriangle size={36} className="mx-auto text-amber-400" aria-hidden="true" />
          <p className="font-bold text-slate-700">{error}</p>
          <button type="button" onClick={() => onNavigate?.('marketplace')}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500">
            {t('backToMarketplace')}
          </button>
        </Card>
      </div>
    )
  }

  if (!crop) return null

  const { cropName, cropType, quantity, quantityUnit, expectedPrice,
          location, description, harvestDate, farmer, rating, createdAt } = crop

  const isVerified  = farmer?.verificationStatus === 'verified'
  const isNewSeller = rating?.newSeller ?? true
  const priceStr    = fmt(expectedPrice)
  const isAvailable = crop.status === 'available'

  const locationParts = [location, farmer?.village, farmer?.district, farmer?.state].filter(Boolean)
  const locationStr   = locationParts.join(', ') || null

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <BackButton onNavigate={onNavigate} t={t} />

      {/* Hero price card */}
      <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white rounded-2xl p-6 shadow-xl">
        <p className="text-emerald-300 text-sm font-medium uppercase tracking-wide mb-1">
          {cropType || t('cropListing')}
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight">{cropName}</h1>
        {priceStr ? (
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-4xl font-black text-amber-300">{priceStr}</span>
            <span className="text-emerald-200 text-sm font-medium">/ {quantityUnit || 'quintal'}</span>
          </div>
        ) : (
          <p className="mt-3 text-emerald-300 text-sm italic">{t('priceNotSpecified')}</p>
        )}
        <div className="flex items-center gap-2 mt-3 text-emerald-200 text-sm">
          <Package size={14} aria-hidden="true" />
          <span>{t('available')}: <strong className="text-white">{quantity} {quantityUnit || 'quintal'}</strong></span>
        </div>
      </div>

      {/* Crop details */}
      <Card className="p-0 divide-y divide-slate-100 overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{t('cropDetailsTitle')}</h2>
        </div>
        <div className="px-5">
          <DetailRow icon={Tag}          label={t('cropTypeLabel')}    value={cropType || null} />
          <DetailRow icon={Package}      label={t('quantity')}         value={`${quantity} ${quantityUnit || 'quintal'}`} />
          <DetailRow icon={MapPin}       label={t('location')}         value={locationStr} />
          <DetailRow icon={CalendarDays} label={t('harvestDateLabel')} value={formatDate(harvestDate)} />
          <DetailRow icon={Info}         label={t('description')}      value={description || null} />
          <DetailRow icon={CalendarDays} label={t('listedOn')}         value={formatDate(createdAt)} />
        </div>
      </Card>

      {/* Seller info */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-4">{t('sellerInformation')}</h2>
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <User size={22} aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-bold text-slate-900">{farmer?.name || t('farmer')}</p>
            <div className="flex flex-wrap items-center gap-2">
              {isVerified ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  <CheckCircle2 size={11} />{t('verifiedFarmerBadge')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium">
                  {t('verificationPendingBadge')}
                </span>
              )}
              {isNewSeller && (
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold uppercase tracking-wide">{t('newSellerBadge')}</span>
              )}
            </div>
            {!isNewSeller && rating?.average !== null && (
              <div className="flex items-center gap-1 text-sm text-amber-600 font-semibold">
                <Star size={14} aria-hidden="true" />
                <span>{Number(rating.average).toFixed(1)}</span>
                <span className="text-slate-400 font-normal text-xs">({rating.count} {t('ratingsCount')})</span>
              </div>
            )}
            {isNewSeller && <p className="text-xs text-slate-500">{t('noRatingsYet')}</p>}
            {(farmer?.district || farmer?.state) && (
              <p className="text-xs text-slate-500 flex items-center gap-1">
                <MapPin size={11} className="text-slate-400" />
                {[farmer.district, farmer.state].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Farmer reviews panel */}
      {farmer?.id && (
        <FarmerReviewsPanel farmerId={String(farmer.id)} t={t} />
      )}

      {/* Pre-booking section */}
      {confirmedBooking ? (
        <BookingSuccess booking={confirmedBooking} cropName={cropName} onNavigate={onNavigate} t={t} />
      ) : isAvailable ? (
        showForm ? (
          <PrebookingForm
            crop={crop}
            onSuccess={(booking) => { setShowForm(false); setConfirmedBooking(booking) }}
            onNavigate={onNavigate}
            t={t}
          />
        ) : (
          <div className="rounded-2xl border border-emerald-200 p-5 text-center space-y-3 bg-white">
            <p className="text-sm font-bold text-slate-700">{t('interestedInCrop')}</p>
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="w-full py-3 px-6 rounded-2xl bg-emerald-600 text-white font-bold text-base hover:bg-emerald-700 active:bg-emerald-800 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 flex items-center justify-center gap-2"
            >
              <ClipboardList size={20} />
              {t('preBookCrop')}
            </button>
          </div>
        )
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-slate-300 p-5 text-center space-y-2">
          <AlertTriangle size={20} className="mx-auto text-amber-500" />
          <p className="text-sm font-bold text-slate-600">{t('cropNoLongerAvailable')}</p>
          <p className="text-xs text-slate-400">{t('cropClosedByFarmer')}</p>
        </div>
      )}
    </div>
  )
}
