import { useState, useCallback, useEffect } from 'react'
import { getAdminUsers, getAdminUserById } from '../../services/adminService'
import { useLanguage } from '../../context/LanguageContext'
import {
  ArrowLeft,
  Users,
  Search,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  Phone,
  MapPin,
  ShieldCheck,
  Clock,
  XCircle,
  ShoppingBag,
  Wheat,
  Star,
  ClipboardList,
  Briefcase,
  CheckCircle2,
} from 'lucide-react'

// ── Role badge ────────────────────────────────────────────────────────────────

function RoleBadge({ role }) {
  const cfg = {
    farmer: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    buyer:  'bg-blue-100    text-blue-800    border-blue-200',
    admin:  'bg-violet-100  text-violet-800  border-violet-200',
  }
  const icons = { farmer: Wheat, buyer: ShoppingBag, admin: ShieldCheck }
  const Icon = icons[role] || User
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wide ${cfg[role] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      <Icon size={10} aria-hidden="true" />
      {role}
    </span>
  )
}

// ── Verification badge ────────────────────────────────────────────────────────

function VerifBadge({ status }) {
  if (!status) return null
  const cfg = {
    verified: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    pending:  'bg-amber-100   text-amber-800   border-amber-200',
    rejected: 'bg-rose-100    text-rose-800    border-rose-200',
  }
  const icons = { verified: CheckCircle2, pending: Clock, rejected: XCircle }
  const Icon = icons[status] || Clock
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${cfg[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
      <Icon size={10} aria-hidden="true" />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ── User card (list item) ─────────────────────────────────────────────────────

function UserCard({ user, onSelect, t }) {
  const formatDate = (v) => {
    if (!v) return null
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const locationParts = [user.village, user.district, user.state].filter(Boolean)

  return (
    <button
      type="button"
      onClick={() => onSelect(user.id)}
      className="w-full text-left bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md hover:border-slate-200 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
            <User size={16} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 text-sm truncate">{user.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-xs text-slate-500 flex items-center gap-0.5">
                <Phone size={10} className="text-slate-400" />
                {user.mobile}
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <RoleBadge role={user.role} />
          {user.role === 'farmer' && user.verificationStatus && (
            <VerifBadge status={user.verificationStatus} />
          )}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
        {locationParts.length > 0 && (
          <span className="flex items-center gap-0.5">
            <MapPin size={10} className="text-slate-400" />
            {locationParts.join(', ')}
          </span>
        )}
        {user.businessName && (
          <span className="flex items-center gap-0.5">
            <Briefcase size={10} className="text-slate-400" />
            {user.businessName}
          </span>
        )}
        {formatDate(user.createdAt) && (
          <span className="text-slate-400">{t('joinedLabel')} {formatDate(user.createdAt)}</span>
        )}
      </div>
    </button>
  )
}

// ── User detail panel ─────────────────────────────────────────────────────────

function UserDetail({ userId, onClose, t }) {
  const [detail,  setDetail]  = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    let cancelled = false
    getAdminUserById(userId)
      .then((data) => { if (!cancelled) { setDetail(data.user); setError(null) } })
      .catch((err) => { if (!cancelled) { setError(err?.message || t('error')); setDetail(null) } })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId, t])

  const formatDate = (v) => {
    if (!v) return '—'
    const d = new Date(v)
    return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-md">
      {/* Panel header */}
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-bold text-slate-800">{t('userDetail')}</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="w-7 h-7 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {loading && (
          <div className="flex items-center gap-2 text-slate-400 text-sm py-4 justify-center">
            <Loader2 size={18} className="animate-spin" />
            <span>{t('loading')}</span>
          </div>
        )}

        {!loading && error && (
          <p className="text-xs text-rose-600 font-medium">{error}</p>
        )}

        {!loading && detail && (
          <>
            {/* Identity */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                <User size={22} />
              </div>
              <div>
                <p className="font-extrabold text-slate-900 text-base">{detail.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <RoleBadge role={detail.role} />
                  {detail.role === 'farmer' && <VerifBadge status={detail.verificationStatus} />}
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Phone size={13} className="text-slate-400 shrink-0" />
                <span className="font-mono">{detail.mobile}</span>
              </div>
              {(detail.village || detail.district || detail.state) && (
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin size={13} className="text-slate-400 shrink-0" />
                  <span>{[detail.village, detail.district, detail.state].filter(Boolean).join(', ')}</span>
                </div>
              )}
              {detail.businessName && (
                <div className="flex items-center gap-2 text-slate-600">
                  <Briefcase size={13} className="text-slate-400 shrink-0" />
                  <span>{detail.businessName}{detail.businessType ? ` · ${detail.businessType}` : ''}</span>
                </div>
              )}
            </div>

            {/* Platform counts */}
            <div className="grid grid-cols-2 gap-2">
              {detail.cropCount != null && (
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Wheat size={13} className="text-orange-500" />
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">{t('cropsLabel')}</span>
                  </div>
                  <p className="text-xl font-extrabold text-slate-900">{detail.cropCount}</p>
                </div>
              )}
              {detail.bookingCount != null && (
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <ClipboardList size={13} className="text-violet-500" />
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">{t('bookingsLabel')}</span>
                  </div>
                  <p className="text-xl font-extrabold text-slate-900">{detail.bookingCount}</p>
                </div>
              )}
              {detail.reviewCount != null && (
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Star size={13} className="text-amber-500" />
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">{t('reviewsLabel')}</span>
                  </div>
                  <p className="text-xl font-extrabold text-slate-900">{detail.reviewCount}</p>
                </div>
              )}
              {detail.avgRating != null && (
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <div className="flex items-center justify-center gap-1 mb-0.5">
                    <Star size={13} className="text-amber-500" />
                    <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">{t('avgRatingLabel')}</span>
                  </div>
                  <p className="text-xl font-extrabold text-slate-900">{Number(detail.avgRating).toFixed(1)}</p>
                </div>
              )}
            </div>

            {/* Dates */}
            <div className="text-[11px] text-slate-400 space-y-0.5 border-t border-slate-100 pt-3">
              <p>{t('joinedLabel')}: <span className="text-slate-600 font-medium">{formatDate(detail.createdAt)}</span></p>
              <p>{t('updatedLabel')}: <span className="text-slate-600 font-medium">{formatDate(detail.updatedAt)}</span></p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * AdminUsers — paginated, searchable, filterable user list.
 * Props: onNavigate
 */
export default function AdminUsers({ onNavigate }) {
  const { t } = useLanguage()
  const [users,      setUsers]      = useState([])
  const [pagination, setPagination] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [role,   setRole]   = useState('')
  const [verif,  setVerif]  = useState('')

  // Applied filters (submitted) — page is embedded here
  const [applied, setApplied] = useState({ search: '', role: '', verif: '', page: 1 })

  // Detail panel
  const [selectedId, setSelectedId] = useState(null)

  const ROLE_OPTIONS = [
    { value: '',        label: t('allRoles') },
    { value: 'farmer',  label: t('farmers') },
    { value: 'buyer',   label: t('buyers') },
    { value: 'admin',   label: t('admins') },
  ]

  const VERIF_OPTIONS = [
    { value: '',          label: t('allStatuses') },
    { value: 'pending',   label: t('pending') },
    { value: 'verified',  label: t('verifiedStatus') },
    { value: 'rejected',  label: t('rejectedStatus') },
  ]

  const fetchUsers = useCallback((filters) => {
    const params = { page: filters.page, limit: 20 }
    if (filters.role)   params.role = filters.role
    if (filters.verif)  params.verificationStatus = filters.verif
    if (filters.search) params.search = filters.search
    setLoading(true)
    getAdminUsers(params)
      .then((data) => {
        setUsers(data.users || [])
        setPagination(data.pagination || null)
        setError(null)
      })
      .catch((err) => {
        setError(err?.message || t('error'))
        setUsers([])
      })
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    let active = true
    const params = { page: applied.page, limit: 20 }
    if (applied.role)   params.role = applied.role
    if (applied.verif)  params.verificationStatus = applied.verif
    if (applied.search) params.search = applied.search
    getAdminUsers(params)
      .then((data) => {
        if (!active) return
        setUsers(data.users || [])
        setPagination(data.pagination || null)
        setError(null)
      })
      .catch((err) => {
        if (!active) return
        setError(err?.message || t('error'))
        setUsers([])
      })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [applied, t])

  const handleSearch = (e) => {
    e.preventDefault()
    setApplied({ search: search.trim(), role, verif, page: 1 })
    setSelectedId(null)
  }

  const handleReset = () => {
    setSearch(''); setRole(''); setVerif('')
    setApplied({ search: '', role: '', verif: '', page: 1 })
    setSelectedId(null)
  }

  const goToPage = (p) => {
    setApplied((prev) => ({ ...prev, page: p }))
    setSelectedId(null)
  }

  const hasFilters = applied.search || applied.role || applied.verif

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={t('backToDashboard')}
          onClick={() => onNavigate?.('admin-dashboard')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Users size={22} className="text-violet-600" />
            {t('userManagement')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {pagination ? `${pagination.total} ${t('usersCount')}` : t('platformUsers')}
          </p>
        </div>
        <button
          type="button"
          aria-label={t('refresh')}
          onClick={() => fetchUsers(applied)}
          disabled={loading}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-40"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search + Filters */}
      <form onSubmit={handleSearch} className="space-y-2.5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('searchUsersPlaceholder')}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {t('search')}
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
          >
            {ROLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <select
            value={verif}
            onChange={(e) => setVerif(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
          >
            {VERIF_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {hasFilters && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors focus:outline-none"
            >
              <X size={13} />{t('clearLabel')}
            </button>
          )}
        </div>
      </form>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center justify-between gap-3">
          <span>{error}</span>
          <button type="button" onClick={() => fetchUsers(applied)}
            className="text-xs font-semibold underline hover:no-underline shrink-0">{t('retry')}</button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="py-12 flex flex-col items-center gap-3 text-slate-400">
          <Loader2 size={28} className="animate-spin text-violet-400" />
          <p className="text-sm font-medium">{t('loadingUsers')}</p>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && users.length === 0 && (
        <div className="py-14 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <Users size={28} />
          </div>
          <div>
            <p className="font-bold text-slate-700">{t('noUsersFound')}</p>
            <p className="text-sm text-slate-500 mt-1">
              {hasFilters ? t('tryAdjustingFilters') : t('noUsersRegistered')}
            </p>
          </div>
        </div>
      )}

      {/* List + Detail side-by-side on wider screens */}
      {!loading && !error && users.length > 0 && (
        <div className={`gap-4 ${selectedId ? 'flex flex-col lg:grid lg:grid-cols-2' : ''}`}>
          {/* User list */}
          <div className="space-y-2.5">
            {users.map((u) => (
              <UserCard
                key={String(u.id)}
                user={u}
                t={t}
                onSelect={(id) => setSelectedId((prev) => prev === id ? null : id)}
              />
            ))}
          </div>

          {/* Detail panel */}
          {selectedId && (
            <UserDetail userId={selectedId} onClose={() => setSelectedId(null)} t={t} />
          )}
        </div>
      )}

      {/* Pagination */}
      {!loading && pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={() => goToPage(pagination.page - 1)}
            disabled={!pagination.hasPrev}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            <ChevronLeft size={15} />{t('prevPage')}
          </button>
          <span className="text-sm text-slate-500">
            {t('pageLabel')} <strong>{pagination.page}</strong> {t('pageOfLabel')} <strong>{pagination.totalPages}</strong>
          </span>
          <button
            type="button"
            onClick={() => goToPage(pagination.page + 1)}
            disabled={!pagination.hasNext}
            className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            {t('nextPage')}<ChevronRight size={15} />
          </button>
        </div>
      )}

    </div>
  )
}
