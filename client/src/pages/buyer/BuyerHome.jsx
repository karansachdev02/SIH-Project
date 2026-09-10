import { useState, useEffect } from 'react'
import {
  ShoppingBag,
  ClipboardList,
  User,
  MapPin,
  Phone,
  Briefcase,
  ChevronRight,
  Loader2,
  Wheat,
} from 'lucide-react'
import { getMarketplaceCrops } from '../../services/marketplaceService'

/**
 * Buyer Home Dashboard.
 *
 * Props:
 *   user       — authenticated buyer object from AuthContext
 *   onNavigate — (viewKey: string) => void  from App.jsx currentView system
 */
export default function BuyerHome({ user, onNavigate }) {
  // ── Marketplace listing count ─────────────────────────────────────────────
  const [listingCount, setListingCount]   = useState(null)
  const [countLoading, setCountLoading]   = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        // limit:1 keeps the payload tiny; we only need the `count` field
        const data = await getMarketplaceCrops({ limit: 1 })
        if (!cancelled) setListingCount(data.count ?? 0)
      } catch {
        // Non-critical — hide the count badge on error
        if (!cancelled) setListingCount(null)
      } finally {
        if (!cancelled) setCountLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Derived display values ────────────────────────────────────────────────
  const buyerName    = user?.name         || 'Buyer'
  const mobile       = user?.mobile       || null
  const businessName = user?.businessName || null
  const businessType = user?.businessType || null
  const state        = user?.state        || null
  const district     = user?.district     || null

  const locationParts  = [district, state].filter(Boolean)
  const locationString = locationParts.length > 0 ? locationParts.join(', ') : null

  // ── Quick action definitions ──────────────────────────────────────────────
  const ACTIONS = [
    {
      id: 'marketplace',
      label: 'Marketplace',
      sublabel: 'Browse crops from verified farmers',
      icon: ShoppingBag,
      iconBg: 'bg-emerald-100 text-emerald-700',
      border: 'border-emerald-100 hover:border-emerald-300 focus:ring-emerald-500',
    },
    {
      id: 'my-bookings',
      label: 'My Bookings',
      sublabel: 'Track your crop pre-booking requests',
      icon: ClipboardList,
      iconBg: 'bg-amber-100 text-amber-700',
      border: 'border-amber-100 hover:border-amber-300 focus:ring-amber-500',
    },
    {
      id: 'buyer-profile',
      label: 'My Profile',
      sublabel: 'View and edit your account details',
      icon: User,
      iconBg: 'bg-blue-100 text-blue-700',
      border: 'border-blue-100 hover:border-blue-300 focus:ring-blue-500',
    },
  ]

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* ── 1. WELCOME / IDENTITY SECTION ─────────────────────────────────── */}
      <section
        aria-labelledby="buyer-greeting"
        className="bg-white rounded-2xl p-5 border border-blue-100/80 shadow-xs"
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: name + business */}
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                id="buyer-greeting"
                className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
              >
                Welcome, {buyerName}
              </h1>
              <span className="text-2xl" role="img" aria-label="waving hand">👋</span>
            </div>

            {businessName && (
              <p className="text-base text-blue-800 font-semibold flex items-center gap-1.5">
                <Briefcase size={15} className="text-blue-500 shrink-0" />
                {businessName}
                {businessType && (
                  <span className="text-xs font-medium text-slate-500 ml-1">
                    ({businessType})
                  </span>
                )}
              </p>
            )}

            <p className="text-sm text-slate-500 font-medium">
              Find quality crops directly from verified farmers
            </p>
          </div>

          {/* Right: avatar */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
            <ShoppingBag size={26} aria-hidden="true" />
          </div>
        </div>

        {/* Contact / location row */}
        {(mobile || locationString) && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-x-5 gap-y-1">
            {mobile && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <Phone size={13} className="text-slate-400" />
                {mobile}
              </span>
            )}
            {locationString && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <MapPin size={13} className="text-slate-400" />
                {locationString}
              </span>
            )}
          </div>
        )}
      </section>

      {/* ── 2. MARKETPLACE SUMMARY CARD ───────────────────────────────────── */}
      <button
        type="button"
        aria-label="Go to Marketplace"
        onClick={() => onNavigate?.('marketplace')}
        className="w-full text-left bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 shadow-lg shadow-emerald-700/20 hover:from-emerald-700 hover:to-teal-800 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 active:scale-[0.99]"
      >
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-emerald-200 uppercase tracking-wider">
              Live Listings
            </p>
            {countLoading ? (
              <div className="flex items-center gap-2 text-white">
                <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                <span className="text-sm font-medium">Loading...</span>
              </div>
            ) : listingCount !== null ? (
              <p className="text-3xl font-extrabold text-white">
                {listingCount}
                <span className="text-base font-semibold text-emerald-200 ml-2">
                  crop{listingCount !== 1 ? 's' : ''} available
                </span>
              </p>
            ) : (
              <p className="text-base font-semibold text-emerald-100">
                Browse the marketplace
              </p>
            )}
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
            <Wheat size={26} className="text-white" aria-hidden="true" />
          </div>
        </div>
        <p className="mt-2 text-xs text-emerald-200 font-medium flex items-center gap-1">
          Tap to browse &amp; pre-book crops
          <ChevronRight size={14} aria-hidden="true" />
        </p>
      </button>

      {/* ── 3. QUICK ACTIONS ──────────────────────────────────────────────── */}
      <section aria-label="Quick Actions">
        <div className="space-y-3">
          {ACTIONS.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                type="button"
                aria-label={action.label}
                onClick={() => onNavigate?.(action.id)}
                className={`w-full flex items-center gap-4 p-4 sm:p-5 bg-white rounded-2xl border shadow-xs hover:shadow-md transition-all text-left focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.99] ${action.border}`}
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${action.iconBg}`}>
                  <Icon size={22} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-slate-800">{action.label}</p>
                  <p className="text-sm text-slate-500">{action.sublabel}</p>
                </div>
                <ChevronRight size={18} className="text-slate-400 shrink-0" aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </section>

    </div>
  )
}
