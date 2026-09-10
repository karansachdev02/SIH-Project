import { useState } from 'react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import {
  User,
  Phone,
  MapPin,
  Globe,
  ShoppingBag,
  Home,
  LogOut,
  CalendarDays,
  Pencil,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  Briefcase,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { updateBuyerProfile } from '../../services/profileService'

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
      <div className="mt-0.5 w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
        <Icon size={16} className="text-blue-600" aria-hidden="true" />
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
  'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors'

const selectCls =
  'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-colors pr-8'

// ── EditBuyerProfileForm ──────────────────────────────────────────────────────

function EditBuyerProfileForm({ user, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    district: user?.district || '',
    state: user?.state || '',
    businessName: user?.businessName || '',
    businessType: user?.businessType || '',
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
      district: formData.district.trim(),
      state: formData.state.trim(),
      businessName: formData.businessName.trim(),
      businessType: formData.businessType.trim(),
      preferredLanguage: formData.preferredLanguage,
    }

    setSubmitting(true)
    try {
      const data = await updateBuyerProfile(payload)
      onSave(data.user)
    } catch (err) {
      setError(err?.message || 'Profile update failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-blue-50 rounded-2xl border border-blue-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Pencil size={16} className="text-blue-600" aria-hidden="true" />
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
          <label htmlFor="bp-name" className="block text-xs font-semibold text-slate-600 mb-1">
            Name <span className="text-rose-500" aria-hidden="true">*</span>
          </label>
          <input
            id="bp-name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleChange}
            placeholder="Your full name"
            maxLength={100}
            required
            className={inputCls}
          />
        </div>

        {/* Business Name */}
        <div>
          <label htmlFor="bp-businessName" className="block text-xs font-semibold text-slate-600 mb-1">
            Business Name
          </label>
          <input
            id="bp-businessName"
            name="businessName"
            type="text"
            value={formData.businessName}
            onChange={handleChange}
            placeholder="Your business or firm name"
            maxLength={150}
            className={inputCls}
          />
        </div>

        {/* Business Type */}
        <div>
          <label htmlFor="bp-businessType" className="block text-xs font-semibold text-slate-600 mb-1">
            Business Type
          </label>
          <input
            id="bp-businessType"
            name="businessType"
            type="text"
            value={formData.businessType}
            onChange={handleChange}
            placeholder="e.g. Wholesaler, Retailer, Processor"
            maxLength={100}
            className={inputCls}
          />
        </div>

        {/* District */}
        <div>
          <label htmlFor="bp-district" className="block text-xs font-semibold text-slate-600 mb-1">
            District
          </label>
          <input
            id="bp-district"
            name="district"
            type="text"
            value={formData.district}
            onChange={handleChange}
            placeholder="Your district"
            maxLength={100}
            className={inputCls}
          />
        </div>

        {/* State */}
        <div>
          <label htmlFor="bp-state" className="block text-xs font-semibold text-slate-600 mb-1">
            State
          </label>
          <input
            id="bp-state"
            name="state"
            type="text"
            value={formData.state}
            onChange={handleChange}
            placeholder="Your state"
            maxLength={100}
            className={inputCls}
          />
        </div>

        {/* Preferred Language */}
        <div>
          <label htmlFor="bp-language" className="block text-xs font-semibold text-slate-600 mb-1">
            Preferred Language
          </label>
          <div className="relative">
            <select
              id="bp-language"
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
          <span className="font-semibold text-slate-600">Mobile:</span>{' '}
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
            Cancel
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
                Saving…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <CheckCircle2 size={16} aria-hidden="true" />
                Save
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ── BuyerProfile — main page ──────────────────────────────────────────────────

/**
 * Buyer Profile Page — view and edit authenticated buyer profile.
 *
 * Props:
 *   user       — authenticated buyer object from AuthContext (may be null)
 *   onNavigate — (viewKey: string) => void  callback into App.jsx currentView system
 */
export default function BuyerProfile({ user, onNavigate }) {
  const { logout, updateUser } = useAuth()
  const [editing, setEditing] = useState(false)
  const [successMessage, setSuccessMessage] = useState(null)

  const joinedDate = formatDate(user?.createdAt)
  const languageLabel = LANGUAGE_LABELS[user?.preferredLanguage] || user?.preferredLanguage || null

  const locationParts = [user?.district, user?.state].filter(Boolean)
  const locationString = locationParts.join(', ') || null

  const handleSave = (updatedUser) => {
    updateUser(updatedUser)
    setEditing(false)
    setSuccessMessage('Profile updated successfully!')
    setTimeout(() => setSuccessMessage(null), 3500)
  }

  return (
    <div className="space-y-5 max-w-lg mx-auto">

      {/* ── HEADER CARD ─────────────────────────────────────────────────── */}
      <section aria-labelledby="buyer-profile-heading">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/20 shrink-0">
              <ShoppingBag size={30} aria-hidden="true" />
            </div>

            {/* Name + role badge */}
            <div className="min-w-0 flex-1 space-y-1.5">
              <h1
                id="buyer-profile-heading"
                className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight truncate"
              >
                {user?.name || 'Buyer'}
              </h1>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border bg-blue-100 text-blue-800 border-blue-200">
                <ShoppingBag size={11} aria-hidden="true" />
                Buyer
              </span>
            </div>

            {/* Edit button */}
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                aria-label="Edit profile"
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1"
              >
                <Pencil size={13} aria-hidden="true" />
                <span className="hidden sm:inline">Edit Profile</span>
                <span className="sm:hidden">Edit</span>
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

      {/* ── EDIT FORM ─────────────────────────────────────────────────── */}
      {editing && (
        <EditBuyerProfileForm
          user={user}
          onSave={handleSave}
          onCancel={() => setEditing(false)}
        />
      )}

      {/* ── DETAILS CARD ─────────────────────────────────────────────── */}
      <section aria-label="Profile Details">
        <Card className="p-5 divide-y-0">
          <ProfileRow icon={Phone}        label="Mobile"           value={user?.mobile} />
          <ProfileRow icon={User}         label="Role"             value="Buyer" />
          <ProfileRow icon={Briefcase}    label="Business Name"    value={user?.businessName} />
          <ProfileRow icon={ShoppingBag}  label="Business Type"    value={user?.businessType} />
          <ProfileRow icon={MapPin}       label="Location"         value={locationString} />
          <ProfileRow icon={Globe}        label="Language"         value={languageLabel} />
          <ProfileRow icon={CalendarDays} label="Joined"           value={joinedDate} />
        </Card>
      </section>

      {/* ── ACTIONS ──────────────────────────────────────────────────── */}
      <div className="flex gap-3 pb-6">
        <Button
          variant="outline"
          size="md"
          fullWidth
          onClick={() => onNavigate?.('buyer-authenticated')}
        >
          <Home size={18} />
          <span>Portal</span>
        </Button>
        <Button
          variant="secondary"
          size="md"
          fullWidth
          onClick={logout}
        >
          <LogOut size={18} />
          <span>Logout</span>
        </Button>
      </div>

    </div>
  )
}
