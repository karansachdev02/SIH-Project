import { useState, useEffect, useCallback } from 'react'
import {
  ArrowLeft,
  Truck,
  Loader2,
  MapPin,
  Package,
  User,
  Calendar,
  Phone,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { getDelivery } from '../../services/deliveryService'
import SpeakButton from '../../components/common/SpeakButton'
import { useLanguage } from '../../context/LanguageContext'

// ── Timeline ─────────────────────────────────────────────────────────────────
function DeliveryTimeline({ status, t }) {
  const DELIVERY_STEPS = [
    { key: 'pending',    labelKey: 'deliveryStepPending',   icon: Clock },
    { key: 'assigned',   labelKey: 'deliveryStepAssigned',  icon: CheckCircle2 },
    { key: 'picked_up',  labelKey: 'deliveryStepPickedUp',  icon: Package },
    { key: 'in_transit', labelKey: 'deliveryStepInTransit', icon: Truck },
    { key: 'delivered',  labelKey: 'deliveryStepDelivered', icon: CheckCircle2 },
  ]

  if (status === 'cancelled') {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium">
        <XCircle size={16} className="shrink-0" />
        <span>{t('deliveryCancelled')}</span>
      </div>
    )
  }

  const currentIdx = DELIVERY_STEPS.findIndex((s) => s.key === status)

  return (
    <div className="relative">
      {/* Connector line */}
      <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-100" aria-hidden="true" />
      <ol className="space-y-0 relative">
        {DELIVERY_STEPS.map((step, idx) => {
          const done    = idx < currentIdx
          const current = idx === currentIdx
          const Icon    = step.icon
          return (
            <li key={step.key} className="flex items-center gap-4 py-2.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 border-2 transition-colors ${
                done    ? 'bg-emerald-500 border-emerald-500 text-white' :
                current ? 'bg-white border-emerald-500 text-emerald-600' :
                          'bg-white border-slate-200 text-slate-300'
              }`}>
                <Icon size={14} />
              </div>
              <span className={`text-sm font-semibold transition-colors ${
                done    ? 'text-emerald-700' :
                current ? 'text-slate-900' :
                          'text-slate-400'
              }`}>
                {t(step.labelKey)}
                {current && <span className="ml-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full">{t('currentStepLabel')}</span>}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

const STATUS_BADGE_CFG = {
  pending:    'bg-amber-100   text-amber-800   border-amber-200',
  assigned:   'bg-blue-100    text-blue-800    border-blue-200',
  picked_up:  'bg-violet-100  text-violet-800  border-violet-200',
  in_transit: 'bg-orange-100  text-orange-800  border-orange-200',
  delivered:  'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled:  'bg-rose-100    text-rose-800    border-rose-200',
}

function StatusBadge({ status }) {
  const label = (status || '').replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())
  return (
    <span className={`px-2.5 py-1 rounded-full border text-xs font-bold uppercase tracking-wide ${STATUS_BADGE_CFG[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {label}
    </span>
  )
}

// ── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 text-sm">
      <Icon size={15} className="text-slate-400 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <span className="text-xs text-slate-500 font-medium">{label}</span>
        <p className="text-slate-800 font-semibold">{value}</p>
      </div>
    </div>
  )
}

function formatDate(val) {
  if (!val) return null
  const d = new Date(val)
  return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

/**
 * DeliveryTracking — buyer's view of a single delivery.
 *
 * Props:
 *   deliveryId  {string}    — ID from viewParams
 *   onNavigate  {function}  — App.jsx navigate callback
 */
export default function DeliveryTracking({ deliveryId, onNavigate }) {
  const { language, t } = useLanguage()
  const [delivery, setDelivery] = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  const fetchDelivery = useCallback(async () => {
    if (!deliveryId) { setError(t('deliveryNotFound')); setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const data = await getDelivery(deliveryId)
      setDelivery(data.delivery)
    } catch (err) {
      setError(err?.message || t('error'))
    } finally {
      setLoading(false)
    }
  }, [deliveryId, t])

  useEffect(() => {
    const timer = setTimeout(() => { fetchDelivery() }, 0)
    return () => clearTimeout(timer)
  }, [fetchDelivery])

  const TRANSPORT_MODE_LABELS = {
    self:            t('transportSelf'),
    local_transport: t('transportLocal'),
    tractor:         t('transportTractor'),
    truck:           t('transportTruck'),
    other:           t('transportOther'),
  }

  const d = delivery || {}
  const crop    = d.crop    || {}
  const farmer  = d.farmer  || {}
  const booking = d.booking || {}

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={t('back')}
          onClick={() => onNavigate?.('buyer-deliveries')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Truck size={22} className="text-emerald-600" />
            {t('deliveryTracking')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('liveDeliveryStatus')}</p>
        </div>
        <button
          type="button"
          aria-label={t('refresh')}
          onClick={fetchDelivery}
          disabled={loading}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={fetchDelivery}
            className="text-xs font-semibold underline hover:no-underline shrink-0">{t('retry')}</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-12 flex flex-col items-center gap-3 text-slate-500">
          <Loader2 size={28} className="animate-spin text-emerald-500" />
          <p className="text-sm font-medium">{t('loadingDelivery')}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && !delivery && (
        <div className="py-14 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <Truck size={32} />
          </div>
          <p className="font-bold text-slate-700">{t('deliveryNotFound')}</p>
          <button
            type="button"
            onClick={() => onNavigate?.('my-bookings')}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            {t('backToMyBookings')}
          </button>
        </div>
      )}

      {!loading && !error && delivery && (
        <>
          {/* Status banner */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-900 text-lg">{crop.cropName || t('crop')}</p>
                {crop.cropType && <p className="text-sm text-slate-500">{crop.cropType}</p>}
              </div>
              <div className="flex items-center gap-2">
                <SpeakButton
                  text={`${t('deliveryTracking')} ${crop.cropName || t('crop')}: ${(d.status || '').replace('_', ' ')}`}
                  lang={language}
                  size={15}
                />
                <StatusBadge status={d.status} />
              </div>
            </div>

            {/* Booking summary */}
            <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <Package size={12} className="text-slate-400" />
                {booking.quantity} {booking.quantityUnit || 'quintal'}
              </span>
              {booking.agreedPrice && (
                <span className="font-semibold text-emerald-700">
                  Rs.{Number(booking.agreedPrice).toLocaleString('en-IN')}/{booking.quantityUnit || 'quintal'}
                </span>
              )}
              {farmer.name && (
                <span className="flex items-center gap-1">
                  <User size={12} className="text-slate-400" />
                  {farmer.name}
                  {(farmer.district || farmer.state) && ` · ${[farmer.district, farmer.state].filter(Boolean).join(', ')}`}
                </span>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <h2 className="text-sm font-bold text-slate-800">{t('deliveryProgress')}</h2>
            <DeliveryTimeline status={d.status} t={t} />
          </div>

          {/* Logistics details */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
            <h2 className="text-sm font-bold text-slate-800">{t('logisticsDetails')}</h2>
            <div className="space-y-3">
              <InfoRow icon={Truck}    label={t('transportMode')}      value={TRANSPORT_MODE_LABELS[d.transportMode] || d.transportMode} />
              <InfoRow icon={FileText} label={t('vehicleNumber')}      value={d.vehicleNumber} />
              <InfoRow icon={User}     label={t('driverName')}         value={d.driverName} />
              <InfoRow icon={Phone}    label={t('driverMobile')}       value={d.driverMobile} />
              <InfoRow icon={Calendar} label={t('estimatedDate')}      value={formatDate(d.estimatedDeliveryDate)} />
              {d.status === 'delivered' && (
                <InfoRow icon={Calendar} label={t('actualDate')}       value={formatDate(d.actualDeliveryDate)} />
              )}
              <InfoRow icon={MapPin}   label={t('deliveryAddress')}    value={d.deliveryAddress} />
              <InfoRow icon={User}     label={t('contactName')}        value={d.contactName} />
              <InfoRow icon={Phone}    label={t('contactMobile')}      value={d.contactMobile} />
              <InfoRow icon={FileText} label={t('notes')}              value={d.notes} />
            </div>
          </div>

          {/* Ref */}
          <p className="text-[11px] text-slate-400 text-center">
            {t('deliveryRef')}: <span className="font-mono">{String(d.id || '').slice(-8).toUpperCase()}</span>
          </p>
        </>
      )}
    </div>
  )
}
