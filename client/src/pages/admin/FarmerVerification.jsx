import React, { useState, useEffect, useCallback } from 'react'
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  AlertCircle,
  RefreshCw,
  FileText,
  User,
  MapPin,
  Phone,
} from 'lucide-react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import {
  adminListDocuments,
  adminApproveDocument,
  adminRejectDocument,
  getDocumentFileUrl,
} from '../../services/verificationService'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

// ─── Status badge helper ──────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const map = {
    pending: 'bg-amber-100 text-amber-800 border-amber-200',
    approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    rejected: 'bg-rose-100 text-rose-800 border-rose-200',
  }
  const icons = {
    pending: <Clock size={13} className="shrink-0" />,
    approved: <CheckCircle2 size={13} className="shrink-0" />,
    rejected: <XCircle size={13} className="shrink-0" />,
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${map[status] || 'bg-slate-100 text-slate-600 border-slate-200'}`}
    >
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

// ─── Reject Modal ─────────────────────────────────────────────────────────────
function RejectModal({ doc, onConfirm, onCancel, submitting, t }) {
  const [reason, setReason] = useState('')
  const [localError, setLocalError] = useState('')

  const handleSubmit = () => {
    const trimmed = reason.trim()
    if (!trimmed) {
      setLocalError(t('rejectionReasonRequired'))
      return
    }
    setLocalError('')
    onConfirm(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <XCircle size={20} className="text-rose-600" />
          {t('rejectVerificationTitle')}
        </h2>
        <p className="text-sm text-slate-600">
          {t('farmer')}: <strong>{doc.farmer?.name}</strong> ({doc.farmer?.mobile})
        </p>
        <p className="text-sm text-slate-600">
          {t('docTypeFarmerId', 'Document')}: <strong>{doc.originalFileName}</strong>
        </p>

        <div className="space-y-1.5">
          <label className="block text-sm font-bold text-slate-800">
            {t('rejectionReason')} <span className="text-rose-600">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value)
              if (localError) setLocalError('')
            }}
            placeholder={t('rejectionPlaceholder')}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 resize-none focus:outline-none focus:ring-2 focus:ring-rose-400 focus:bg-white"
          />
          {localError && (
            <p className="text-xs text-rose-700 font-semibold flex items-center gap-1">
              <AlertCircle size={13} /> {localError}
            </p>
          )}
        </div>

        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={onCancel}
            className="flex-1"
          >
            {t('cancel')}
          </Button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-2xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[40px]"
          >
            {submitting ? t('rejectingLabel') : t('confirmReject')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Approve Confirmation Modal ───────────────────────────────────────────────
function ApproveModal({ doc, onConfirm, onCancel, submitting, t }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
          <CheckCircle2 size={20} className="text-emerald-600" />
          {t('approveVerificationTitle')}
        </h2>
        <p className="text-sm text-slate-600">
          {t('farmer')}: <strong>{doc.farmer?.name}</strong> ({doc.farmer?.mobile})
        </p>
        <p className="text-sm text-slate-600">
          {t('willSetVerified')}
        </p>
        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={onCancel}
            className="flex-1"
          >
            {t('cancel')}
          </Button>
          <Button
            variant="primary"
            size="sm"
            disabled={submitting}
            onClick={onConfirm}
            className="flex-1"
          >
            {submitting ? t('approvingLabel') : t('confirmApprove')}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Document Card ────────────────────────────────────────────────────────────
function DocumentCard({ doc, onApprove, onReject, onView, t }) {
  const docTypeLabels = {
    farmer_id: t('docTypeFarmerId'),
    land_record: t('docTypeLandRecord'),
    kisan_credit_card: t('docTypeKisanCredit'),
    other: t('docTypeOther'),
  }

  return (
    <Card className="space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <FileText size={20} />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate text-sm">
              {doc.originalFileName}
            </p>
            <p className="text-xs text-slate-500">
              {docTypeLabels[doc.documentType] || doc.documentType} ·{' '}
              {(doc.fileSize / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
        <StatusBadge status={doc.status} />
      </div>

      {/* Farmer info */}
      {doc.farmer && (
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1 text-xs text-slate-700">
          <p className="flex items-center gap-1.5 font-semibold">
            <User size={13} className="text-slate-500" />
            {doc.farmer.name}
          </p>
          <p className="flex items-center gap-1.5">
            <Phone size={13} className="text-slate-500" />
            {doc.farmer.mobile}
          </p>
          {(doc.farmer.district || doc.farmer.state) && (
            <p className="flex items-center gap-1.5">
              <MapPin size={13} className="text-slate-500" />
              {[doc.farmer.village, doc.farmer.district, doc.farmer.state]
                .filter(Boolean)
                .join(', ')}
            </p>
          )}
        </div>
      )}

      {/* Dates */}
      <div className="text-xs text-slate-500 space-y-0.5">
        <p>
          {t('uploadedLabel')}:{' '}
          <span className="font-medium text-slate-700">
            {new Date(doc.uploadedAt).toLocaleString()}
          </span>
        </p>
        {doc.reviewedAt && (
          <p>
            {t('reviewedByLabel')}:{' '}
            <span className="font-medium text-slate-700">
              {new Date(doc.reviewedAt).toLocaleString()}
            </span>
            {doc.reviewedBy && ` ${t('byLabel')} ${doc.reviewedBy.name}`}
          </p>
        )}
        {doc.status === 'rejected' && doc.rejectionReason && (
          <p className="text-rose-700 font-medium mt-1">
            {t('reasonLabel')}: {doc.rejectionReason}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onView(doc)}
          className="text-xs"
        >
          <Eye size={14} />
          {t('viewDocumentBtn')}
        </Button>

        {doc.status === 'pending' && (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={() => onApprove(doc)}
              className="text-xs"
            >
              <CheckCircle2 size={14} />
              {t('approveBtn')}
            </Button>
            <button
              type="button"
              onClick={() => onReject(doc)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition-colors min-h-[40px]"
            >
              <XCircle size={14} />
              {t('rejectBtn')}
            </button>
          </>
        )}
      </div>
    </Card>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FarmerVerification() {
  const { token } = useAuth()
  const { t } = useLanguage()

  const TABS = [
    { key: 'pending',  labelKey: 'pending' },
    { key: 'approved', labelKey: 'approveBtn' },
    { key: 'rejected', labelKey: 'rejectBtn' },
  ]

  const [activeTab, setActiveTab] = useState('pending')
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [actionError, setActionError] = useState('')

  const [approveTarget, setApproveTarget] = useState(null)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [actionSubmitting, setActionSubmitting] = useState(false)

  // Fetch documents for the active tab
  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await adminListDocuments(activeTab)
      setDocuments(res.documents || [])
    } catch (err) {
      setErrorMsg(err.message || t('failedLoadDocs'))
      setDocuments([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, t])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  // View document — fetch with auth header, open blob URL in new tab
  const handleView = async (doc) => {
    setActionError('')
    try {
      const url = getDocumentFileUrl(doc.id)
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!response.ok) {
        setActionError(t('docLoadFailed'))
        return
      }
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const win = window.open(blobUrl, '_blank', 'noopener,noreferrer')
      if (!win) {
        setActionError(t('popupBlocked'))
      }
    } catch {
      setActionError(t('networkError'))
    }
  }

  const handleApproveConfirm = async () => {
    if (!approveTarget) return
    setActionSubmitting(true)
    setActionError('')
    try {
      await adminApproveDocument(approveTarget.id)
      setApproveTarget(null)
      fetchDocuments()
    } catch (err) {
      setActionError(err.message || t('failedApprove'))
      setApproveTarget(null)
    } finally {
      setActionSubmitting(false)
    }
  }

  const handleRejectConfirm = async (reason) => {
    if (!rejectTarget) return
    setActionSubmitting(true)
    setActionError('')
    try {
      await adminRejectDocument(rejectTarget.id, reason)
      setRejectTarget(null)
      fetchDocuments()
    } catch (err) {
      setActionError(err.message || t('failedReject'))
      setRejectTarget(null)
    } finally {
      setActionSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-4 sm:py-8 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">{t('farmerVerification')}</h1>
            <p className="text-xs text-slate-500">{t('reviewDocumentsSubtitle')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchDocuments}
          disabled={loading}
          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-emerald-700 transition-colors disabled:opacity-50"
          aria-label={t('refresh')}
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setActiveTab(tab.key)
              setActionError('')
            }}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === tab.key
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Action Error */}
      {actionError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-start gap-2.5">
          <AlertCircle size={17} className="text-rose-600 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-16 text-slate-400 text-sm">
          <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-emerald-500" />
          {t('loadingDocuments')}
        </div>
      )}

      {/* Fetch Error */}
      {!loading && errorMsg && (
        <Card className="text-center py-10 space-y-3">
          <AlertCircle size={32} className="mx-auto text-rose-400" />
          <p className="text-sm font-semibold text-rose-700">{errorMsg}</p>
          <Button variant="outline" size="sm" onClick={fetchDocuments}>
            {t('retry')}
          </Button>
        </Card>
      )}

      {/* Empty State */}
      {!loading && !errorMsg && documents.length === 0 && (
        <Card className="text-center py-14 space-y-3">
          <ShieldCheck size={36} className="mx-auto text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">
            {t('noResults')} ({activeTab})
          </p>
        </Card>
      )}

      {/* Document List */}
      {!loading && !errorMsg && documents.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {documents.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              t={t}
              onApprove={(d) => {
                setActionError('')
                setApproveTarget(d)
              }}
              onReject={(d) => {
                setActionError('')
                setRejectTarget(d)
              }}
              onView={handleView}
            />
          ))}
        </div>
      )}

      {/* Approve Modal */}
      {approveTarget && (
        <ApproveModal
          doc={approveTarget}
          submitting={actionSubmitting}
          onConfirm={handleApproveConfirm}
          onCancel={() => setApproveTarget(null)}
          t={t}
        />
      )}

      {/* Reject Modal */}
      {rejectTarget && (
        <RejectModal
          doc={rejectTarget}
          submitting={actionSubmitting}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectTarget(null)}
          t={t}
        />
      )}
    </div>
  )
}
