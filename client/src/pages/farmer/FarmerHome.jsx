import { useState, useEffect } from 'react'
import Card from '../../components/common/Card'
import MarketPriceCard from '../../components/common/MarketPriceCard'
import { getMarketPrices } from '../../services/marketPriceService'
import { useLanguage } from '../../context/LanguageContext'
import {
  Sprout,
  Wheat,
  Truck,
  Bot,
  Lightbulb,
  CheckCircle2,
  MapPin,
  Phone,
  ChevronRight,
  Loader2,
  Cloud,
  ClipboardList,
  UserCircle,
  CreditCard,
} from 'lucide-react'

/**
 * Farmer Home Dashboard.
 *
 * Props:
 *   user       — authenticated farmer object from AuthContext (may be null for unauthenticated visitors)
 *   onNavigate — (viewKey: string) => void  callback into App.jsx currentView system
 */
export default function FarmerHome({ user, onNavigate }) {
  const { language, t } = useLanguage()
  const [comingSoonId, setComingSoonId] = useState(null)

  // ── Market price state ────────────────────────────────────────────────────
  const [priceData, setPriceData]     = useState(null)   // first price record
  const [priceSource, setPriceSource] = useState(null)   // 'data.gov.in' | 'fallback'
  const [priceLoading, setPriceLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await getMarketPrices({ commodity: 'Wheat', limit: 1 })
        if (!cancelled) {
          setPriceData(res.prices?.[0] ?? null)
          setPriceSource(res.source ?? null)
        }
      } catch {
        // API unavailable — leave priceData null, fallback shown below
        if (!cancelled) setPriceSource('fallback')
      } finally {
        if (!cancelled) setPriceLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // ── Action cards — defined inside component so t() is always current ──────
  const ACTION_ITEMS = [
    {
      id: 'my-crops',
      titleKey: 'actionMyCrops',
      icon: Wheat,
      color: 'bg-amber-100 text-amber-800 border-amber-200',
      available: true,
    },
    {
      id: 'booking-requests',
      titleKey: 'actionBookings',
      icon: ClipboardList,
      color: 'bg-blue-100 text-blue-800 border-blue-200',
      available: true,
    },
    {
      id: 'delivery-management',
      titleKey: 'actionDelivery',
      icon: Truck,
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      available: true,
    },
    {
      id: 'farmer-transactions',
      titleKey: 'actionTransactions',
      icon: CreditCard,
      color: 'bg-violet-100 text-violet-800 border-violet-200',
      available: true,
    },
    {
      id: 'price-prediction',
      titleKey: 'actionAiPrice',
      icon: Bot,
      color: 'bg-violet-100 text-violet-800 border-violet-200',
      available: true,
    },
    {
      id: 'weather',
      titleKey: 'actionWeather',
      icon: Cloud,
      color: 'bg-sky-100 text-sky-800 border-sky-200',
      available: true,
    },
    {
      id: 'profile',
      titleKey: 'actionProfile',
      icon: UserCircle,
      color: 'bg-slate-100 text-slate-700 border-slate-200',
      available: true,
    },
  ]

  // Derive display values safely — gracefully handle missing fields
  const farmerName = user?.name || t('farmer', 'Farmer')
  const role = user?.role || null
  const mobile = user?.mobile || null
  const state = user?.state || null
  const district = user?.district || null
  const village = user?.village || null
  const verificationStatus = user?.verificationStatus || null
  const isVerified = verificationStatus === 'verified'

  // Role-correct badge label and visibility:
  //   farmer + verified  → 'Verified Farmer'
  //   buyer (always)     → 'Verified Buyer'   (buyers are always authenticated/verified)
  //   admin              → 'Administrator'
  const roleBadgeLabel =
    role === 'admin'  ? t('adminBadge', 'Administrator') :
    role === 'buyer'  ? t('verifiedBuyer', 'Verified Buyer') :
    t('verifiedFarmer', 'Verified Farmer')

  // Show badge when:
  //   farmer → only if verificationStatus === 'verified'
  //   buyer  → always (they are always authenticated at this view)
  //   admin  → always
  const showRoleBadge =
    role === 'admin' ? true :
    role === 'buyer' ? true :
    isVerified   // farmer: only if verified

  // Location string — show only filled fields
  const locationParts = [village, district, state].filter(Boolean)
  const locationString = locationParts.length > 0 ? locationParts.join(', ') : null

  const handleComingSoon = (id) => {
    setComingSoonId(id)
    setTimeout(() => setComingSoonId(null), 2200)
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* ── 1. WELCOME / IDENTITY SECTION ───────────────────────────────── */}
      <section
        aria-labelledby="greeting-heading"
        className="bg-white rounded-2xl p-5 border border-emerald-100/80 shadow-xs"
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: name + status */}
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1
                id="greeting-heading"
                className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight"
              >
                {t('namasteGreeting', 'Hello')}, {farmerName}
              </h1>
              <span className="text-2xl" role="img" aria-label="waving hand">👋</span>
            </div>

            <p className="text-base sm:text-lg text-emerald-800 font-medium">
              {t('farmerHomeSubtitle', 'Find the best price for your crop today')}
            </p>

            {/* Role badge — role-correct label for farmer/buyer/admin */}
            {showRoleBadge && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200">
                <CheckCircle2 size={13} />
                {roleBadgeLabel}
              </span>
            )}
          </div>

          {/* Right: avatar */}
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
            <Sprout size={28} aria-hidden="true" />
          </div>
        </div>

        {/* Farmer details row */}
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

      {/* ── 2. MARKET PRICE CARD (live backend data with fallback) ──────── */}
      <section aria-labelledby="market-price-section">
        {priceLoading ? (
          /* Loading skeleton — preserves layout height during fetch */
          <div className="bg-gradient-to-br from-emerald-900 via-emerald-850 to-teal-900 rounded-2xl p-6 flex items-center justify-center min-h-[140px] shadow-xl">
            <div className="flex items-center gap-3 text-emerald-300">
              <Loader2 size={24} className="animate-spin" aria-hidden="true" />
              <span className="text-sm font-medium">{t('loadingMarketPrices', 'Loading market prices…')}</span>
            </div>
          </div>
        ) : (
          <div
            role="button"
            tabIndex={0}
            aria-label={t('viewMarketPrices', 'View market prices')}
            onClick={() => onNavigate?.('prices')}
            onKeyDown={(e) => e.key === 'Enter' && onNavigate?.('prices')}
            className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 rounded-2xl"
          >
            <MarketPriceCard
              price={priceData ?? {
                commodity: 'Wheat',
                variety: 'Common',
                market: 'Sample Market',
                district: '\u2013',
                state: '\u2013',
                modalPrice: 2450,
                minPrice: 2200,
                maxPrice: 2650,
                unit: 'Quintal',
                date: null,
              }}
              variant="hero"
              isFallback={priceSource === 'fallback' || !priceData}
              locale={language}
            />
          </div>
        )}
      </section>

      {/* ── 3. PRIMARY ACTION GRID ───────────────────────────────────────── */}
      <section aria-label={t('primaryActions', 'Primary Actions')}>
        {/* Coming soon toast */}
        {comingSoonId && (
          <div
            role="status"
            aria-live="polite"
            className="mb-3 px-4 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-medium text-center shadow-lg"
          >
            {t('comingSoon', 'Coming soon')}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
          {ACTION_ITEMS.map((item) => {
            const Icon = item.icon
            const label = t(item.titleKey, item.id)
            const isComingSoon = comingSoonId === item.id

            return (
              <button
                key={item.id}
                type="button"
                aria-label={label}
                aria-disabled={!item.available}
                onClick={() => {
                  if (item.available) {
                    onNavigate?.(item.id)
                  } else {
                    handleComingSoon(item.id)
                  }
                }}
                className={`group relative flex flex-col items-center justify-center p-5 sm:p-6 bg-white rounded-2xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  item.available
                    ? 'border-emerald-100 shadow-xs hover:shadow-md hover:border-emerald-300 active:scale-95'
                    : 'border-slate-100 shadow-xs opacity-70 cursor-not-allowed'
                }`}
              >
                <div
                  className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border ${item.color} mb-3 ${item.available ? 'group-hover:scale-110 transition-transform duration-200' : ''} shadow-xs`}
                >
                  <Icon size={30} aria-hidden="true" />
                </div>
                <span
                  className={`text-base sm:text-lg font-bold transition-colors text-center ${
                    item.available
                      ? 'text-slate-800 group-hover:text-emerald-800'
                      : 'text-slate-500'
                  }`}
                >
                  {label}
                </span>
                {!item.available && (
                  <span className="mt-1 text-[10px] font-semibold text-slate-400 tracking-wide uppercase">
                    {t('comingSoon', 'Coming soon')}
                  </span>
                )}
                {isComingSoon && (
                  <span className="absolute inset-0 rounded-2xl ring-2 ring-emerald-400 ring-offset-0 animate-pulse" />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── 4. SMART ADVICE CARD ─────────────────────────────────────────── */}
      <section aria-labelledby="advice-heading">
        <Card className="bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/90 border-amber-200/80 p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Lightbulb size={26} aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h3
              id="advice-heading"
              className="text-base sm:text-lg font-bold text-amber-950 flex items-center gap-2"
            >
              <span>{t('todaysTip', "Today's Tip")}</span>
            </h3>
            <p className="text-sm sm:text-base text-amber-900/90 font-medium leading-relaxed">
              {t('farmerTip', 'Nearby buyers may offer better prices for your crops.')}
            </p>
          </div>
        </Card>
      </section>

      {/* ── 5. SELL CROP CTA — navigates to My Crops management page ── */}
      <section aria-label={t('sellCrop', 'Sell Crop')}>
        <button
          type="button"
          aria-label={t('sellCropCta', 'Sell Crop')}
          onClick={() => onNavigate?.('my-crops')}
          className="w-full flex items-center justify-center gap-3 py-4 px-6 text-xl font-extrabold rounded-2xl bg-emerald-600 text-white border-2 border-emerald-600 transition-colors hover:bg-emerald-700 hover:border-emerald-700 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 shadow-md shadow-emerald-600/20"
        >
          <Sprout size={28} aria-hidden="true" />
          <span>{t('sellCropCta', 'Sell Crop')}</span>
          <ChevronRight size={20} className="ml-auto" aria-hidden="true" />
        </button>
      </section>
    </div>
  )
}
