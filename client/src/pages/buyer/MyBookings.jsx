import { useState, useCallback, useEffect } from 'react'
import { getBuyerBookings, downloadBookingPdf } from '../../services/bookingService'
import { createReview, getBookingReview } from '../../services/reviewService'
import { getBuyerDeliveries } from '../../services/deliveryService'
import { getBuyerTransactions } from '../../services/transactionService'
import { useLanguage } from '../../context/LanguageContext'
import {
  ArrowLeft,
  ClipboardList,
  Loader2,
  RefreshCw,
  Package,
  MapPin,
  CalendarDays,
  User,
  Download,
  Star,
  CheckCircle2,
  Truck,
  CreditCard,
} from 'lucide-react'

// ── Star rating picker ────────────────────────────────────────────────────────
function StarPicker({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          disabled={disabled}
          onClick={() => onChange(n)}
          className={`p-0.5 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 ${
            n <= value ? 'text-amber-400' : 'text-slate-300 hover:text-amber-300'
          }`}
        >
          <Star size={22} fill={n <= value ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )
}

// ── Inline review form (shown on completed, unreviewed bookings) ──────────────
function ReviewForm({ bookingId, onReviewed }) {
  const [rating,      setRating]      = useState(0)
  const [reviewText,  setReviewText]  = useState('')
  const [submitting,  setSubmitting]  = useState(false)
  const [submitErr,   setSubmitErr]   = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) { setSubmitErr('Please select a star rating.'); return }
    setSubmitErr(null)
    setSubmitting(true)
    try {
      const res = await createReview({
        bookingId,
        rating,
        review: reviewText.trim() || undefined,
      })
      onReviewed(res.review)
    } catch (err) {
      setSubmitErr(err?.message || 'Failed to submit review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const { t } = useLanguage()
  return (
    <form onSubmit={handleSubmit} className="mt-2 space-y-3 border-t border-slate-100 pt-3">
      <p className="text-xs font-bold text-slate-700">{t('rateAndReview', 'Rate & Review this Farmer')}</p>
      <StarPicker value={rating} onChange={setRating} disabled={submitting} />
      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value.slice(0, 500))}
        rows={2}
        placeholder={t('reviewPlaceholder', 'Share your experience (optional, max 500 chars)')}
        disabled={submitting}
        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400">{reviewText.length}/500</span>
        <button
          type="submit"
          disabled={submitting || rating === 0}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting
            ? <><Loader2 size={12} className="animate-spin" /><span>{t('loading', 'Submitting…')}</span></>
            : <><Star size={12} /><span>{t('submitReview', 'Submit Review')}</span></>}
        </button>
      </div>
      {submitErr && (
        <p className="text-[11px] text-rose-600 font-medium">{submitErr}</p>
      )}
    </form>
  )
}

// ── Submitted review display ──────────────────────────────────────────────────
function ReviewDisplay({ review }) {
  return (
    <div className="mt-2 border-t border-slate-100 pt-3 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <Star
              key={n}
              size={14}
              className={n <= review.rating ? 'text-amber-400' : 'text-slate-200'}
              fill={n <= review.rating ? 'currentColor' : 'none'}
            />
          ))}
        </div>
        <span className="text-xs font-bold text-amber-700">{review.rating}/5</span>
        <span className="ml-auto flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
          <CheckCircle2 size={10} />{/* reviewed label — no useLanguage needed in this pure display helper */}Reviewed
        </span>
      </div>
      {review.review && (
        <p className="text-xs text-slate-600 italic">&ldquo;{review.review}&rdquo;</p>
      )}
    </div>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_LABELS = {
  pending:   'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

function StatusBadge({ status }) {
  const cfg = {
    pending:   'bg-amber-100   text-amber-800   border-amber-200',
    confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    completed: 'bg-blue-100    text-blue-800    border-blue-200',
    cancelled: 'bg-rose-100    text-rose-800    border-rose-200',
  }
  return (
    <span className={`px-2 py-0.5 rounded-full border text-xs font-bold uppercase tracking-wide ${cfg[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

// ── Booking card ──────────────────────────────────────────────────────────────
function BookingCard({ booking, deliveryId, transactionId, onNavigate }) {
  const [downloading,  setDownloading]  = useState(false)
  const [dlError,      setDlError]      = useState(null)
  // Review state — loaded lazily when booking.status === 'completed'
  const [reviewData,   setReviewData]   = useState(null)   // null = not loaded yet
  const [reviewLoaded, setReviewLoaded] = useState(false)

  const isCompleted = booking.status === 'completed'

  const fmt = (val) => {
    const n = Number(val)
    return (!n || isNaN(n)) ? '—' : `₹${n.toLocaleString('en-IN')}`
  }
  const formatDate = (val) => {
    if (!val) return '—'
    const d = new Date(val)
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Load review status when this is a completed booking
  useEffect(() => {
    if (!isCompleted) return
    let cancelled = false
    getBookingReview(String(booking.id))
      .then((data) => {
        if (!cancelled) {
          setReviewData(data.reviewed ? data.review : null)
          setReviewLoaded(true)
        }
      })
      .catch(() => {
        if (!cancelled) setReviewLoaded(true) // silently allow re-try on submit
      })
    return () => { cancelled = true }
  }, [booking.id, isCompleted])

  async function handleDownload() {
    setDownloading(true)
    setDlError(null)
    try {
      await downloadBookingPdf(String(booking.id))
    } catch (err) {
      setDlError(err?.message || 'Download failed. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const crop   = booking.crop   || {}
  const farmer = booking.farmer || {}

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-900 text-base leading-tight">
            {crop.cropName || 'Crop'}
          </p>
          {crop.cropType && <p className="text-xs text-slate-500 mt-0.5">{crop.cropType}</p>}
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* Details */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <Package size={12} className="text-slate-400" />
          {booking.quantity} {booking.quantityUnit || 'quintal'}
        </span>
        {booking.agreedPrice && (
          <span className="flex items-center gap-1 font-semibold text-emerald-700">
            {fmt(booking.agreedPrice)}/{booking.quantityUnit || 'quintal'}
          </span>
        )}
        {crop.location && (
          <span className="flex items-center gap-1">
            <MapPin size={12} className="text-slate-400" />
            {crop.location}
          </span>
        )}
        <span className="flex items-center gap-1">
          <CalendarDays size={12} className="text-slate-400" />
          {formatDate(booking.createdAt)}
        </span>
      </div>

      {/* Farmer */}
      {farmer.name && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500 border-t border-slate-100 pt-2">
          <User size={12} className="text-slate-400" />
          <span>Farmer: <strong className="text-slate-700">{farmer.name}</strong></span>
          {(farmer.district || farmer.state) && (
            <span className="text-slate-400">· {[farmer.district, farmer.state].filter(Boolean).join(', ')}</span>
          )}
        </div>
      )}

      {/* Confirmed — awaiting completion notice */}
      {booking.status === 'confirmed' && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-xs text-emerald-800 font-medium">
          Order confirmed — awaiting farmer completion
        </div>
      )}

      {/* Completed — success indicator */}
      {booking.status === 'completed' && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 text-xs text-blue-800 font-medium">
          Order completed
        </div>
      )}

      {/* Notes */}
      {booking.farmerNote && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-xs text-emerald-900">
          <span className="font-semibold">Farmer note: </span>{booking.farmerNote}
        </div>
      )}
      {booking.buyerNote && (
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-xs text-slate-700">
          <span className="font-semibold">Your note: </span>{booking.buyerNote}
        </div>
      )}

      {/* Bottom row: Ref + Download + Track Delivery */}
      <div className="flex items-center justify-between gap-3 pt-0.5 flex-wrap">
        <p className="text-[11px] text-slate-400">
          Ref: <span className="font-mono">{String(booking.id).slice(-8).toUpperCase()}</span>
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Track Delivery button — only for confirmed/completed bookings with a delivery */}
          {deliveryId && (booking.status === 'confirmed' || booking.status === 'completed') && (
            <button
              type="button"
              onClick={() => onNavigate?.('delivery-tracking', { deliveryId: String(deliveryId) })}
              aria-label="Track Delivery"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Truck size={12} />
              Track Delivery
            </button>
          )}
          {/* Payment button — for confirmed/completed bookings with a transaction */}
          {transactionId && (booking.status === 'confirmed' || booking.status === 'completed') && (
            <button
              type="button"
              onClick={() => onNavigate?.('buyer-transactions')}
              aria-label="View Payment"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100 transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <CreditCard size={12} />
              Payment
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            aria-label="Download booking slip PDF"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading
              ? <Loader2 size={12} className="animate-spin" />
              : <Download size={12} />}
            {downloading ? 'Downloading…' : 'Download Slip'}
          </button>
        </div>
      </div>

      {/* Download error */}
      {dlError && (
        <p className="text-[11px] text-rose-600 font-medium">{dlError}</p>
      )}

      {/* ── Review section — completed bookings only ──────────────────── */}
      {isCompleted && reviewLoaded && (
        reviewData
          ? <ReviewDisplay review={reviewData} />
          : <ReviewForm
              bookingId={String(booking.id)}
              onReviewed={(rev) => setReviewData(rev)}
            />
      )}
      {isCompleted && !reviewLoaded && (
        <div className="mt-2 border-t border-slate-100 pt-3 flex items-center gap-2 text-xs text-slate-400">
          <Loader2 size={12} className="animate-spin" />
          <span>Loading review status…</span>
        </div>
      )}
    </div>
  )
}

// ── Filter tab keys (labels resolved with t() inside render) ─────────────────
const TAB_KEYS = [
  { key: '',          labelKey: 'viewAll', fallback: 'All' },
  { key: 'pending',   labelKey: 'pending', fallback: 'Pending' },
  { key: 'confirmed', labelKey: 'confirmed', fallback: 'Confirmed' },
  { key: 'completed', labelKey: 'completed', fallback: 'Completed' },
  { key: 'cancelled', labelKey: 'cancelled', fallback: 'Cancelled' },
]

// ── Main component ────────────────────────────────────────────────────────────

/**
 * MyBookings — buyer's booking history.
 * Props: onNavigate
 */
export default function MyBookings({ onNavigate }) {
  const { t } = useLanguage()
  const [activeTab,      setActiveTab]      = useState('')
  const [bookings,       setBookings]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState(null)
  // Map bookingId -> deliveryId for Track Delivery buttons
  const [deliveryMap,    setDeliveryMap]    = useState({})
  // Map bookingId -> transactionId for Payment buttons
  const [transactionMap, setTransactionMap] = useState({})

  // Load deliveries silently in background to build booking->delivery map
  useEffect(() => {
    let cancelled = false
    getBuyerDeliveries()
      .then((data) => {
        if (cancelled) return
        const map = {}
        ;(data.deliveries || []).forEach((d) => {
          const bookingId = d.booking?.id || String(d.booking || '')
          if (bookingId) map[bookingId] = String(d.id)
        })
        setDeliveryMap(map)
      })
      .catch(() => { /* silent — delivery map is best-effort */ })
    return () => { cancelled = true }
  }, [])

  // Load transactions silently to build booking->transaction map
  useEffect(() => {
    let cancelled = false
    getBuyerTransactions()
      .then((data) => {
        if (cancelled) return
        const map = {}
        ;(data.transactions || []).forEach((t) => {
          const bookingId = t.booking?.id || String(t.booking || '')
          if (bookingId) map[bookingId] = String(t.id)
        })
        setTransactionMap(map)
      })
      .catch(() => { /* silent — transaction map is best-effort */ })
    return () => { cancelled = true }
  }, [])

  const fetchBookings = useCallback(async (status) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getBuyerBookings(status ? { status } : {})
      setBookings(data.bookings || [])
    } catch (err) {
      setError(err?.message || 'Failed to load bookings. Please try again.')
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings(activeTab)
  }, [fetchBookings, activeTab])

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={t('back', 'Back')}
          onClick={() => onNavigate?.('buyer-authenticated')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <ClipboardList size={22} className="text-emerald-600" />
            {t('myBookings', 'My Bookings')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('myBookingsSublabel', 'Track your crop pre-booking requests')}</p>
        </div>
        <button
          type="button"
          aria-label={t('refresh', 'Refresh')}
          onClick={() => fetchBookings(activeTab)}
          disabled={loading}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TAB_KEYS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              activeTab === tab.key
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
            }`}
          >
            {t(tab.labelKey, tab.fallback)}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => fetchBookings(activeTab)}
            className="text-xs font-semibold underline hover:no-underline shrink-0">{t('retry', 'Retry')}</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-12 flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={28} className="animate-spin text-emerald-500" />
          <p className="text-sm font-medium">{t('loading', 'Loading...')}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && bookings.length === 0 && (
        <div className="py-14 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <ClipboardList size={32} />
          </div>
          <div>
            <p className="font-bold text-slate-700">
              {activeTab ? `${t(activeTab, activeTab)} ${t('noBookings', 'No bookings yet').replace('अभी कोई ', '').replace(' नहीं', '')}` : t('noBookings', 'No bookings yet')}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {activeTab
                ? t('tryAdjustFilters', 'Try a different filter.')
                : t('marketplaceSublabel', 'Browse the marketplace and pre-book a crop to get started.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('marketplace')}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {t('marketplace', 'Browse Marketplace')}
          </button>
        </div>
      )}

      {/* List */}
      {!loading && !error && bookings.length > 0 && (
        <div className="space-y-3">
          {bookings.map((b) => (
            <BookingCard
              key={String(b.id)}
              booking={b}
              deliveryId={deliveryMap[String(b.id)] || null}
              transactionId={transactionMap[String(b.id)] || null}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  )
}
