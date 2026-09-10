import { useState, useEffect, useCallback } from 'react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import { getMyCrops, createCrop, updateCrop, deleteCrop } from '../../services/cropService'
import {
  Wheat,
  Plus,
  Home,
  Loader2,
  AlertCircle,
  PackageOpen,
  X,
  CheckCircle2,
  CalendarDays,
  MapPin,
  IndianRupee,
  Tag,
  ChevronDown,
  Pencil,
  Trash2,
  AlertTriangle,
} from 'lucide-react'

// ── Status badge config ───────────────────────────────────────────────────────

const STATUS_CONFIG = {
  available: {
    label: 'उपलब्ध / Available',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  sold: {
    label: 'बिका / Sold',
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  inactive: {
    label: 'निष्क्रिय / Inactive',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
  },
}

const ALLOWED_STATUSES = ['available', 'inactive', 'sold']

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return null
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return null
  }
}

/**
 * Converts an ISO date string (or Date) to YYYY-MM-DD for <input type="date">
 */
function toDateInputValue(dateStr) {
  if (!dateStr) return ''
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return ''
    return d.toISOString().slice(0, 10)
  } catch {
    return ''
  }
}

// ── Shared form field styles ──────────────────────────────────────────────────

const inputCls =
  'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors'

const selectCls =
  'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white appearance-none focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-colors pr-8'

// ── CropFormFields — reused by both Add and Edit forms ────────────────────────

function CropFormFields({ formData, onChange }) {
  return (
    <>
      {/* Crop Name */}
      <div>
        <label htmlFor="cf-cropName" className="block text-xs font-semibold text-slate-600 mb-1">
          फसल का नाम / Crop Name <span className="text-rose-500" aria-hidden="true">*</span>
        </label>
        <input
          id="cf-cropName"
          name="cropName"
          type="text"
          value={formData.cropName}
          onChange={onChange}
          placeholder="जैसे: गेहूं, धान, मक्का"
          required
          className={inputCls}
        />
      </div>

      {/* Crop Type */}
      <div>
        <label htmlFor="cf-cropType" className="block text-xs font-semibold text-slate-600 mb-1">
          फसल का प्रकार / Crop Type
        </label>
        <input
          id="cf-cropType"
          name="cropType"
          type="text"
          value={formData.cropType}
          onChange={onChange}
          placeholder="जैसे: अनाज, दलहन, सब्जी"
          className={inputCls}
        />
      </div>

      {/* Quantity + Unit */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="cf-quantity" className="block text-xs font-semibold text-slate-600 mb-1">
            मात्रा / Quantity <span className="text-rose-500" aria-hidden="true">*</span>
          </label>
          <input
            id="cf-quantity"
            name="quantity"
            type="number"
            min="0.01"
            step="any"
            value={formData.quantity}
            onChange={onChange}
            placeholder="0"
            required
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="cf-quantityUnit" className="block text-xs font-semibold text-slate-600 mb-1">
            इकाई / Unit
          </label>
          <div className="relative">
            <select
              id="cf-quantityUnit"
              name="quantityUnit"
              value={formData.quantityUnit}
              onChange={onChange}
              className={selectCls}
            >
              <option value="quintal">क्विंटल</option>
              <option value="kg">किलोग्राम</option>
              <option value="ton">टन</option>
              <option value="bag">बोरा</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>

      {/* Expected Price */}
      <div>
        <label htmlFor="cf-expectedPrice" className="block text-xs font-semibold text-slate-600 mb-1">
          अपेक्षित मूल्य (₹/क्विंटल) / Expected Price
        </label>
        <input
          id="cf-expectedPrice"
          name="expectedPrice"
          type="number"
          min="0"
          step="any"
          value={formData.expectedPrice}
          onChange={onChange}
          placeholder="0"
          className={inputCls}
        />
      </div>

      {/* Harvest Date */}
      <div>
        <label htmlFor="cf-harvestDate" className="block text-xs font-semibold text-slate-600 mb-1">
          कटाई की तारीख / Harvest Date
        </label>
        <input
          id="cf-harvestDate"
          name="harvestDate"
          type="date"
          value={formData.harvestDate}
          onChange={onChange}
          className={inputCls}
        />
      </div>

      {/* Location */}
      <div>
        <label htmlFor="cf-location" className="block text-xs font-semibold text-slate-600 mb-1">
          स्थान / Location
        </label>
        <input
          id="cf-location"
          name="location"
          type="text"
          value={formData.location}
          onChange={onChange}
          placeholder="जैसे: ग्राम, जिला"
          className={inputCls}
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="cf-description" className="block text-xs font-semibold text-slate-600 mb-1">
          विवरण / Description
        </label>
        <textarea
          id="cf-description"
          name="description"
          value={formData.description}
          onChange={onChange}
          rows={2}
          placeholder="फसल के बारे में अतिरिक्त जानकारी"
          className={`${inputCls} resize-none`}
        />
      </div>
    </>
  )
}

// ── AddCropForm ───────────────────────────────────────────────────────────────

function AddCropForm({ onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    cropName: '',
    cropType: '',
    quantity: '',
    quantityUnit: 'quintal',
    expectedPrice: '',
    harvestDate: '',
    location: '',
    description: '',
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

    if (!formData.cropName.trim()) {
      setError('फसल का नाम आवश्यक है / Crop name is required')
      return
    }
    if (formData.quantity === '' || formData.quantity === null) {
      setError('मात्रा आवश्यक है / Quantity is required')
      return
    }
    const qty = Number(formData.quantity)
    if (isNaN(qty) || qty <= 0) {
      setError('मात्रा शून्य से अधिक होनी चाहिए / Quantity must be greater than zero')
      return
    }

    setSubmitting(true)
    try {
      await createCrop({
        cropName: formData.cropName.trim(),
        cropType: formData.cropType.trim(),
        quantity: qty,
        quantityUnit: formData.quantityUnit || 'quintal',
        expectedPrice: formData.expectedPrice !== '' ? Number(formData.expectedPrice) : undefined,
        harvestDate: formData.harvestDate || undefined,
        location: formData.location.trim(),
        description: formData.description.trim(),
      })
      onSuccess()
    } catch (err) {
      setError(err?.message || 'फसल जोड़ने में विफल / Failed to add crop')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Plus size={18} className="text-emerald-600" aria-hidden="true" />
          नई फसल जोड़ें / Add New Crop
        </h2>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close add crop form"
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
        <CropFormFields formData={formData} onChange={handleChange} />

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
                जोड़ रहे हैं…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Plus size={16} aria-hidden="true" />
                फसल जोड़ें
              </span>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

// ── EditCropForm ──────────────────────────────────────────────────────────────

function EditCropForm({ crop, onSuccess, onCancel }) {
  const [formData, setFormData] = useState({
    cropName: crop.cropName || '',
    cropType: crop.cropType || '',
    quantity: crop.quantity != null ? String(crop.quantity) : '',
    quantityUnit: crop.quantityUnit || 'quintal',
    expectedPrice: crop.expectedPrice != null ? String(crop.expectedPrice) : '',
    harvestDate: toDateInputValue(crop.harvestDate),
    location: crop.location || '',
    description: crop.description || '',
    status: crop.status || 'available',
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

    if (!formData.cropName.trim()) {
      setError('फसल का नाम आवश्यक है / Crop name is required')
      return
    }
    if (formData.quantity === '' || formData.quantity === null) {
      setError('मात्रा आवश्यक है / Quantity is required')
      return
    }
    const qty = Number(formData.quantity)
    if (isNaN(qty) || qty <= 0) {
      setError('मात्रा शून्य से अधिक होनी चाहिए / Quantity must be greater than zero')
      return
    }
    const price = formData.expectedPrice !== '' ? Number(formData.expectedPrice) : null
    if (formData.expectedPrice !== '' && (isNaN(price) || price < 0)) {
      setError('अपेक्षित मूल्य अमान्य है / Expected price is invalid')
      return
    }
    if (!ALLOWED_STATUSES.includes(formData.status)) {
      setError('अमान्य स्थिति / Invalid status')
      return
    }

    setSubmitting(true)
    try {
      await updateCrop(crop._id, {
        cropName: formData.cropName.trim(),
        cropType: formData.cropType.trim(),
        quantity: qty,
        quantityUnit: formData.quantityUnit || 'quintal',
        expectedPrice: formData.expectedPrice !== '' ? price : null,
        harvestDate: formData.harvestDate || null,
        location: formData.location.trim(),
        description: formData.description.trim(),
        status: formData.status,
      })
      onSuccess()
    } catch (err) {
      setError(err?.message || 'फसल अपडेट करने में विफल / Failed to update crop')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-amber-50 rounded-2xl border border-amber-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
          <Pencil size={16} className="text-amber-600" aria-hidden="true" />
          फसल संपादित करें / Edit Crop
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
        <CropFormFields formData={formData} onChange={handleChange} />

        {/* Status — only shown in edit form */}
        <div>
          <label htmlFor="ef-status" className="block text-xs font-semibold text-slate-600 mb-1">
            स्थिति / Status
          </label>
          <div className="relative">
            <select
              id="ef-status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className={selectCls}
            >
              <option value="available">उपलब्ध / Available</option>
              <option value="inactive">निष्क्रिय / Inactive</option>
              <option value="sold">बिका / Sold</option>
            </select>
            <ChevronDown
              size={14}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              aria-hidden="true"
            />
          </div>
        </div>

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

// ── DeleteConfirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({ crop, onConfirm, onCancel, deleting, deleteError }) {
  return (
    <div className="bg-rose-50 rounded-2xl border border-rose-200 p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle size={18} className="text-rose-500 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-bold text-rose-800">
            फसल हटाएं / Delete Crop?
          </p>
          <p className="text-xs text-rose-700 mt-0.5">
            &ldquo;<strong>{crop.cropName}</strong>&rdquo; को स्थायी रूप से हटाया जाएगा।
            यह क्रिया पूर्ववत नहीं की जा सकती।
          </p>
        </div>
      </div>

      {deleteError && (
        <div
          role="alert"
          className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-white border border-rose-200 text-rose-800 text-xs"
        >
          <AlertCircle size={14} className="shrink-0 mt-0.5" aria-hidden="true" />
          <span>{deleteError}</span>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          fullWidth
          onClick={onCancel}
          disabled={deleting}
        >
          रद्द करें / Cancel
        </Button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={deleting}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-1"
          aria-label={`Confirm deletion of ${crop.cropName}`}
        >
          {deleting ? (
            <>
              <Loader2 size={14} className="animate-spin" aria-hidden="true" />
              हटा रहे हैं…
            </>
          ) : (
            <>
              <Trash2 size={14} aria-hidden="true" />
              हटाएं / Delete
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ── CropCard ──────────────────────────────────────────────────────────────────

function CropCard({ crop, onEdit, onDelete }) {
  const status = STATUS_CONFIG[crop.status] || STATUS_CONFIG.available
  const harvestDisplay = formatDate(crop.harvestDate)

  return (
    <div className="bg-white rounded-2xl border border-emerald-100 shadow-xs p-4 space-y-3">
      {/* Header row: name + status badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Wheat size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold text-slate-900 truncate">{crop.cropName}</h3>
            {crop.cropType && (
              <p className="text-xs text-slate-500 font-medium">{crop.cropType}</p>
            )}
          </div>
        </div>
        <span
          className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${status.className}`}
        >
          {status.label}
        </span>
      </div>

      {/* Detail rows */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
        <div className="flex items-center gap-1.5 text-slate-700">
          <Tag size={13} className="text-slate-400 shrink-0" aria-hidden="true" />
          <span className="font-semibold">{crop.quantity} {crop.quantityUnit}</span>
        </div>

        {crop.expectedPrice != null && (
          <div className="flex items-center gap-1.5 text-slate-700">
            <IndianRupee size={13} className="text-slate-400 shrink-0" aria-hidden="true" />
            <span className="font-semibold">₹{crop.expectedPrice.toLocaleString('en-IN')}</span>
          </div>
        )}

        {harvestDisplay && (
          <div className="flex items-center gap-1.5 text-slate-500 col-span-2">
            <CalendarDays size={13} className="text-slate-400 shrink-0" aria-hidden="true" />
            <span>कटाई: {harvestDisplay}</span>
          </div>
        )}

        {crop.location && (
          <div className="flex items-center gap-1.5 text-slate-500 col-span-2">
            <MapPin size={13} className="text-slate-400 shrink-0" aria-hidden="true" />
            <span className="truncate">{crop.location}</span>
          </div>
        )}
      </div>

      {crop.description && (
        <p className="text-xs text-slate-500 border-t border-slate-100 pt-2 leading-relaxed">
          {crop.description}
        </p>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-1 border-t border-slate-100">
        <button
          type="button"
          onClick={() => onEdit(crop)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1"
          aria-label={`Edit ${crop.cropName}`}
        >
          <Pencil size={13} aria-hidden="true" />
          संपादित करें / Edit
        </button>
        <button
          type="button"
          onClick={() => onDelete(crop)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 bg-rose-50 hover:bg-rose-100 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1"
          aria-label={`Delete ${crop.cropName}`}
        >
          <Trash2 size={13} aria-hidden="true" />
          हटाएं / Delete
        </button>
      </div>
    </div>
  )
}

// ── MyCrops — main page ───────────────────────────────────────────────────────

/**
 * My Crops Page — complete farmer crop management.
 *
 * Props:
 *   onNavigate — (viewKey: string) => void  callback into App.jsx currentView system
 */
export default function MyCrops({ onNavigate }) {
  const [crops, setCrops] = useState([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  // UI mode: null | 'add' | { type: 'edit', crop } | { type: 'delete', crop }
  const [activeMode, setActiveMode] = useState(null)

  // Delete-specific state
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  const fetchCrops = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const data = await getMyCrops()
      setCrops(data.crops || [])
    } catch (err) {
      setFetchError(err?.message || 'फसल सूची प्राप्त नहीं हो सकी / Could not fetch crops')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCrops()
  }, [fetchCrops])

  const showSuccess = (msg) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 3500)
  }

  // ── handlers ────────────────────────────────────────────────────────────────

  const handleAddSuccess = () => {
    setActiveMode(null)
    showSuccess('फसल सफलतापूर्वक जोड़ी गई! / Crop added successfully!')
    fetchCrops()
  }

  const handleEditClick = (crop) => {
    setDeleteError(null)
    setActiveMode({ type: 'edit', crop })
    // Scroll form into view on mobile
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleEditSuccess = () => {
    setActiveMode(null)
    showSuccess('फसल सफलतापूर्वक अपडेट की गई! / Crop updated successfully!')
    fetchCrops()
  }

  const handleDeleteClick = (crop) => {
    setDeleteError(null)
    setActiveMode({ type: 'delete', crop })
  }

  const handleDeleteConfirm = async () => {
    if (!activeMode || activeMode.type !== 'delete') return
    const crop = activeMode.crop

    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteCrop(crop._id)
      setActiveMode(null)
      showSuccess(`"${crop.cropName}" सफलतापूर्वक हटाई गई / deleted successfully.`)
      fetchCrops()
    } catch (err) {
      // 409 = active bookings; surface the message clearly
      setDeleteError(err?.message || 'फसल हटाने में विफल / Failed to delete crop')
    } finally {
      setDeleting(false)
    }
  }

  const handleCloseMode = () => {
    setActiveMode(null)
    setDeleteError(null)
  }

  // ── determine which inline panel to show at top ──────────────────────────

  const showAddForm   = activeMode === 'add'
  const showEditForm  = activeMode?.type === 'edit'
  const showDeleteFor = activeMode?.type === 'delete' ? activeMode.crop : null

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* ── PAGE HEADER ─────────────────────────────────────────────────── */}
      <section aria-labelledby="my-crops-heading">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs shrink-0">
              <Wheat size={24} aria-hidden="true" />
            </div>
            <div>
              <h1
                id="my-crops-heading"
                className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight"
              >
                मेरी फसल
              </h1>
              <p className="text-xs text-slate-500 font-medium">My Crops</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigate?.('home')}
            aria-label="होम पर जाएं / Go to Home"
          >
            <Home size={16} />
            <span className="hidden sm:inline">होम</span>
          </Button>
        </div>
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

      {/* ── INLINE PANEL: Add / Edit / (Delete is shown inline on card) ── */}
      {showAddForm && (
        <AddCropForm
          onSuccess={handleAddSuccess}
          onCancel={handleCloseMode}
        />
      )}

      {showEditForm && (
        <EditCropForm
          crop={activeMode.crop}
          onSuccess={handleEditSuccess}
          onCancel={handleCloseMode}
        />
      )}

      {/* ── ADD CROP BUTTON — only when no inline form is open ────────── */}
      {!showAddForm && !showEditForm && (
        <button
          type="button"
          onClick={() => setActiveMode('add')}
          className="w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold text-base shadow-sm shadow-emerald-600/20 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          <Plus size={20} aria-hidden="true" />
          नई फसल जोड़ें / Add New Crop
        </button>
      )}

      {/* ── CROP LIST ────────────────────────────────────────────────── */}
      <section aria-label="आपकी फसलें / Your Crops">

        {/* Loading state */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
            <Loader2 size={32} className="animate-spin text-emerald-500" aria-hidden="true" />
            <p className="text-sm font-medium">फसलें लोड हो रही हैं… / Loading crops…</p>
          </div>
        )}

        {/* Fetch error state */}
        {!loading && fetchError && (
          <Card className="p-5">
            <div className="flex flex-col items-center gap-3 text-center py-4">
              <AlertCircle size={32} className="text-rose-400" aria-hidden="true" />
              <div>
                <p className="font-bold text-slate-900 text-sm">डेटा लोड नहीं हो सका</p>
                <p className="text-xs text-slate-500 mt-1">{fetchError}</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchCrops}>
                पुनः प्रयास करें / Retry
              </Button>
            </div>
          </Card>
        )}

        {/* Empty state */}
        {!loading && !fetchError && crops.length === 0 && (
          <Card className="p-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-400 flex items-center justify-center">
                <PackageOpen size={32} aria-hidden="true" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-base">
                  अभी कोई फसल नहीं है
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  ऊपर दिए बटन से अपनी पहली फसल जोड़ें।
                  <br />
                  <span className="text-xs">Add your first crop using the button above.</span>
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Crop cards list */}
        {!loading && !fetchError && crops.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {crops.length} फसल{crops.length !== 1 ? 'ें' : ''} / {crops.length} Crop{crops.length !== 1 ? 's' : ''}
            </p>
            {crops.map((crop) => (
              <div key={crop._id}>
                {/* Delete confirm shown inline below the card being deleted */}
                {showDeleteFor && showDeleteFor._id === crop._id ? (
                  <DeleteConfirm
                    crop={crop}
                    onConfirm={handleDeleteConfirm}
                    onCancel={handleCloseMode}
                    deleting={deleting}
                    deleteError={deleteError}
                  />
                ) : (
                  <CropCard
                    crop={crop}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteClick}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
