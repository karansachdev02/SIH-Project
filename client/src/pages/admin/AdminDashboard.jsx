import { useState, useEffect, useCallback } from 'react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import { request } from '../../services/api'
import {
  ShieldCheck,
  Users,
  ShoppingBag,
  Wheat,
  Clock,
  RefreshCw,
  AlertCircle,
  LayoutDashboard,
  LogOut,
  CheckCircle2,
  ClipboardList,
  Star,
  TrendingUp,
  UserCheck,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, iconBg, iconColor, loading }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5 flex items-center gap-3 sm:gap-4">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={22} className={iconColor} aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-1">
          {label}
        </p>
        {loading ? (
          <div className="h-6 w-14 bg-slate-100 rounded-lg animate-pulse" />
        ) : (
          <p className="text-xl font-extrabold text-slate-900 leading-none">
            {value ?? '—'}
          </p>
        )}
      </div>
    </div>
  )
}

// ── Section heading ───────────────────────────────────────────────────────────

function SectionHeading({ children }) {
  return (
    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
      {children}
    </h2>
  )
}

// ── Action link card ──────────────────────────────────────────────────────────

function ActionCard({ icon: Icon, iconBg, iconColor, title, subtitle, badge, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-emerald-200 transition-all text-left focus:outline-none focus:ring-2 focus:ring-emerald-500"
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        <Icon size={20} className={iconColor} aria-hidden="true" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-slate-800">{title}</p>
        <p className="text-xs text-slate-500">{subtitle}</p>
      </div>
      {badge != null && badge > 0 && (
        <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200">
          {badge}
        </span>
      )}
    </button>
  )
}

// ── AdminDashboard ────────────────────────────────────────────────────────────

/**
 * Admin Dashboard — platform overview, statistics, and navigation.
 *
 * Props:
 *   onNavigate — (viewKey: string) => void  callback into App.jsx currentView system
 */
export default function AdminDashboard({ onNavigate }) {
  const { logout } = useAuth()
  const { t } = useLanguage()
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const fetchStats = useCallback(() => {
    setLoading(true)
    setError(null)
    request('/admin/stats')
      .then((data) => setStats(data.stats))
      .catch((err) => setError(err?.message || 'Failed to load stats. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    let active = true
    request('/admin/stats')
      .then((data) => { if (active) setStats(data.stats) })
      .catch((err) => { if (active) setError(err?.message || 'Failed to load stats. Please try again.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <section aria-labelledby="admin-dash-heading">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shadow-xs shrink-0">
              <LayoutDashboard size={22} aria-hidden="true" />
            </div>
            <div>
              <h1
                id="admin-dash-heading"
                className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight"
              >
                {t('adminDashboard', 'Admin Dashboard')}
              </h1>
              <p className="text-xs text-slate-500 font-medium">{t('adminDashboard', 'Platform overview')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={fetchStats}
            disabled={loading}
            aria-label="Refresh stats"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-1"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} aria-hidden="true" />
            Refresh
          </button>
        </div>
      </section>

      {/* ── ERROR ────────────────────────────────────────────────────────── */}
      {!loading && error && (
        <Card className="p-5">
          <div className="flex flex-col items-center gap-3 text-center py-2">
            <AlertCircle size={28} className="text-rose-400" aria-hidden="true" />
            <div>
              <p className="font-bold text-slate-900 text-sm">{t('noData', 'Could not load stats')}</p>
              <p className="text-xs text-slate-500 mt-1">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchStats}>{t('retry', 'Retry')}</Button>
          </div>
        </Card>
      )}

      {/* ── USERS SECTION ────────────────────────────────────────────────── */}
      {(loading || stats) && (
        <section aria-label="User statistics">
          <SectionHeading>{t('adminUsers', 'Users')}</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Users}     label={t('farmer', 'Total Farmers') + 's'}  value={stats?.totalFarmers}    iconBg="bg-emerald-100" iconColor="text-emerald-700" loading={loading} />
            <StatCard icon={ShoppingBag} label={t('buyer', 'Total Buyers') + 's'}  value={stats?.totalBuyers}     iconBg="bg-blue-100"    iconColor="text-blue-700"    loading={loading} />
            <StatCard icon={UserCheck}  label={t('verifiedFarmer', 'Verified Farmers')} value={stats?.verifiedFarmers} iconBg="bg-teal-100"   iconColor="text-teal-700"    loading={loading} />
            <StatCard icon={Clock}      label={t('pendingVerifications', 'Pending')}  value={stats?.pendingVerifications} iconBg="bg-amber-100" iconColor="text-amber-700" loading={loading} />
          </div>
        </section>
      )}

      {/* ── MARKETPLACE SECTION ──────────────────────────────────────────── */}
      {(loading || stats) && (
        <section aria-label="Marketplace statistics">
          <SectionHeading>{t('marketplace', 'Marketplace')}</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Wheat}       label="Total Crops"     value={stats?.totalCrops}    iconBg="bg-orange-100"  iconColor="text-orange-700"  loading={loading} />
            <StatCard icon={TrendingUp}  label="Available Crops" value={stats?.availableCrops} iconBg="bg-lime-100"   iconColor="text-lime-700"    loading={loading} />
          </div>
        </section>
      )}

      {/* ── ORDERS SECTION ───────────────────────────────────────────────── */}
      {(loading || stats) && (
        <section aria-label="Order statistics">
          <SectionHeading>{t('myBookings', 'Orders')}</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={ClipboardList} label={t('myBookings', 'Total Bookings')}  value={stats?.totalBookings}     iconBg="bg-violet-100" iconColor="text-violet-700" loading={loading} />
            <StatCard icon={Clock}         label={t('pending', 'Pending')}            value={stats?.pendingBookings}   iconBg="bg-amber-100"  iconColor="text-amber-700"  loading={loading} />
            <StatCard icon={CheckCircle2}  label={t('confirmed', 'Confirmed')}        value={stats?.confirmedBookings} iconBg="bg-emerald-100" iconColor="text-emerald-700" loading={loading} />
            <StatCard icon={Star}          label={t('completed', 'Completed')}        value={stats?.completedBookings} iconBg="bg-blue-100"   iconColor="text-blue-700"   loading={loading} />
          </div>
        </section>
      )}

      {/* ── REVIEWS SECTION ──────────────────────────────────────────────── */}
      {(loading || stats) && (
        <section aria-label="Review statistics">
          <SectionHeading>{t('reviews', 'Reviews')}</SectionHeading>
          <div className="grid grid-cols-2 gap-3">
            <StatCard icon={Star} label="Total Reviews" value={stats?.totalReviews} iconBg="bg-yellow-100" iconColor="text-yellow-700" loading={loading} />
          </div>
        </section>
      )}

      {/* ── QUICK ACTIONS ────────────────────────────────────────────────── */}
      <section aria-label="Admin actions">
        <SectionHeading>{t('viewAll', 'Actions')}</SectionHeading>
        <div className="space-y-3">
          <ActionCard
            icon={ShieldCheck}
            iconBg="bg-emerald-100"
            iconColor="text-emerald-700"
            title={t('adminVerification', 'Farmer Verification')}
            subtitle={t('pendingVerifications', 'Review pending farmer documents')}
            badge={stats?.pendingVerifications}
            onClick={() => onNavigate?.('admin-verification')}
          />
          <ActionCard
            icon={Users}
            iconBg="bg-violet-100"
            iconColor="text-violet-700"
            title={t('adminUsers', 'User Management')}
            subtitle={t('totalUsers', 'Browse and inspect platform users')}
            onClick={() => onNavigate?.('admin-users')}
          />
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <div className="flex justify-end pb-6">
        <Button variant="secondary" size="sm" onClick={logout}>
          <LogOut size={16} />
          <span>Logout</span>
        </Button>
      </div>

    </div>
  )
}
