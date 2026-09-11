import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '../../context/LanguageContext'
import {
  ArrowLeft,
  Truck,
  Loader2,
  RefreshCw,
  Package,
  User,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  XCircle,
  Calendar,
  Save,
  AlertTriangle,
} from 'lucide-react'
import { getFarmerDeliveries, updateDelivery, updateDeliveryStatus } from '../../services/deliveryService'

// ── Constants ─────────────────────────────────────────────────────────────────
const TRANSPORT_MODES = [
  { value: 'self',            label: 'Self (Farmer)' },
  { value: 'local_transport', label: 'Local Transport' },
  { value: 'tractor',         label: 'Tractor' },
  { value: 'truck',           label: 'Truck' },
  { value: 'other',           label: 'Other' },
]

const DELIVERY_TRANSITIONS = {
  pending:    ['assigned', 'cancelled'],
  assigned:   ['picked_up', 'cancelled'],
  picked_up:  ['in_transit', 'cancelled'],
  in_transit: ['delivered'],
  delivered:  [],
  cancelled:  [],
}

const STATUS_ACTION_LABELS = {
  assigned:   { label: 'Assign Delivery',  color: 'bg-blue-600   text-white hover:bg-blue-700' },
  picked_up:  { label: 'Mark Picked Up',   color: 'bg-violet-600 text-white hover:bg-violet-700' },
  in_transit: { label: 'Mark In Transit',  color: 'bg-orange-600 text-white hover:bg-orange-700' },
  delivered:  { label: 'Mark Delivered',   color: 'bg-emerald-600 text-white hover:bg-emerald-700' },
  cancelled:  { label: 'Cancel Delivery',  color: 'bg-rose-50    text-rose-700  border border-rose-200 hover:bg-rose-100' },
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
    <span className={`px-2 py-0.5 rounded-full border text-xs font-bold uppercase tracking-wide ${STATUS_BADGE_CFG[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {label}
    </span>
  )
}

function formatDate(val) {
  if (!val) return ''
  const d = new Date(val)
  return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
}

// ── Delivery management panel (per-delivery inline form) ──────────────────────
function DeliveryCard({ delivery: initialDelivery, onUpdated }) {
  const [delivery,    setDelivery]    = useState(initialDelivery)
  const [expanded,    setExpanded]    = useState(false)
  const [saving,      setSaving]      = useState(false)
  const [statusBusy,  setStatusBusy]  = useState(false)
  const [saveError,   setSaveError]   = useState(null)
  const [statusError, setStatusError] = useState(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Form state — initialised from delivery
  const [form, setForm] = useState({
    transportMode:         delivery.transportMode         || 'local_transport',
    vehicleNumber:         delivery.vehicleNumber         || '',
    driverName:            delivery.driverName            || '',
    driverMobile:          delivery.driverMobile          || '',
    estimatedDeliveryDate: delivery.estimatedDeliveryDate ? formatDate(delivery.estimatedDeliveryDate) : '',
    notes:                 delivery.notes                 || '',
    deliveryAddress:       delivery.deliveryAddress       || '',
    contactName:           delivery.contactName           || '',
    contactMobile:         delivery.contactMobile         || '',
  })

  const crop    = delivery.crop    || {}
  const buyer   = delivery.buyer   || {}
  const booking = delivery.booking || {}

  const allowedTransitions = DELIVERY_TRANSITIONS[delivery.status] || []
  const isTerminal = delivery.status === 'delivered' || delivery.status === 'cancelled'

  const handleFormChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    setSaveError(null)
    setSaveSuccess(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    setSaveSuccess(false)
    try {
      const payload = {
        transportMode:   form.transportMode,
        vehicleNumber:   form.vehicleNumber.trim(),
        driverName:      form.driverName.trim(),
        driverMobile:    form.driverMobile.trim(),
        notes:           form.notes.trim(),
        deliveryAddress: form.deliveryAddress.trim(),
        contactName:     form.contactName.trim(),
        contactMobile:   form.contactMobile.trim(),
        estimatedDeliveryDate: form.estimatedDeliveryDate || null,
      }
      const res = await updateDelivery(String(delivery.id), payload)
      setDelivery(res.delivery)
      setSaveSuccess(true)
      onUpdated?.(res.delivery)
    } catch (err) {
      setSaveError(err?.message || 'Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    setStatusBusy(true)
    setStatusError(null)
    try {
      const res = await updateDeliveryStatus(String(delivery.id), newStatus)
      setDelivery(res.delivery)
      onUpdated?.(res.delivery)
    } catch (err) {
      setStatusError(err?.message || 'Failed to update status.')
    } finally {
      setStatusBusy(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-slate-900">{crop.cropName || 'Crop'}</p>
            {crop.cropType && <p className="text-xs text-slate-500 mt-0.5">{crop.cropType}</p>}
          </div>
          <StatusBadge status={delivery.status} />
        </div>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
          <span className="flex items-center gap-1">
            <Package size={12} className="text-slate-400" />
            {booking.quantity} {booking.quantityUnit || 'quintal'}
          </span>
          {buyer.name && (
            <span className="flex items-center gap-1">
              <User size={12} className="text-slate-400" />
              Buyer: {buyer.name}
              {(buyer.district || buyer.state) && ` · ${[buyer.district, buyer.state].filter(Boolean).join(', ')}`}
            </span>
          )}
        </div>

        {/* Status action buttons */}
        {!isTerminal && (
          <div className="mt-3 flex flex-wrap gap-2">
            {allowedTransitions
              .filter((s) => s !== 'cancelled')
              .map((s) => {
                const cfg = STATUS_ACTION_LABELS[s]
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleStatusChange(s)}
                    disabled={statusBusy}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 ${cfg?.color || 'bg-slate-100 text-slate-700'}`}
                  >
                    {statusBusy
                      ? <Loader2 size={12} className="animate-spin" />
                      : <CheckCircle2 size={12} />}
                    {cfg?.label || s}
                  </button>
                )
              })}
            {allowedTransitions.includes('cancelled') && (
              <button
                type="button"
                onClick={() => handleStatusChange('cancelled')}
                disabled={statusBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:opacity-60"
              >
                {statusBusy ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                Cancel
              </button>
            )}
          </div>
        )}

        {delivery.status === 'delivered' && (
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-medium">
            <CheckCircle2 size={13} className="shrink-0" />
            Delivery completed
          </div>
        )}
        {delivery.status === 'cancelled' && (
          <div className="mt-3 flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-xs font-medium">
            <XCircle size={13} className="shrink-0" />
            Delivery cancelled
          </div>
        )}

        {statusError && (
          <div className="mt-2 flex items-start gap-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>{statusError}</span>
          </div>
        )}

        {/* Toggle manage details */}
        {!isTerminal && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-emerald-700 transition-colors py-1.5"
          >
            <span>{expanded ? 'Hide' : 'Manage Delivery Details'}</span>
            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {/* Logistics form */}
      {expanded && (
        <div className="border-t border-slate-100 p-4 space-y-4 bg-slate-50/50">
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wide">Logistics Details</p>

          {/* Transport mode */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Transport Mode</label>
            <select
              value={form.transportMode}
              onChange={(e) => handleFormChange('transportMode', e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {TRANSPORT_MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Two-column row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Vehicle Number</label>
              <input
                type="text"
                value={form.vehicleNumber}
                onChange={(e) => handleFormChange('vehicleNumber', e.target.value.slice(0, 30))}
                placeholder="e.g. MH 12 AB 1234"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Calendar size={11} />
                Est. Delivery Date
              </label>
              <input
                type="date"
                value={form.estimatedDeliveryDate}
                onChange={(e) => handleFormChange('estimatedDeliveryDate', e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Driver Name</label>
              <input
                type="text"
                value={form.driverName}
                onChange={(e) => handleFormChange('driverName', e.target.value.slice(0, 100))}
                placeholder="Driver / transporter name"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Driver Mobile</label>
              <input
                type="tel"
                value={form.driverMobile}
                onChange={(e) => handleFormChange('driverMobile', e.target.value.slice(0, 20))}
                placeholder="Driver mobile number"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Delivery Address</label>
            <input
              type="text"
              value={form.deliveryAddress}
              onChange={(e) => handleFormChange('deliveryAddress', e.target.value.slice(0, 500))}
              placeholder="Buyer's delivery address"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Name</label>
              <input
                type="text"
                value={form.contactName}
                onChange={(e) => handleFormChange('contactName', e.target.value.slice(0, 100))}
                placeholder="Contact person at destination"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Contact Mobile</label>
              <input
                type="tel"
                value={form.contactMobile}
                onChange={(e) => handleFormChange('contactMobile', e.target.value.slice(0, 20))}
                placeholder="Contact mobile"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => handleFormChange('notes', e.target.value.slice(0, 500))}
              rows={2}
              placeholder="Any additional notes (optional)"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
            />
            <p className="text-[10px] text-slate-400 mt-0.5">{form.notes.length}/500</p>
          </div>

          {saveError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              <span>{saveError}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 size={13} />
              Details saved successfully.
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Save Details'}
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * DeliveryManagement — farmer's delivery management dashboard.
 * Props: onNavigate
 */
export default function DeliveryManagement({ onNavigate }) {
  const { t } = useLanguage()
  const [deliveries, setDeliveries] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  const fetchDeliveries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getFarmerDeliveries()
      setDeliveries(data.deliveries || [])
    } catch (err) {
      setError(err?.message || 'Failed to load deliveries.')
      setDeliveries([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const t = setTimeout(() => { fetchDeliveries() }, 0)
    return () => clearTimeout(t)
  }, [fetchDeliveries])

  const handleUpdated = useCallback((updated) => {
    setDeliveries((prev) =>
      prev.map((d) => String(d.id) === String(updated.id) ? updated : d)
    )
  }, [])

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Back"
          onClick={() => onNavigate?.('home')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Truck size={22} className="text-emerald-600" />
            {t('deliveryMgmtTitle', 'Delivery Management')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('myDeliveriesSublabel', 'Manage logistics for your confirmed orders')}</p>
        </div>
        <button
          type="button"
          aria-label="Refresh"
          onClick={fetchDeliveries}
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
          <button type="button" onClick={fetchDeliveries}
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
      {!loading && !error && deliveries.length === 0 && (
        <div className="py-14 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <Truck size={32} />
          </div>
          <div>
            <p className="font-bold text-slate-700">{t('noDeliveries', 'No deliveries yet')}</p>
            <p className="text-sm text-slate-500 mt-1">
              {t('myDeliveriesSublabel', 'Deliveries appear here once you confirm a booking.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('booking-requests')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            <ChevronRight size={16} />
            {t('bookingRequestsTitle', 'View Booking Requests')}
          </button>
        </div>
      )}

      {/* List */}
      {!loading && !error && deliveries.length > 0 && (
        <div className="space-y-3">
          {deliveries.map((d) => (
            <DeliveryCard
              key={String(d.id)}
              delivery={d}
              onUpdated={handleUpdated}
            />
          ))}
        </div>
      )}
    </div>
  )
}
