import React from 'react'
import Header from '../components/common/Header'
import BottomNavigation from '../components/common/BottomNavigation'

/**
 * Responsive Main Application Shell Layout for KisanMitra.
 *
 * Props:
 *   children        — page content
 *   activeTab       — current view key forwarded to BottomNavigation
 *   onNavigate      — navigation callback forwarded to Header and BottomNavigation
 *   user            — authenticated user object from AuthContext (may be null)
 *   isAuthenticated — boolean from AuthContext
 */
export default function MainLayout({ children, activeTab, onNavigate, user, isAuthenticated }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans antialiased selection:bg-emerald-200">
      {/* Top Application Header */}
      <Header onNavigate={onNavigate} user={user} isAuthenticated={isAuthenticated} />

      {/* Main Content Area - Padding bottom adds clearance for mobile bottom navigation bar */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8">
        {children}
      </main>

      {/* Mobile-only Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onNavigate={onNavigate}
        user={user}
        isAuthenticated={isAuthenticated}
      />
    </div>
  )
}
