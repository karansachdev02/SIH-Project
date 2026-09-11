import { useState, useEffect } from 'react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import {
  User,
  Phone,
  MapPin,
  Globe,
  ShieldCheck,
  Clock,
  XCircle,
  Home,
  LogOut,
  CalendarDays,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Star,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { updateFarmerProfile } from '../../services/profileService'
import { getFarmerReviews } from '../../services/reviewService'

// ── Language options — must match registration form codes ────────────────────

const LANGUAGE_LABELS = {
  hi: 'हिन्दी (Hindi)',
  en: 'English',
  mr: 'मराठी (Marathi)',
  pa: 'ਪੰਜਾਬੀ (Punjabi)',
  gu: 'ગુજરાતી (Gujarati)',
  bn: 'বাংলা (Bengali)',
  te: 'తెలుగు (Telugu)',
  ta: 'தமிழ் (Tamil)',
  kn: 'ಕನ್ನಡ (Kannada)',
  ml: 'മലയാളം (Malayalam)',
  or: 'ଓଡ଼ିଆ (Odia)',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getVerificationBadge(status, t) {
  switch (status) {
    case 'verified':
      return {
        label: t ? t('verifiedStatus', 'Verified') : 'Verified',
        icon: ShieldCheck,
        className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        iconClass: 'text-emerald-600',
      }
    case 'pending':
      return {
        label: t ? t('pendingStatus', 'Pending Review') : 'Pending Review',
        icon: Clock,
        className: 'bg-amber-100 text-amber-800 border-amber-200',
        iconClass: 'text-amber-600',
      }
    case 'rejected':
      return {
        label: t ? t('rejectedStatus', 'Rejected') : 'Rejected',
        icon: XCircle,
        className: 'bg-rose-100 text-rose-800 border-rose-200',
        iconClass: 'text-rose-600',
      }
    default:
      return {
        label: t ? t('noData', 'Unknown') : 'Unknown',
        icon: User,
        className: 'bg-slate-100 text-slate-600 border-slate-200',
        iconClass: 'text-slate-400',
      }
  }
}

function formatDate(dateStr) {
  if (!dateStr) return null
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

// ── ProfileRow — read-only display row ───────────────────────────────────────

function ProfileRow({ icon: Icon, label, value }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="mt-0.5 w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-emerald-600" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-0.5">
          {label}
        </p>
        <p className="text-sm sm:text-base font-semibold text-slate-800 break-words">
          {value}
        </p>
      </div>
    </div>
  )
}

// ── Shared input style ────────────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors'

const selectCls =
  'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors pr-8'

// ── EditProfileForm ───────────────────────────────────────────────────────────

function EditProfileForm({ user, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    village: user?.village || '',
    district: user?.district || '',
    state: user?.state || '',
    preferredLanguage: user?.preferredLanguage || 'hi',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    // Client-side validation
    if (!formData.name.trim()) {
      setError('Name is required.')
      return
    }
    if (formData.name.trim().length > 100) {
      setError('Name must not exceed 100 characters.')
      return
    }

    const payload = {
      name: formData.name.trim(),
      village: formData.village.trim(),
      district: formData.district.trim(),
      state: formData.state.trim(),
      preferredLanguage: formData.preferredLanguage,
    }

    setSubmitting(true)
    try {
      const data = await updateFarmerProfile(payload)
      onSave(data.user)
    } catch (err) {
      setError(err?.message || 'Profile update failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-amber-50 rounded-2xl border border-amber-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Pencil size={16} className="text-amber-600" aria-hidden="true" />
          Edit Profile
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close edit form"
          className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm"
        >
          <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-3.5">

        {/* Name */}
        <div>
          <label htmlFor="ep-name" className="block text-xs font-semibold text-slate-600 mb-1">
            नाम / Name <span className="text-rose-500" aria-hidden="true">*</span>
          </label>
          <input
            id="ep-name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="आपका पूरा नाम"
            maxLength={100}
            required
            className={inputCls}
          />
        </div>

        {/* Village */}
        <div>
          <label htmlFor="ep-village" className="block text-xs font-semibold text-slate-600 mb-1">
            गांव / Village
          </label>
          <input
            id="ep-village"
            name="village"
            type="text"
            value={formData.village}
            onChange={handleChange}
            placeholder="आपका गांव"
            maxLength={100}
            className={inputCls}
          />
        </div>

        {/* District */}
        <div>
          <label htmlFor="ep-district" className="block text-xs font-semibold text-slate-600 mb-1">
            जिला / District
          </label>
          <input
            id="ep-district"
            name="district"
            type="text"
            value={formData.district}
            onChange={handleChange}
            placeholder="जिला"
            maxLength={100}
            className={inputCls}
          />
        </div>

        {/* State */}
        <div>
          <label htmlFor="ep-state" className="block text-xs font-semibold text-slate-600 mb-1">
            राज्य / State
          </label>
          <input
            id="ep-state"
            name="state"
            type="text"
            value={formData.state}
            onChange={handleChange}
            placeholder="राज्य"
            maxLength={100}
            className={inputCls}
          />
        </div>

        {/* Preferred Language */}
        <div>
          <label htmlFor="ep-language" className="block text-xs font-semibold text-slate-600 mb-1">
            भाषा / Preferred Language
          </label>
          <div className="relative">
            <select
              id="ep-language"
              name="preferredLanguage"
              value={formData.preferredLanguage}
              onChange={handleChange}
              className={selectCls}
            >
              {Object.entries(LANGUAGE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Mobile — read-only notice */}
        <div className="px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500">
          <span className="font-semibold text-slate-600">मोबाइल / Mobile:</span>{' '}
          {user?.mobile}{' '}
          <span className="text-slate-400">(OTP-verified — cannot be changed)</span>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button
            type="button"
            variant="outline"
            size="md"
            fullWidth
            onClick={onCancel}
            disabled={submitting}
          >
            रद्द करें / Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            fullWidth
            disabled={submitting}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                सहेज रहे हैं…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 size={16} aria-hidden="true" />
                सहेजें / Save
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ── FarmerRatingSummary — compact ratings card for the profile page ───────────
function FarmerRatingSummary({ farmerId }) {
  const [summary, setSummary] = useState(null)

  useEffect(() => {
    let cancelled = false
    getFarmerReviews(farmerId)
      .then((data) => {
        if (!cancelled) setSummary({ count: data.count, average: data.average, newSeller: data.newSeller })
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [farmerId])

  if (!summary) return null

  if (summary.newSeller) {
    return (
      <section aria-label="Ratings">
        <Card className="p-4 flex items-center gap-3">
          <Star size={18} className="text-slate-300" aria-hidden="true" />
          <p className="text-sm text-slate-500 font-medium">No ratings yet — you have no reviews.</p>
        </Card>
      </section>
    )
  }

  return (
    <section aria-label="Ratings">
      <Card className="p-4 flex items-center gap-3">
        <div className="flex items-center gap-0.5">
          {[1,2,3,4,5].map((n) => (
            <Star key={n} size={16}
              className={n <= Math.round(summary.average) ? 'text-amber-400' : 'text-slate-200'}
              fill={n <= Math.round(summary.average) ? 'currentColor' : 'none'}
            />
          ))}
        </div>
        <span className="text-base font-bold text-amber-700">{Number(summary.average).toFixed(1)}</span>
        <span className="text-sm text-slate-500">({summary.count} {summary.count === 1 ? 'review' : 'reviews'})</span>
      </Card>
    </section>
  )
}

// ── FarmerProfile — main page ─────────────────────────────────────────────────

/**
 * Farmer Profile Page — view and edit authenticated user profile.
 *
 * Props:
 *   user       — authenticated farmer object from AuthContext (may be null)
 *   onNavigate — (viewKey: string) => void  callback into App.jsx currentView system
 */
export default function FarmerProfile({ user, onNavigate }) {
  const { logout, updateUser } = useAuth()
  const { t } = useLanguage()
  const [editing, setEditing] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)

  const badge = getVerificationBadge(user?.verificationStatus, t)
  const BadgeIcon = badge.icon

  const locationParts = [user?.village, user?.district, user?.state].filter(Boolean)
  const locationString = locationParts.join(', ') || null

  const joinedDate = formatDate(user?.createdAt)
  const languageLabel = LANGUAGE_LABELS[user?.preferredLanguage] || user?.preferredLanguage || null

  const roleLabel =
    user?.role === 'farmer' ? t('farmer', 'Farmer')
    : user?.role === 'buyer' ? t('buyer', 'Buyer')
    : user?.role === 'admin' ? 'Admin'
    : user?.role || null

  const handleSave = (updatedUser) => {
    updateUser(updatedUser)
    setEditing(false)
    setSuccessMessage(t('profileUpdated', 'Profile updated successfully!'))
    setTimeout(() => setSuccessMessage(null), 3500)
  }

  return (
    <div className="space-y-5 max-w-lg mx-auto">

      {/* ── HEADER CARD ─────────────────────────────────────────────────── */}
      <section aria-labelledby="profile-heading">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
              <User size={32} aria-hidden="true" />
            </div>

            {/* Name + badge */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <h1
                id="profile-heading"
                className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate"
              >
                {user?.name || t('farmer', 'Farmer')}
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${badge.className}`}
              >
                <BadgeIcon size={13} className={badge.iconClass} aria-hidden="true" />
                {badge.label}
              </span>
            </div>

            {/* Edit button — top-right of header */}
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label={t('editProfile', 'Edit profile')}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1"
              >
                <Pencil size={13} aria-hidden="true" />
                <span>{t('editProfile', 'Edit Profile')}</span>
              </button>
            )}
          </div>
        </Card>
      </section>

      {/* ── SUCCESS TOAST ─────────────────────────────────────────────── */}
      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold"
        >
          <CheckCircle2 size={16} className="text-emerald-600 shrink-0" aria-hidden="true" />
          {successMessage}
        </div>
      )}

      {/* ── EDIT FORM — shown inline when editing ─────────────────────── */}
      {editing && (
        <EditProfileForm
          user={user}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      )}

      {/* ── DETAILS CARD ─────────────────────────────────────────────────── */}
      <section aria-label={t('farmerProfile', 'Profile Details')}>
        <Card className="p-5 divide-y-0">
          <ProfileRow icon={Phone}        label={t('mobile', 'Mobile')}           value={user?.mobile} />
          <ProfileRow icon={User}         label={t('role', 'Role')}               value={roleLabel} />
          <ProfileRow icon={MapPin}       label={t('location', 'Location')}       value={locationString} />
          <ProfileRow icon={Globe}        label={t('preferredLanguage', 'Language')} value={languageLabel} />
          <ProfileRow icon={CalendarDays} label={t('memberSince', 'Joined')}      value={joinedDate} />
        </Card>
      </section>

      {/* ── RATINGS SUMMARY ─────────────────────────────────────────────── */}
      {user?._id && <FarmerRatingSummary farmerId={String(user._id)} />}

      {/* ── ACTIONS ──────────────────────────────────────────────────────── */}
      <div className="flex gap-3 pb-6">
        <Button
          variant="outline"
          size="md"
          fullWidth
          onClick={() => onNavigate?.('home')}
        >
          <Home size={18} />
          <span>{t('goHome', 'Home')}</span>
        </Button>
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={logout}
        >
          <LogOut size={18} />
          <span>{t('logout', 'Logout')}</span>
        </Button>
      </div>

    </div>
  )
}
