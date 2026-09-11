import { useState, useEffect, useCallback, useRef } from 'react'
import { Sprout, Bell, User } from 'lucide-react'
import LanguageSelector from './LanguageSelector'
import IconButton from './IconButton'
import NotificationPanel from './NotificationPanel'
import { useLanguage } from '../../context/LanguageContext'
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../services/notificationService'

/**
 * Responsive Top Navigation Header for KisanMitra.
 *
 * Props:
 *   onNavigate      - (viewKey: string) => void  from App.jsx currentView system
 *   user            - authenticated user object from AuthContext (null if not logged in)
 *   isAuthenticated - boolean
 */
export default function Header({ onNavigate, user, isAuthenticated }) {
  const { t } = useLanguage()
  const [panelOpen,      setPanelOpen]      = useState(false)
  const [notifications,  setNotifications]  = useState([])
  const [unreadCount,    setUnreadCount]     = useState(0)
  const [loading,        setLoading]         = useState(false)
  const [error,          setError]           = useState(null)
  const pollingRef = useRef(null)

  // Derive the role-aware profile destination
  const getProfileView = () => {
    if (!isAuthenticated || !user) return 'login'
    if (user.role === 'buyer') return 'buyer-profile'
    if (user.role === 'admin') return 'admin-dashboard'
    return 'profile' // farmer
  }

  const handleProfile = () => {
    onNavigate?.(getProfileView())
  }

  /**
   * Fetch notifications for the authenticated user.
   * Called on mount, on panel open, and by the polling interval.
   * Silent on error (does not disrupt UI) except the first explicit open.
   */
  const fetchNotifications = useCallback(async (silent = false) => {
    if (!isAuthenticated) return
    if (!silent) setLoading(true)
    setError(null)
    try {
      const data = await getNotifications({ page: 1, limit: 20 })
      setNotifications(data.notifications || [])
      setUnreadCount(data.unreadCount || 0)
    } catch {
      if (!silent) setError('Failed to load notifications.')
      // On silent background polls, simply leave existing data in place
    } finally {
      if (!silent) setLoading(false)
    }
  }, [isAuthenticated])

  // ── Polling: refresh every 45 seconds when authenticated ─────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      // Clear any existing poll and reset state on logout — use timeout to
      // avoid synchronous setState inside an effect body (lint rule).
      clearInterval(pollingRef.current)
      const resetTimer = setTimeout(() => {
        setNotifications([])
        setUnreadCount(0)
        setPanelOpen(false)
      }, 0)
      return () => clearTimeout(resetTimer)
    }

    // Initial fetch — deferred to avoid synchronous setState inside effect body
    const initTimer = setTimeout(() => { fetchNotifications(true) }, 0)

    // Start polling
    pollingRef.current = setInterval(() => {
      fetchNotifications(true)
    }, 45000)

    return () => {
      clearTimeout(initTimer)
      clearInterval(pollingRef.current)
    }
  }, [isAuthenticated, fetchNotifications])

  // ── When panel opens, do a fresh (non-silent) fetch ──────────────────────
  const handleBellClick = () => {
    if (!isAuthenticated) return
    const nextOpen = !panelOpen
    setPanelOpen(nextOpen)
    if (nextOpen) {
      fetchNotifications(false)
    }
  }

  const handleClose = useCallback(() => setPanelOpen(false), [])

  const handleMarkRead = useCallback(async (id) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, read: true } : n)
    )
    setUnreadCount((prev) => Math.max(0, prev - 1))
    try {
      await markNotificationRead(id)
    } catch {
      // Revert on failure — silently re-fetch to restore truth
      fetchNotifications(true)
    }
  }, [fetchNotifications])

  const handleMarkAllRead = useCallback(async () => {
    // Optimistic update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      await markAllNotificationsRead()
    } catch {
      fetchNotifications(true)
    }
  }, [fetchNotifications])

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-emerald-100/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-600/30 shrink-0">
            <Sprout className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-emerald-950 leading-none tracking-tight">
              KisanMitra
            </h1>
            <p className="text-[11px] sm:text-xs font-medium text-emerald-600 hidden sm:block mt-0.5">
              {t('appSubtitle', 'Farmer & Buyer Platform')}
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="relative flex items-center gap-1.5 sm:gap-3">
          {/* Language Selector */}
          <LanguageSelector />

          {/* Bell / Notifications */}
          <div className="relative">
            <div className="relative inline-block">
              <IconButton
                icon={Bell}
                ariaLabel="Notifications"
                size="sm"
                className="sm:w-11 sm:h-11"
                onClick={handleBellClick}
              />
              {/* Unread badge — shown only when authenticated and count > 0 */}
              {isAuthenticated && unreadCount > 0 && (
                <span
                  aria-label={`${unreadCount} unread notifications`}
                  className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none pointer-events-none"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>

            {/* Notification Panel Dropdown */}
            {panelOpen && isAuthenticated && (
              <NotificationPanel
                notifications={notifications}
                loading={loading}
                error={error}
                onMarkRead={handleMarkRead}
                onMarkAllRead={handleMarkAllRead}
                onClose={handleClose}
                onNavigate={onNavigate}
              />
            )}
          </div>

          {/* Profile Icon — role-aware */}
          <IconButton
            icon={User}
            ariaLabel="Profile"
            size="sm"
            className="sm:w-11 sm:h-11"
            onClick={handleProfile}
          />
        </div>
      </div>
    </header>
  )
}
