import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  RefreshCw,
  Package,
  User,
  CheckCircle2,
  AlertTriangle,
  Info,
  RotateCcw,
} from 'lucide-react'
import { getFarmerTransactions, refundTransaction } from '../../services/transactionService'

// ── Status config ──────────────────────────────────────────────────────────────
const PAYMENT_STATUS_CFG = {
  pending:   { bg: 'bg-amber-100   text-amber-800   border-amber-200',   label: 'Pending' },
  initiated: { bg: 'bg-blue-100    text-blue-800    border-blue-200',    label: 'Initiated' },
  paid:      { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', label: 'Paid' },
  failed:    { bg: 'bg-rose-100    text-rose-800    border-rose-200',    label: 'Failed' },
  refunded:  { bg: 'bg-violet-100  text-violet-800  border-violet-200',  label: 'Refunded' },
  cancelled: { bg: 'bg-slate-100   text-slate-600   border-slate-200',   label: 'Cancelled' },
}

function PaymentStatusBadge({ status }) {
  const cfg = PAYMENT_STATUS_CFG[status] || PAYMENT_STATUS_CFG.pending
  return (
    <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold uppercase tracking-wide ${cfg.bg}`}>
      {cfg.label}
    </span>
  )
}

function fmtAmount(amount, currency) {
  const n = Number(amount)
  if (isNaN(n)) return '—'
  return `${currency === 'INR' ? '\u20B9' : (currency || '')}${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(val) {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Transaction card (farmer view) ────────────────────────────────────────────
function FarmerTxnCard({ txn, onUpdated }) {
  const [confirmRefund, setConfirmRefund] = useState(false)
  const [busy,          setBusy]          = useState(false)
  const [error,         setError]         = useState(null)

  const crop    = txn.crop    || {}
  const buyer   = txn.buyer   || {}
  const booking = txn.booking || {}

  const canRefund = txn.paymentStatus === 'paid'

  const handleRefund = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await refundTransaction(String(txn.id))
      onUpdated(res.transaction)
      setConfirmRefund(false)
    } catch (err) {
      setError(err?.message || 'Refund failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-slate-900">{crop.cropName || 'Crop'}</p>
          {crop.cropType && <p className="text-xs text-slate-500 mt-0.5">{crop.cropType}</p>}
        </div>
        <PaymentStatusBadge status={txn.paymentStatus} />
      </div>

      {/* Details */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-600">
        <span className="flex items-center gap-1">
          <Package size={12} className="text-slate-400" />
          {booking.quantity} {booking.quantityUnit || 'quintal'}
        </span>
        <span className="font-bold text-emerald-700 text-sm">
          {fmtAmount(txn.amount, txn.currency)}
        </span>
        {buyer.name && (
          <span className="flex items-center gap-1">
            <User size={12} className="text-slate-400" />
            Buyer: {buyer.name}
          </span>
        )}
      </div>

      {/* Ref + dates */}
      <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
        <span>Ref: <span className="font-mono text-slate-700">{txn.reference || '—'}</span></span>
        <span>Booking: <span className="font-semibold capitalize">{booking.status || '—'}</span></span>
        {txn.paidAt     && <span>Paid: {formatDate(txn.paidAt)}</span>}
        {txn.refundedAt && <span>Refunded: {formatDate(txn.refundedAt)}</span>}
      </div>

      {/* Terminal states */}
      {txn.paymentStatus === 'paid' && !confirmRefund && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold">
          <CheckCircle2 size={13} className="shrink-0" />
          Payment received from buyer.
        </div>
      )}
      {txn.paymentStatus === 'refunded' && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-violet-50 border border-violet-100 text-violet-800 text-xs font-semibold">
          <RotateCcw size={13} className="shrink-0" />
          Payment has been refunded.
        </div>
      )}
      {txn.paymentStatus === 'cancelled' && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold">
          <Info size={13} className="shrink-0" />
          Payment was cancelled by buyer.
        </div>
      )}
      {txn.paymentStatus === 'failed' && (
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-xs font-semibold">
          <AlertTriangle size={13} className="shrink-0" />
          Payment failed — waiting for buyer.
        </div>
      )}

      {/* Refund confirmation */}
      {confirmRefund && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
          <p className="text-xs font-semibold text-amber-800">Confirm demo refund? This cannot be undone.</p>
          <div className="flex gap-2">
            <button type="button" onClick={handleRefund} disabled={busy}
              className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-1.5">
              {busy ? <Loader2 size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              Confirm Refund
            </button>
            <button type="button" onClick={() => { setConfirmRefund(false); setError(null) }} disabled={busy}
              className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" /><span>{error}</span>
        </div>
      )}

      {/* Refund button */}
      {canRefund && !confirmRefund && (
        <button type="button" onClick={() => setConfirmRefund(true)} disabled={busy}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold hover:bg-rose-100 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:opacity-60">
          <RotateCcw size={14} />
          Refund (Demo)
        </button>
      )}
    </div>
  )
}

/**
 * TransactionManagement — farmer's view of transactions.
 * Props: onNavigate
 */
export default function TransactionManagement({ onNavigate }) {
  const { t } = useLanguage()
  const [transactions, setTransactions] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getFarmerTransactions()
      setTransactions(data.transactions || [])
    } catch (err) {
      setError(err?.message || 'Failed to load transactions.')
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { fetchTransactions() }, 0)
    return () => clearTimeout(t)
  }, [fetchTransactions])

  const handleUpdated = useCallback((updated) => {
    setTransactions((prev) =>
      prev.map((t) => String(t.id) === String(updated.id) ? updated : t)
    )
  }, [])

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button type="button" aria-label="Back"
          onClick={() => onNavigate?.('home')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <CreditCard size={22} className="text-emerald-600" />
            {t('transactionTitle', 'Transactions')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('myTransactionsSublabel', 'Buyer payment status for your confirmed orders')}</p>
        </div>
        <button type="button" aria-label="Refresh" onClick={fetchTransactions} disabled={loading}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={fetchTransactions}
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
      {!loading && !error && transactions.length === 0 && (
        <div className="py-14 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <CreditCard size={32} />
          </div>
          <div>
            <p className="font-bold text-slate-700">{t('noTransactions', 'No transactions yet')}</p>
            <p className="text-sm text-slate-500 mt-1">
              {t('myTransactionsSublabel', 'Transactions appear here once you confirm a buyer booking.')}
            </p>
          </div>
          <button type="button" onClick={() => onNavigate?.('booking-requests')}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">
            {t('bookingRequestsTitle', 'View Booking Requests')}
          </button>
        </div>
      )}

      {/* List */}
      {!loading && !error && transactions.length > 0 && (
        <div className="space-y-3">
          {transactions.map((t) => (
            <FarmerTxnCard key={String(t.id)} txn={t} onUpdated={handleUpdated} />
          ))}
        </div>
      )}
    </div>
  )
}
