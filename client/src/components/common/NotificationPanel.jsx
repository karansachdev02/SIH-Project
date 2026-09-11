import { useEffect, useRef } from 'react'
import { Bell, CheckCheck, Loader2, AlertCircle, BellOff } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'
import SpeakButton from './SpeakButton'

/**
 * NotificationPanel — dropdown panel shown when the bell icon is clicked.
 *
 * Props:
 *   notifications  {Array}    — notification objects from API
 *   loading        {boolean}
 *   error          {string|null}
 *   onMarkRead     {fn}       — (id) => void
 *   onMarkAllRead  {fn}       — () => void
 *   onClose        {fn}       — () => void
 *   onNavigate     {fn}       — (viewKey) => void
 */
export default function NotificationPanel({
  notifications = [],
  loading = false,
  error = null,
  onMarkRead,
  onMarkAllRead,
  onClose,
  onNavigate,
}) {
  const { t } = useLanguage()
  const panelRef = useRef(null)

  // Close panel when clicking outside
  useEffect(() => {
    function handleOutsideClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        onClose?.()
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [onClose])

  // Close panel on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') onClose?.()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const hasUnread = notifications.some((n) => !n.read)

  /**
   * Determine navigation target based on notification type.
   * Returns a view key or null if no navigation is appropriate.
   */
  function getNavigationTarget(type) {
    switch (type) {
      case 'booking_created':       return 'booking-requests'   // farmer view
      case 'booking_confirmed':     return 'my-bookings'        // buyer view
      case 'booking_cancelled':     return 'my-bookings'
      case 'booking_completed':     return 'my-bookings'
      case 'new_review':            return 'profile'            // farmer profile
      case 'verification_approved': return 'profile'
      case 'verification_rejected': return 'profile'
      case 'delivery_status':       return 'buyer-deliveries'   // buyer: delivery update
      case 'payment_status':        return 'buyer-transactions' // buyer: payment update
      default:                      return null
    }
  }

  function handleNotificationClick(n) {
    if (!n.read) {
      onMarkRead?.(n.id)
    }
    const target = getNavigationTarget(n.type)
    if (target) {
      onNavigate?.(target)
      onClose?.()
    }
  }

  function formatDate(dateStr) {
    try {
      const date = new Date(dateStr)
      const now  = new Date()
      const diffMs  = now - date
      const diffMin = Math.floor(diffMs / 60000)
      const diffHr  = Math.floor(diffMin / 60)
      const diffDay = Math.floor(diffHr  / 24)

      if (diffMin < 1)  return 'Just now'
      if (diffMin < 60) return `${diffMin}m ago`
      if (diffHr  < 24) return `${diffHr}h ago`
      if (diffDay < 7)  return `${diffDay}d ago`

      return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    } catch {
      return ''
    }
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={t('notifications')}
      className="absolute top-full right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 flex flex-col overflow-hidden"
      style={{ maxHeight: '480px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-emerald-600" />
          <h2 className="text-sm font-bold text-slate-900">{t('notifications')}</h2>
        </div>
        {hasUnread && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            {t('markAllRead')}
          </button>
        )}
      </div>

      {/* Body */}
      <div className="overflow-y-auto flex-1">
        {loading && (
          <div className="flex items-center justify-center gap-2 py-10 text-slate-500 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{t('loading')}</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-2 px-4 py-6 text-rose-600 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{t('error')}</span>
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
            <BellOff className="w-8 h-8" />
            <p className="text-sm font-medium">{t('noNotifications')}</p>
          </div>
        )}

        {!loading && !error && notifications.length > 0 && (
          <ul className="divide-y divide-slate-50">
            {notifications.map((n) => (
              <li key={n.id} className={`flex items-start gap-1 ${!n.read ? 'bg-emerald-50/60' : 'bg-white'}`}>
                <button
                  type="button"
                  onClick={() => handleNotificationClick(n)}
                  className="flex-1 text-left px-4 py-3 hover:bg-slate-50 transition-colors flex gap-3 items-start"
                >
                  {/* Unread indicator dot */}
                  <span
                    className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      !n.read ? 'bg-emerald-500' : 'bg-transparent'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-snug ${!n.read ? 'font-semibold text-slate-900' : 'font-medium text-slate-700'}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-[11px] text-slate-400 mt-1">{formatDate(n.createdAt)}</p>
                  </div>
                </button>
                {/* SpeakButton per notification — user must explicitly click */}
                <SpeakButton
                  text={`${n.title}. ${n.message}`}
                  label={n.title}
                  size={13}
                  className="mr-2 mt-2.5 shrink-0"
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
