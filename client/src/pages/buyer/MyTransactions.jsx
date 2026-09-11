import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  CreditCard,
  Loader2,
  RefreshCw,
  Package,
  User,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronRight,
  Info,
} from 'lucide-react'
import { getBuyerTransactions, updatePayment } from '../../services/transactionService'
import SpeakButton from '../../components/common/SpeakButton'
import { useLanguage } from '../../context/LanguageContext'

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

const PAYMENT_METHOD_LABELS = {
  cash_on_delivery:     'Cash on Delivery',
  upi_demo:             'UPI Demo',
  bank_transfer_demo:   'Bank Transfer Demo',
  pending:              'Not selected',
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

// ── Demo payment modal ─────────────────────────────────────────────────────────
function PaymentModal({ txn, onClose, onUpdated }) {
  const [step,          setStep]          = useState('choose') // 'choose' | 'confirm' | 'result'
  const [method,        setMethod]        = useState(txn.paymentMethod !== 'pending' ? txn.paymentMethod : 'cash_on_delivery')
  const [pendingAction, setPendingAction] = useState(null)   // 'mark_paid' | 'mark_failed' | 'cancel'
  const [busy,          setBusy]          = useState(false)
  const [error,         setError]         = useState(null)

  // For initiated state — skip to confirm step
  const isInitiated = txn.paymentStatus === 'initiated'
  const isFailed    = txn.paymentStatus === 'failed'

  const currentStep = step

  const doAction = async (action, chosenMethod) => {
    setBusy(true)
    setError(null)
    try {
      const payload = { action }
      if (action === 'initiate' && chosenMethod) payload.paymentMethod = chosenMethod
      const res = await updatePayment(String(txn.id), payload)
      onUpdated(res.transaction)
      setStep('result')
    } catch (err) {
      setError(err?.message || 'Payment action failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const handleInitiate = () => {
    doAction('initiate', method)
  }

  const handleConfirmAction = () => {
    if (pendingAction) doAction(pendingAction)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Demo Payment"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
    >
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Demo banner */}
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-center gap-2 text-amber-800 text-xs font-semibold">
          <Info size={14} className="shrink-0" />
          <span>Demo payment — no real money is transferred.</span>
        </div>

        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <CreditCard size={18} className="text-emerald-600" />
              {isInitiated ? 'Payment In Progress' : isFailed ? 'Retry Payment' : 'Start Payment'}
            </h2>
            <button type="button" onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
              <XCircle size={18} />
            </button>
          </div>

          {/* Amount summary */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3 text-center">
            <p className="text-xs text-slate-500 font-medium">Amount Due</p>
            <p className="text-2xl font-extrabold text-slate-900 mt-0.5">{fmtAmount(txn.amount, txn.currency)}</p>
            <p className="text-xs text-slate-400 mt-0.5">
              {txn.crop?.cropName || 'Crop'} — Ref: {String(txn.reference || '').slice(-12)}
            </p>
          </div>

          {/* Result state */}
          {currentStep === 'result' && (
            <div className="flex flex-col items-center gap-3 py-4">
              <CheckCircle2 size={36} className="text-emerald-500" />
              <p className="font-bold text-slate-800">Action completed!</p>
              <button type="button" onClick={onClose}
                className="px-5 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">
                Done
              </button>
            </div>
          )}

          {/* Choose method step */}
          {currentStep === 'choose' && !isInitiated && !isFailed && (
            <>
              <div>
                <p className="text-xs font-bold text-slate-700 mb-2">Choose Payment Method</p>
                <div className="space-y-2">
                  {['cash_on_delivery', 'upi_demo', 'bank_transfer_demo'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                        method === m
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-emerald-300'
                      }`}
                    >
                      {PAYMENT_METHOD_LABELS[m]}
                    </button>
                  ))}
                </div>
              </div>
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}
              <button
                type="button"
                onClick={handleInitiate}
                disabled={busy}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
              >
                {busy ? <Loader2 size={15} className="animate-spin" /> : <ChevronRight size={15} />}
                {busy ? 'Processing...' : 'Initiate Payment'}
              </button>
            </>
          )}

          {/* Initiated / retry state — show mark paid / failed / cancel */}
          {currentStep === 'choose' && (isInitiated || isFailed) && (
            <>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-600">
                  Method: {PAYMENT_METHOD_LABELS[txn.paymentMethod] || 'Not selected'}
                </p>
                <p className="text-xs text-slate-500">
                  Status: <PaymentStatusBadge status={txn.paymentStatus} />
                </p>
              </div>
              {error && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                  <AlertTriangle size={13} className="shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}
              {pendingAction && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <p className="text-xs font-semibold text-amber-800">
                    Confirm: {pendingAction === 'mark_paid' ? 'Mark as Paid' : pendingAction === 'mark_failed' ? 'Mark as Failed' : 'Cancel Payment'}?
                  </p>
                  <div className="flex gap-2">
                    <button type="button" onClick={handleConfirmAction} disabled={busy}
                      className="flex-1 py-2 rounded-xl bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                      {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                      Confirm
                    </button>
                    <button type="button" onClick={() => setPendingAction(null)} disabled={busy}
                      className="flex-1 py-2 rounded-xl bg-slate-100 text-slate-600 text-xs font-semibold hover:bg-slate-200 transition-colors">
                      Back
                    </button>
                  </div>
                </div>
              )}
              {!pendingAction && (
                <div className="space-y-2">
                  {isFailed && (
                    <button type="button" onClick={() => doAction('initiate', txn.paymentMethod !== 'pending' ? txn.paymentMethod : 'cash_on_delivery')}
                      disabled={busy}
                      className="w-full py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Retry Payment
                    </button>
                  )}
                  {!isFailed && (
                    <button type="button" onClick={() => setPendingAction('mark_paid')} disabled={busy}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                      <CheckCircle2 size={14} /> Mark as Paid
                    </button>
                  )}
                  {!isFailed && (
                    <button type="button" onClick={() => setPendingAction('mark_failed')} disabled={busy}
                      className="w-full py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold hover:bg-rose-100 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                      <AlertTriangle size={14} /> Mark as Failed
                    </button>
                  )}
                  <button type="button" onClick={() => setPendingAction('cancel')} disabled={busy}
                    className="w-full py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-colors disabled:opacity-60">
                    Cancel Payment
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Transaction card ───────────────────────────────────────────────────────────
function TransactionCard({ txn, onUpdated, language }) {
  const [showModal, setShowModal] = useState(false)

  const crop    = txn.crop    || {}
  const farmer  = txn.farmer  || {}
  const booking = txn.booking || {}

  const canAct = ['pending', 'initiated', 'failed'].includes(txn.paymentStatus)

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-slate-900">{crop.cropName || 'Crop'}</p>
            {crop.cropType && <p className="text-xs text-slate-500 mt-0.5">{crop.cropType}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SpeakButton
              text={`Payment for ${crop.cropName || 'crop'}: status ${txn.paymentStatus || 'pending'}, amount ${txn.amount || ''} ${txn.currency || 'INR'}`}
              lang={language}
              size={14}
            />
            <PaymentStatusBadge status={txn.paymentStatus} />
          </div>
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
          {farmer.name && (
            <span className="flex items-center gap-1">
              <User size={12} className="text-slate-400" />
              {farmer.name}
            </span>
          )}
        </div>

        {/* Ref + method */}
        <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
          <span>Ref: <span className="font-mono text-slate-700">{txn.reference || '—'}</span></span>
          <span>Method: {PAYMENT_METHOD_LABELS[txn.paymentMethod] || txn.paymentMethod}</span>
          {txn.paidAt && <span>Paid: {formatDate(txn.paidAt)}</span>}
          {txn.refundedAt && <span>Refunded: {formatDate(txn.refundedAt)}</span>}
        </div>

        {/* State labels */}
        {txn.paymentStatus === 'paid' && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 size={13} className="shrink-0" />
            Payment received — Thank you!
          </div>
        )}
        {txn.paymentStatus === 'refunded' && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-violet-50 border border-violet-100 text-violet-800 text-xs font-semibold">
            <Info size={13} className="shrink-0" />
            Payment has been refunded.
          </div>
        )}
        {txn.paymentStatus === 'cancelled' && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-xs font-semibold">
            <XCircle size={13} className="shrink-0" />
            Payment was cancelled.
          </div>
        )}

        {/* Action button */}
        {canAct && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <CreditCard size={15} />
            {txn.paymentStatus === 'pending'   ? 'Start Payment' :
             txn.paymentStatus === 'initiated' ? 'Manage Payment' :
             txn.paymentStatus === 'failed'    ? 'Retry Payment'  : 'Payment'}
          </button>
        )}
      </div>

      {showModal && (
        <PaymentModal
          txn={txn}
          onClose={() => setShowModal(false)}
          onUpdated={(updated) => { onUpdated(updated); setShowModal(false) }}
        />
      )}
    </>
  )
}

/**
 * MyTransactions — buyer's demo payment/transaction page.
 * Props: onNavigate
 */
export default function MyTransactions({ onNavigate }) {
  const { language, t } = useLanguage()
  const [transactions, setTransactions] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  const fetchTransactions = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getBuyerTransactions()
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
          onClick={() => onNavigate?.('buyer-authenticated')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <CreditCard size={22} className="text-emerald-600" />
            {t('myTransactions', 'My Transactions')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('demoPayment', 'Demo payment — no real money is transferred.')}</p>
        </div>
        <button type="button" aria-label="Refresh" onClick={fetchTransactions} disabled={loading}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40">
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Demo notice */}
      <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>This is a <strong>demo payment system</strong> for the KisanMitra prototype. No real money is transferred and no payment credentials are required.</span>
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
          <p className="text-sm font-medium">Loading transactions...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && transactions.length === 0 && (
        <div className="py-14 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <CreditCard size={32} />
          </div>
          <div>
            <p className="font-bold text-slate-700">No transactions yet</p>
            <p className="text-sm text-slate-500 mt-1">Transactions appear here once a farmer confirms your booking.</p>
          </div>
          <button type="button" onClick={() => onNavigate?.('my-bookings')}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">
            View My Bookings
          </button>
        </div>
      )}

      {/* List */}
      {!loading && !error && transactions.length > 0 && (
        <div className="space-y-3">
          {transactions.map((t) => (
            <TransactionCard key={String(t.id)} txn={t} onUpdated={handleUpdated} language={language} />
          ))}
        </div>
      )}
    </div>
  )
}
