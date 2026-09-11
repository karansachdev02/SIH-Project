import { useState } from 'react'
import { Home, TrendingUp, ShoppingBag, Bot, User } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

const NAV_IDS = [
  { id: 'home',    labelKey: 'home',    icon: Home,        available: true  },
  { id: 'prices',  labelKey: 'prices',  icon: TrendingUp,  available: true  },
  { id: 'sell',    labelKey: 'sellCrop',icon: ShoppingBag, available: true  },
  { id: 'ai',      labelKey: 'aiPrediction', icon: Bot,    available: true  },
  { id: 'profile', labelKey: 'profile', icon: User,        available: true  },
]

/**
 * Mobile-first Bottom Navigation Bar for KisanMitra.
 * Shown on mobile/tablet viewports and hidden on desktop (md:hidden).
 *
 * Props:
 *   activeTab       — string  current view key from App.jsx (e.g. 'home')
 *   onNavigate      — (viewKey: string) => void  propagated from App.jsx setCurrentView
 *   user            — authenticated user object from AuthContext (null if not logged in)
 *   isAuthenticated — boolean from AuthContext
 */
export default function BottomNavigation({ activeTab = 'home', onNavigate, user, isAuthenticated }) {
  const { t } = useLanguage()
  // Local toast state for unavailable tabs
  const [toastId, setToastId] = useState(null)

  // Resolve the role-aware destination for the Home tab
  const getHomeView = () => {
    if (!isAuthenticated || !user) return 'home'
    if (user.role === 'buyer') return 'buyer-authenticated'
    if (user.role === 'admin') return 'admin-dashboard'
    return 'home' // farmer
  }

  // Resolve the role-aware destination for the Profile tab
  const getProfileView = () => {
    if (!isAuthenticated || !user) return 'login'
    if (user.role === 'buyer') return 'buyer-profile'
    if (user.role === 'admin') return 'admin-dashboard'
    return 'profile' // farmer
  }

  // Resolve the role-aware destination for the Sell tab
  const getSellView = () => {
    if (!isAuthenticated || !user) return 'login'
    if (user.role === 'buyer') return 'marketplace'
    return 'my-crops' // farmer (or any other role — graceful fallback)
  }

  // Resolve the destination for the AI tab
  const getAiView = () => {
    if (!isAuthenticated || !user) return 'login'
    return 'price-prediction'
  }

  const handlePress = (item) => {
    if (!item.available) {
      setToastId(item.id)
      setTimeout(() => setToastId(null), 2000)
      return
    }
    // Role-aware dispatches
    if (item.id === 'home') {
      onNavigate?.(getHomeView())
      return
    }
    if (item.id === 'profile') {
      onNavigate?.(getProfileView())
      return
    }
    if (item.id === 'sell') {
      onNavigate?.(getSellView())
      return
    }
    if (item.id === 'ai') {
      onNavigate?.(getAiView())
      return
    }
    onNavigate?.(item.id)
  }

  // "Home" tab highlights for all role-specific home views
  const HOME_VIEWS = ['home', 'buyer-authenticated', 'admin-dashboard']
  const isHomeActive = HOME_VIEWS.includes(activeTab)

  // "Profile" tab highlights for role-specific profile views
  // Note: admin-dashboard is intentionally excluded here — it now belongs to HOME_VIEWS
  const PROFILE_VIEWS = ['profile', 'buyer-profile']
  const isProfileActive = PROFILE_VIEWS.includes(activeTab)

  // "Sell" tab highlights for both farmer and buyer sell-side views
  const SELL_VIEWS = ['my-crops', 'marketplace']
  const isSellActive = SELL_VIEWS.includes(activeTab)

  // "AI" tab highlights for the prediction view
  const AI_VIEWS = ['price-prediction']
  const isAiActive = AI_VIEWS.includes(activeTab)

  return (
    <nav
      aria-label="Main navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-emerald-100 shadow-lg px-2 py-1.5"
    >
      {/* Coming-soon toast */}
      {toastId && (
        <div
          role="status"
          aria-live="polite"
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-4 py-2 rounded-xl bg-slate-800 text-white text-xs font-semibold shadow-lg whitespace-nowrap"
        >
          {t('comingSoon', 'Coming soon')}
        </div>
      )}

      <div className="flex items-center justify-around max-w-md mx-auto">
        {NAV_IDS.map((item) => {
          const Icon = item.icon
          const label = t(item.labelKey, item.id)
          const isActive =
            item.id === 'home'    ? isHomeActive :
            item.id === 'profile' ? isProfileActive :
            item.id === 'sell'    ? isSellActive :
            item.id === 'ai'      ? isAiActive :
            activeTab === item.id

          return (
            <button
              key={item.id}
              type="button"
              aria-label={label}
              aria-current={isActive ? 'page' : undefined}
              onClick={() => handlePress(item)}
              className={`relative flex flex-col items-center justify-center py-1 px-2 min-w-[56px] min-h-[48px] rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-700 font-bold bg-emerald-50 scale-105'
                  : item.available
                    ? 'text-gray-500 font-medium hover:text-emerald-600'
                    : 'text-gray-400 font-medium opacity-60'
              }`}
            >
              <Icon
                size={22}
                className={`transition-colors ${isActive ? 'text-emerald-600 stroke-[2.5]' : 'stroke-[1.75]'}`}
                aria-hidden="true"
              />
              <span className="text-[11px] mt-0.5 leading-tight tracking-tight">
                {label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
