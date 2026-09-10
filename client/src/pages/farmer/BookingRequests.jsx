import { useState, useCallback, useEffect } from 'react'
import { getFarmerBookings, updateBookingStatus } from '../../services/bookingService'
import {
  ArrowLeft,
  ClipboardList,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Package,
  MapPin,
  CalendarDays,
  User,
  CheckCircle2,
  XCircle,
  Star,
} from 'lucide-react'

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

// ── Single booking request card ───────────────────────────────────────────────
function BookingRequestCard({ booking, onActionDone }) {
  const [cancelling, setCancelling] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [cancelNote, setCancelNote] = useState('')
  const [showCancel, setShowCancel] = useState(false)
  const [actionErr,  setActionErr]  = useState(null)

  const fmt = (val) => {
    const n = Number(val)
    return (!n || isNaN(n)) ? '—' : `₹${n.toLocaleString('en-IN')}`
  }
  const formatDate = (val) => {
    if (!val) return '—'
    const d = new Date(val)
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const crop        = booking.crop  || {}
  const buyer       = booking.buyer || {}
  const isPending   = booking.status === 'pending'
  const isConfirmed = booking.status === 'confirmed'

  const [completing, setCompleting] = useState(false)

  const handleConfirm = async () => {
    setActionErr(null)
    setConfirming(true)
    try {
      await updateBookingStatus(booking.id, { status: 'confirmed' })
      onActionDone()
    } catch (err) {
      setActionErr(err?.message || 'Failed to confirm. Please try again.')
    } finally {
      setConfirming(false)
    }
  }

  const handleComplete = async () => {
    setActionErr(null)
    setCompleting(true)
    try {
      await updateBookingStatus(booking.id, { status: 'completed' })
      onActionDone()
    } catch (err) {
      setActionErr(err?.message || 'Failed to mark as completed. Please try again.')
    } finally {
      setCompleting(false)
    }
  }

  const handleCancel = async () => {
    setActionErr(null)
    setCancelling(true)
    try {
      await updateBookingStatus(booking.id, {
        status:     'cancelled',
        farmerNote: cancelNote.trim() || undefined,
      })
      onActionDone()
    } catch (err) {
      setActionErr(err?.message || 'Failed to cancel. Please try again.')
    } finally {
      setCancelling(false)
      setShowCancel(false)
    }
  }

  const busy = confirming || cancelling || completing

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-900 text-base">{crop.cropName || 'Crop'}</p>
          {crop.cropType && <p className="text-xs text-slate-500">{crop.cropType}</p>}
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* Booking summary */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <Package size={12} className="text-slate-400" />
          {booking.quantity} {booking.quantityUnit || 'quintal'}
        </span>
        {booking.agreedPrice && (
          <span className="font-semibold text-emerald-700">
            {fmt(booking.agreedPrice)}/{booking.quantityUnit || 'quintal'}
          </span>
        )}
        {crop.location && (
          <span className="flex items-center gap-1">
            <MapPin size={12} className="text-slate-400" />{crop.location}
          </span>
        )}
        <span className="flex items-center gap-1">
          <CalendarDays size={12} className="text-slate-400" />{formatDate(booking.createdAt)}
        </span>
      </div>

      {/* Buyer info */}
      <div className="flex items-center gap-2 pt-1 border-t border-slate-100 text-xs text-slate-600">
        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
          <User size={12} />
        </div>
        <span>
          Buyer: <strong className="text-slate-800">{buyer.name || '—'}</strong>
          {(buyer.district || buyer.state) && (
            <span className="text-slate-400 ml-1">· {[buyer.district, buyer.state].filter(Boolean).join(', ')}</span>
          )}
        </span>
      </div>

      {/* Buyer note */}
      {booking.buyerNote && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-2.5 text-xs text-blue-900">
          <span className="font-semibold">Buyer note: </span>{booking.buyerNote}
        </div>
      )}

      {/* Farmer note (when already set) */}
      {booking.farmerNote && !isPending && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-xs text-emerald-900">
          <span className="font-semibold">Your note: </span>{booking.farmerNote}
        </div>
      )}

      {/* Action error */}
      {actionErr && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          <span>{actionErr}</span>
        </div>
      )}

      {/* ── Cancel textarea (shared by pending and confirmed) ─────────────── */}
      {showCancel && (
        <div className="space-y-2 pt-1">
          <textarea
            value={cancelNote}
            onChange={(e) => setCancelNote(e.target.value.slice(0, 500))}
            rows={2}
            placeholder="Optional reason for cancellation…"
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
            disabled={cancelling}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-500 disabled:opacity-60"
            >
              {cancelling
                ? <><Loader2 size={14} className="animate-spin" /><span>Cancelling…</span></>
                : <><XCircle size={14} /><span>Confirm Cancel</span></>}
            </button>
            <button
              type="button"
              onClick={() => { setShowCancel(false); setCancelNote(''); setActionErr(null) }}
              disabled={cancelling}
              className="px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors focus:outline-none"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* ── Pending actions ────────────────────────────────────────────────── */}
      {isPending && !showCancel && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
          >
            {confirming
              ? <><Loader2 size={14} className="animate-spin" /><span>Confirming…</span></>
              : <><CheckCircle2 size={14} /><span>Confirm</span></>}
          </button>
          <button
            type="button"
            onClick={() => { setShowCancel(true); setActionErr(null) }}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold hover:bg-rose-100 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:opacity-60"
          >
            <XCircle size={14} /><span>Reject</span>
          </button>
        </div>
      )}

      {/* ── Confirmed actions ──────────────────────────────────────────────── */}
      {isConfirmed && !showCancel && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={handleComplete}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          >
            {completing
              ? <><Loader2 size={14} className="animate-spin" /><span>Completing…</span></>
              : <><Star size={14} /><span>Mark Completed</span></>}
          </button>
          <button
            type="button"
            onClick={() => { setShowCancel(true); setActionErr(null) }}
            disabled={busy}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold hover:bg-rose-100 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:opacity-60"
          >
            <XCircle size={14} /><span>Cancel</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ── Filter tabs ───────────────────────────────────────────────────────────────
const TABS = [
  { key: '',           label: 'All' },
  { key: 'pending',    label: 'Pending' },
  { key: 'confirmed',  label: 'Confirmed' },
  { key: 'completed',  label: 'Completed' },
  { key: 'cancelled',  label: 'Cancelled' },
]

// ── Main component ────────────────────────────────────────────────────────────

/**
 * BookingRequests — farmer's incoming booking inbox.
 * Props: onNavigate
 */
export default function BookingRequests({ onNavigate }) {
  const [activeTab, setActiveTab] = useState('')
  const [bookings,  setBookings]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  const fetchBookings = useCallback(async (status) => {
    setLoading(true)
    setError(null)
    try {
      const data = await getFarmerBookings(status ? { status } : {})
      setBookings(data.bookings || [])
    } catch (err) {
      setError(err?.message || 'Failed to load booking requests. Please try again.')
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBookings(activeTab)
  }, [fetchBookings, activeTab])

  const pendingCount = bookings.filter((b) => b.status === 'pending').length

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Back to home"
          onClick={() => onNavigate?.('home')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <ClipboardList size={22} className="text-emerald-600" />
            Booking Requests
            {pendingCount > 0 && !loading && (
              <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
                {pendingCount} pending
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Incoming buyer pre-booking requests</p>
        </div>
        <button
          type="button"
          aria-label="Refresh"
          onClick={() => fetchBookings(activeTab)}
          disabled={loading}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
              activeTab === t.key
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => fetchBookings(activeTab)}
            className="text-xs font-semibold underline hover:no-underline shrink-0">Retry</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-12 flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={28} className="animate-spin text-emerald-500" />
          <p className="text-sm font-medium">Loading requests…</p>
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
              {activeTab ? `No ${activeTab} requests` : 'No booking requests yet'}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              When buyers pre-book your crops, requests will appear here.
            </p>
          </div>
        </div>
      )}

      {/* List */}
      {!loading && !error && bookings.length > 0 && (
        <div className="space-y-3">
          {bookings.map((b) => (
            <BookingRequestCard
              key={String(b.id)}
              booking={b}
              onActionDone={() => fetchBookings(activeTab)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
