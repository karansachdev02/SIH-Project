import { useState } from 'react'
import { CheckCircle2, MapPin, User, ArrowLeft, Download, Loader2 } from 'lucide-react'
import Card from '../../components/common/Card'
import { downloadBookingPdf } from '../../services/bookingService'
import { useLanguage } from '../../context/LanguageContext'

function StatusBadge({ status, t }) {
  const cfg = {
    pending:   'bg-amber-100   text-amber-800   border-amber-200',
    confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    completed: 'bg-blue-100    text-blue-800    border-blue-200',
    cancelled: 'bg-rose-100    text-rose-800    border-rose-200',
  }
  const labelKey = { pending: 'pending', confirmed: 'confirmed', completed: 'completed', cancelled: 'cancelled' }
  return (
    <span className={`px-2.5 py-1 rounded-full border text-xs font-bold uppercase ${cfg[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      {t(labelKey[status] || 'status', status)}
    </span>
  )
}

function Row({ label, value }) {
  if (!value && value !== 0) return null
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm font-semibold text-slate-800 text-right">{value}</span>
    </div>
  )
}

/**
 * BookingConfirmation — static detail view for a single booking.
 *
 * Props:
 *   booking    {object}  booking object (from createPrebooking response or MyBookings)
 *   onNavigate (viewKey, params?) => void
 */
export default function BookingConfirmation({ booking, onNavigate }) {
  const { t } = useLanguage()
  const [downloading, setDownloading] = useState(false)
  const [dlError,     setDlError]     = useState(null)

  async function handleDownload() {
    const id = booking?.id || booking?._id
    if (!id) return
    setDownloading(true)
    setDlError(null)
    try {
      await downloadBookingPdf(String(id))
    } catch (err) {
      setDlError(err?.message || t('downloadFailed'))
    } finally {
      setDownloading(false)
    }
  }

  if (!booking) {
    return (
      <div className="max-w-lg mx-auto py-8">
        <Card className="text-center p-8 space-y-4">
          <p className="font-bold text-slate-700">{t('noBookingData')}</p>
          <button type="button" onClick={() => onNavigate?.('my-bookings')}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors">
            {t('viewMyBookings')}
          </button>
        </Card>
      </div>
    )
  }

  const fmt = (val) => {
    const n = Number(val)
    return (!n || isNaN(n)) ? '—' : `₹${n.toLocaleString('en-IN')}`
  }
  const formatDate = (val) => {
    if (!val) return '—'
    const d = new Date(val)
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const crop   = booking.crop   || {}
  const farmer = booking.farmer || {}

  return (
    <div className="max-w-lg mx-auto space-y-5">
      {/* Back */}
      <button
        type="button"
        onClick={() => onNavigate?.('my-bookings')}
        className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-lg px-1 py-0.5"
      >
        <ArrowLeft size={18} />
        {t('backToMyBookings')}
      </button>

      {/* Status hero */}
      <div className="bg-gradient-to-br from-emerald-800 to-teal-900 text-white rounded-2xl p-6 text-center space-y-3">
        <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto">
          <CheckCircle2 size={28} />
        </div>
        <div>
          <p className="text-xl font-extrabold">{crop.cropName || t('crop')}</p>
          <p className="text-emerald-200 text-sm mt-1">{crop.cropType || ''}</p>
        </div>
        <StatusBadge status={booking.status} t={t} />
      </div>

      {/* Booking details */}
      <Card className="p-5">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">{t('bookingDetails')}</h2>
        <Row label={t('bookingRef')}  value={<span className="font-mono">{String(booking.id || '').slice(-8).toUpperCase()}</span>} />
        <Row label={t('status')}       value={<StatusBadge status={booking.status} t={t} />} />
        <Row label={t('quantity')}     value={`${booking.quantity} ${booking.quantityUnit || 'quintal'}`} />
        <Row label={t('agreedPrice')} value={fmt(booking.agreedPrice)} />
        <Row label={t('bookedOn')}    value={formatDate(booking.createdAt)} />
        <Row label={t('lastUpdated')} value={formatDate(booking.updatedAt)} />
      </Card>

      {/* Crop details */}
      {(crop.location || crop.expectedPrice) && (
        <Card className="p-5">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">{t('cropInformation')}</h2>
          {crop.location && (
            <div className="flex items-center gap-1.5 text-sm text-slate-600 mb-2">
              <MapPin size={14} className="text-slate-400" />
              {crop.location}
            </div>
          )}
          <Row label={t('availableQty')} value={crop.quantity ? `${crop.quantity} ${crop.quantityUnit || 'quintal'}` : null} />
          <Row label={t('expectedPriceLabel')} value={fmt(crop.expectedPrice)} />
          <Row label={t('status')}        value={crop.status} />
        </Card>
      )}

      {/* Seller info */}
      {farmer.name && (
        <Card className="p-5">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">{t('sellerLabel')}</h2>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <User size={18} />
            </div>
            <div>
              <p className="font-semibold text-slate-900">{farmer.name}</p>
              {(farmer.district || farmer.state) && (
                <p className="text-xs text-slate-500">{[farmer.district, farmer.state].filter(Boolean).join(', ')}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Notes */}
      {(booking.buyerNote || booking.farmerNote) && (
        <Card className="p-5 space-y-3">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">{t('notes')}</h2>
          {booking.buyerNote && (
            <div className="bg-slate-50 rounded-xl border border-slate-100 p-3 text-sm">
              <p className="text-xs font-semibold text-slate-500 mb-1">{t('yourNote')}</p>
              <p className="text-slate-700">{booking.buyerNote}</p>
            </div>
          )}
          {booking.farmerNote && (
            <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-3 text-sm">
              <p className="text-xs font-semibold text-emerald-700 mb-1">{t('farmerNoteLabel')}</p>
              <p className="text-emerald-900">{booking.farmerNote}</p>
            </div>
          )}
        </Card>
      )}

      {/* Download booking slip */}
      <div className="flex flex-col items-center gap-2 pb-2">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading
            ? <Loader2 size={16} className="animate-spin" />
            : <Download size={16} />}
          {downloading ? t('generatingPdf') : t('downloadBookingSlip')}
        </button>
        {dlError && (
          <p className="text-xs text-rose-600 font-medium text-center">{dlError}</p>
        )}
      </div>
    </div>
  )
}
