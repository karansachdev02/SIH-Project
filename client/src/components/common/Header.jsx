import React, { useState } from 'react'
import { Sprout, Bell, User } from 'lucide-react'
import LanguageSelector from './LanguageSelector'
import IconButton from './IconButton'

/**
 * Responsive Top Navigation Header for Smart Mandi.
 *
 * Props:
 *   onNavigate      — (viewKey: string) => void  from App.jsx currentView system
 *   user            — authenticated user object from AuthContext (null if not logged in)
 *   isAuthenticated — boolean
 */
export default function Header({ onNavigate, user, isAuthenticated }) {
  const [bellToast, setBellToast] = useState(false)

  // Derive the role-aware profile destination
  const getProfileView = () => {
    if (!isAuthenticated || !user) return 'login'
    if (user.role === 'buyer') return 'buyer-profile'
    if (user.role === 'admin') return 'admin-dashboard'
    return 'profile' // farmer
  }

  const handleBell = () => {
    setBellToast(true)
    setTimeout(() => setBellToast(false), 2200)
  }

  const handleProfile = () => {
    onNavigate?.(getProfileView())
  }

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
              Smart Mandi
            </h1>
            <p className="text-[11px] sm:text-xs font-medium text-emerald-600 hidden sm:block mt-0.5">
              किसानों के लिए आसान बाजार
            </p>
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="relative flex items-center gap-1.5 sm:gap-3">
          {/* Language Selector */}
          <LanguageSelector />

          {/* Notifications Icon — coming soon toast */}
          <div className="relative">
            <IconButton
              icon={Bell}
              ariaLabel="सूचनाएं / Notifications"
              size="sm"
              className="sm:w-11 sm:h-11"
              onClick={handleBell}
            />
            {bellToast && (
              <div
                role="status"
                aria-live="polite"
                className="absolute top-full right-0 mt-2 px-3 py-1.5 rounded-xl bg-slate-800 text-white text-xs font-semibold shadow-lg whitespace-nowrap z-50"
              >
                जल्द आ रहा है / Coming soon
              </div>
            )}
          </div>

          {/* Profile Icon — role-aware */}
          <IconButton
            icon={User}
            ariaLabel="प्रोफ़ाइल / Profile"
            size="sm"
            className="sm:w-11 sm:h-11"
            onClick={handleProfile}
          />
        </div>
      </div>
    </header>
  )
}
