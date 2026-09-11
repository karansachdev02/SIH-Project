import { useState, useCallback, useEffect } from 'react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import SpeakButton from '../../components/common/SpeakButton'
import { useLanguage } from '../../context/LanguageContext'
import { getPricePrediction } from '../../services/predictionService'
import {
  Bot,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  ArrowLeft,
  BarChart3,
  Info,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const COMMON_CROPS = [
  'Wheat', 'Paddy', 'Maize', 'Onion', 'Potato', 'Tomato',
  'Soyabean', 'Cotton', 'Mustard', 'Gram', 'Bajra', 'Jowar',
]

// ── Sub-components ────────────────────────────────────────────────────────────

function TrendIcon({ direction, size = 20 }) {
  if (direction === 'rising')  return <TrendingUp  size={size} className="text-emerald-600" />
  if (direction === 'falling') return <TrendingDown size={size} className="text-rose-600" />
  return <Minus size={size} className="text-slate-400" />
}

function TrendLabel({ direction, t }) {
  if (direction === 'rising')  return <span className="text-emerald-700 font-semibold">{t('rising', 'Rising')}</span>
  if (direction === 'falling') return <span className="text-rose-700    font-semibold">{t('falling', 'Falling')}</span>
  return <span className="text-slate-500 font-semibold">{t('stable', 'Stable')}</span>
}

function EngineTag({ engine }) {
  if (typeof engine === 'string' && engine.startsWith('gemini-')) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200 text-xs font-semibold">
        <Bot size={11} />
        Gemini AI
      </span>
    )
  }
  if (engine === 'statistical') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold">
        <BarChart3 size={11} />
        Statistical
      </span>
    )
  }
  return null
}

function StatRow({ label, value }) {
  if (value === null || value === undefined) return null
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className="text-xs font-semibold text-slate-800">{value}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function PricePrediction({ onNavigate }) {
  const { locale, t } = useLanguage()

  // ── Horizon options — derived inside render so they are always translated ──
  const HORIZON_OPTIONS = [
    { value: 1,  label: `1 ${t('date', 'Day')} / 1 Day` },
    { value: 7,  label: `7 ${t('date', 'Days')} / 1 Week` },
    { value: 14, label: `14 ${t('date', 'Days')} / 2 Weeks` },
    { value: 30, label: `30 ${t('date', 'Days')} / 1 Month` },
  ]

  // ── Confidence config — translated ────────────────────────────────────────
  const CONFIDENCE_CONFIG = {
    high:   { label: t('confidenceHigh', 'High'),   color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    medium: { label: t('confidenceMedium', 'Medium'), color: 'bg-amber-100   text-amber-800   border-amber-200' },
    low:    { label: t('confidenceLow', 'Low'),       color: 'bg-rose-100    text-rose-800    border-rose-200' },
  }

  // ── Form state ────────────────────────────────────────────────────────────
  const [commodity, setCommodity] = useState('Wheat')
  const [customCrop, setCustomCrop] = useState('')
  const [useCustom, setUseCustom]   = useState(false)
  const [state, setState]           = useState('')
  const [district, setDistrict]     = useState('')
  const [horizon, setHorizon]       = useState(7)
  const [lookback, setLookback]     = useState(90)

  // ── Result state ──────────────────────────────────────────────────────────
  const [result, setResult]     = useState(null)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState(null)

  // ── Summary expanded ──────────────────────────────────────────────────────
  const [summaryOpen, setSummaryOpen] = useState(false)

  // ── Effective commodity name ───────────────────────────────────────────────
  const effectiveCommodity = useCustom ? customCrop.trim() : commodity

  // ── Fetch prediction ────────────────────────────────────────────────────────
  const fetchPrediction = useCallback(async (opts) => {
    if (!opts.commodity) return
    setLoading(true)
    setError(null)
    try {
      const data = await getPricePrediction(opts)
      setResult(data)
    } catch (err) {
      setError(err?.message || t('predicting', 'Prediction service unavailable.'))
      setResult(null)
    } finally {
      setLoading(false)
    }
  }, [t])

  // Auto-fetch on mount with defaults
  useEffect(() => {
    fetchPrediction({
      commodity: 'Wheat',
      horizon:  7,
      lookback: 90,
    })
  }, [fetchPrediction])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!effectiveCommodity) return
    fetchPrediction({
      commodity: effectiveCommodity,
      state:     state.trim(),
      district:  district.trim(),
      horizon,
      lookback,
    })
  }

  const handleRefresh = () => {
    if (!effectiveCommodity) return
    fetchPrediction({
      commodity: effectiveCommodity,
      state:     state.trim(),
      district:  district.trim(),
      horizon,
      lookback,
    })
  }

  // ── Derived display ─────────────────────────────────────────────────────────
  const conf   = result?.confidence ? CONFIDENCE_CONFIG[result.confidence] ?? CONFIDENCE_CONFIG.low : null
  const trend  = result?.trendDirection ?? 'stable'
  const hasPrediction = result?.predicted !== null && result?.predicted !== undefined

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={t('goBack', 'Go back')}
          onClick={() => onNavigate?.('home')}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Bot size={22} className="text-violet-600" />
            {t('predictionTitle', 'AI Price Prediction')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{t('predictionSubtitle', 'Price Prediction — Powered by market history & AI')}</p>
        </div>
      </div>

      {/* ── SEARCH FORM ─────────────────────────────────────────────────── */}
      <Card className="p-5">
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Crop selector */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              {t('cropLabel', 'Crop')} <span className="text-rose-500">*</span>
            </label>

            {/* Quick-pick buttons */}
            {!useCustom && (
              <div className="flex flex-wrap gap-2 mb-2">
                {COMMON_CROPS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCommodity(c)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                      commodity === c
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:text-emerald-700'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}

            {/* Custom crop toggle */}
            <button
              type="button"
              onClick={() => { setUseCustom((v) => !v); setCustomCrop('') }}
              className="text-xs text-emerald-600 hover:underline focus:outline-none"
            >
              {useCustom ? t('backToQuickPick', '← Quick pick crop list') : t('customCrop', '+ Enter crop manually')}
            </button>

            {useCustom && (
              <input
                type="text"
                value={customCrop}
                onChange={(e) => setCustomCrop(e.target.value)}
                placeholder="e.g. Soyabean, Bajra, Turmeric..."
                className="mt-2 w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            )}
          </div>

          {/* Location (optional) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{t('state', 'State')}</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Madhya Pradesh"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">{t('district', 'District')}</label>
              <input
                type="text"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                placeholder="e.g. Indore"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />
            </div>
          </div>

          {/* Horizon + Lookback */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {t('predictAhead', 'Predict Ahead')}
              </label>
              <select
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                {HORIZON_OPTIONS.map((h) => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                {t('historyWindow', 'History Window')}
              </label>
              <select
                value={lookback}
                onChange={(e) => setLookback(Number(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              >
                <option value={30}>30 Days</option>
                <option value={60}>60 Days</option>
                <option value={90}>90 Days</option>
                <option value={180}>180 Days / 6 Months</option>
                <option value={365}>365 Days / 1 Year</option>
              </select>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={loading || !effectiveCommodity}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>{t('predicting', 'Analysing…')}</span>
              </>
            ) : (
              <>
                <Bot size={16} />
                <span>{t('predictPrice', 'Predict Price')}</span>
              </>
            )}
          </Button>
        </form>
      </Card>

      {/* ── ERROR ───────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-medium flex items-center gap-2">
          <Info size={16} className="text-rose-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── NO DATA ─────────────────────────────────────────────────────── */}
      {!loading && !error && result && !hasPrediction && (
        <Card className="p-6 text-center space-y-3">
          <BarChart3 size={36} className="mx-auto text-slate-300" />
          <p className="font-bold text-slate-700">{t('noHistoricalData', 'No historical data found')}</p>
          <p className="text-sm text-slate-500">
            {result.reasoning || 'Please fetch market history first via the Prices page, then retry.'}
          </p>
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('prices')}>
            <BarChart3 size={14} />
            <span>{t('goToPricesPage', 'Open Prices page')}</span>
          </Button>
        </Card>
      )}

      {/* ── PREDICTION RESULT ───────────────────────────────────────────── */}
      {!loading && hasPrediction && (
        <div className="space-y-4">

          {/* Main prediction card */}
          <Card className="p-0 overflow-hidden">
            <div className="bg-gradient-to-br from-violet-900 via-violet-800 to-indigo-900 p-6 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-violet-300 text-sm font-medium uppercase tracking-wide">
                    {result.commodity} — {horizon} {t('date', 'days')} / {horizon} day{horizon !== 1 ? 's' : ''} ahead
                  </p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl sm:text-5xl font-extrabold tracking-tight">
                      ₹{result.predicted.toLocaleString('en-IN')}
                    </span>
                    <span className="text-violet-300 text-base font-medium">/ quintal</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <TrendIcon direction={trend} size={18} />
                      <TrendLabel direction={trend} t={t} />
                    </div>
                    {conf && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${conf.color}`}>
                        {t('confidence', 'Confidence')}: {conf.label}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                   <EngineTag engine={result.engine} />
                   <div className="flex items-center gap-1">
                     <SpeakButton
                       text={`${result.commodity} predicted price is ${result.predicted} rupees per quintal. Trend is ${trend}. Confidence is ${result.confidence}.${result.reasoning ? ' ' + result.reasoning : ''}`}
                       language={locale}
                       label="Read prediction"
                       className="bg-white/10 hover:bg-white/20 text-white"
                     />
                     <button
                       type="button"
                       aria-label={t('refresh', 'Refresh prediction')}
                       onClick={handleRefresh}
                       className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                       disabled={loading}
                     >
                       <RefreshCw size={16} />
                     </button>
                   </div>
                 </div>
              </div>

              {/* Gemini reasoning */}
              {result.reasoning && (
                <p className="mt-4 text-sm text-violet-200 bg-white/10 rounded-xl px-4 py-3 leading-relaxed">
                  &ldquo;{result.reasoning}&rdquo;
                </p>
              )}
            </div>

            {/* Disclaimer */}
            <div className="px-5 py-3 bg-amber-50 border-t border-amber-100 flex items-start gap-2">
              <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 leading-relaxed">{result.disclaimer}</p>
            </div>
          </Card>

          {/* Summary stats */}
          {result.summary && (
            <Card className="p-0 overflow-hidden">
              <button
                type="button"
                onClick={() => setSummaryOpen((v) => !v)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500"
              >
                <span className="font-bold text-slate-800 flex items-center gap-2">
                  <BarChart3 size={16} className="text-slate-500" />
                  {t('dataSummary', 'Data Summary')} ({result.dataPoints} records)
                </span>
                {summaryOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {summaryOpen && (
                <div className="px-5 pb-4 border-t border-slate-100">
                  <div className="mt-3 space-y-0">
                    <StatRow label="Commodity"             value={result.summary.commodity} />
                    <StatRow label="Data period"           value={result.summary.from ? `${result.summary.from} → ${result.summary.to}` : null} />
                    <StatRow label="Days of data"          value={result.summary.days} />
                    <StatRow label="Avg modal price"       value={result.summary.avgModalPrice ? `₹${result.summary.avgModalPrice.toLocaleString('en-IN')}` : null} />
                    <StatRow label="Price range"           value={result.summary.minPrice && result.summary.maxPrice ? `₹${result.summary.minPrice.toLocaleString('en-IN')} – ₹${result.summary.maxPrice.toLocaleString('en-IN')}` : null} />
                    <StatRow label="Latest price"          value={result.summary.latestPrice ? `₹${result.summary.latestPrice.toLocaleString('en-IN')}` : null} />
                    <StatRow label="30-day trend"          value={result.summary.priceTrend30d !== null ? `${result.summary.priceTrend30d > 0 ? '+' : ''}${result.summary.priceTrend30d}%` : null} />
                    <StatRow label="7-day moving avg"      value={result.summary.latestMA7  ? `₹${result.summary.latestMA7.toLocaleString('en-IN')}` : null} />
                    <StatRow label="30-day moving avg"     value={result.summary.latestMA30 ? `₹${result.summary.latestMA30.toLocaleString('en-IN')}` : null} />
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Info box: data tips */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-start gap-3">
              <Info size={18} className="text-blue-600 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-blue-900">
                  {t('betterPrediction', 'For better predictions:')}
                </p>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside leading-relaxed">
                  <li>{t('predictionTip1', 'Fetch fresh mandi data from the Prices page')}</li>
                  <li>{t('predictionTip2', 'Adding state & district gives local prices')}</li>
                  <li>{t('predictionTip3', 'More history = more accurate prediction')}</li>
                  <li>{t('predictionTip4', 'Add GEMINI_API_KEY on server for Gemini AI')}</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <Card className="p-8 flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin" />
          </div>
          <p className="text-slate-600 font-medium text-center">
            {t('predicting', 'Analysing…')} {effectiveCommodity}…
          </p>
          <p className="text-xs text-slate-400">
            Fetching market history &amp; computing prediction
          </p>
        </Card>
      )}
    </div>
  )
}
