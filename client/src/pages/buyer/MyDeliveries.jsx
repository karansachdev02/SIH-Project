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
} from 'lucide-react'
import { getBuyerDeliveries } from '../../services/deliveryService'

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

/**
 * MyDeliveries — buyer's list of all deliveries.
 * Props: onNavigate
 */
export default function MyDeliveries({ onNavigate }) {
  const { t } = useLanguage()
  const [deliveries, setDeliveries] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  const fetchDeliveries = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getBuyerDeliveries()
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

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Back"
          onClick={() => onNavigate?.('buyer-authenticated')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Truck size={22} className="text-emerald-600" />
            {t('myDeliveries', 'My Deliveries')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('myDeliveriesSublabel', 'Track your crop delivery orders')}</p>
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
              {t('myDeliveriesSublabel', 'Deliveries appear here once your bookings are confirmed by farmers.')}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate?.('my-bookings')}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors"
          >
            {t('myBookings', 'View My Bookings')}
          </button>
        </div>
      )}

      {/* List */}
      {!loading && !error && deliveries.length > 0 && (
        <div className="space-y-3">
          {deliveries.map((d) => {
            const crop    = d.crop    || {}
            const farmer  = d.farmer  || {}
            const booking = d.booking || {}
            return (
              <button
                key={String(d.id)}
                type="button"
                onClick={() => onNavigate?.('delivery-tracking', { deliveryId: String(d.id) })}
                className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:border-emerald-200 hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{crop.cropName || 'Crop'}</p>
                    {crop.cropType && <p className="text-xs text-slate-500 mt-0.5">{crop.cropType}</p>}
                  </div>
                  <StatusBadge status={d.status} />
                </div>

                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span className="flex items-center gap-1">
                    <Package size={12} className="text-slate-400" />
                    {booking.quantity} {booking.quantityUnit || 'quintal'}
                  </span>
                  {farmer.name && (
                    <span className="flex items-center gap-1">
                      <User size={12} className="text-slate-400" />
                      {farmer.name}
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex items-center justify-end text-xs font-semibold text-emerald-700 gap-1">
                  <span>Track Delivery</span>
                  <ChevronRight size={14} />
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
