import { useState, useEffect, useCallback } from 'react'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import { useLanguage } from '../../context/LanguageContext'
import {
  getCurrentWeather,
  getWeatherHistory,
  getWeatherStats,
} from '../../services/weatherService'
import {
  Cloud,
  Home,
  Loader2,
  AlertCircle,
  RefreshCw,
  Search,
  Thermometer,
  Droplets,
  Wind,
  CalendarDays,
  Info,
  BarChart3,
} from 'lucide-react'

// ── WMO weather code descriptions ────────────────────────────────────────────
// Subset of WMO codes relevant for farm/agriculture display
function weatherCodeLabel(code) {
  const n = Number(code)
  if (n === 0)              return 'Clear sky'
  if (n <= 3)               return 'Partly cloudy'
  if (n <= 9)               return 'Overcast'
  if (n <= 19)              return 'Fog / Mist'
  if (n <= 29)              return 'Drizzle'
  if (n <= 39)              return 'Drizzle'
  if (n <= 49)              return 'Fog'
  if (n <= 59)              return 'Drizzle'
  if (n <= 69)              return 'Rain'
  if (n <= 79)              return 'Snow / Sleet'
  if (n <= 84)              return 'Rain showers'
  if (n <= 94)              return 'Thunderstorm'
  if (n <= 99)              return 'Thunderstorm with hail'
  return 'Unknown'
}

// ── Metric display helper ─────────────────────────────────────────────────────
function Metric({ label, value, unit, icon: Icon, colorClass = 'text-slate-700' }) {
  return (
    <div className="flex items-center gap-2.5 py-2.5 border-b border-slate-100 last:border-0">
      {Icon && (
        <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
          <Icon size={16} className="text-slate-500" aria-hidden="true" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className={`text-sm font-bold ${colorClass}`}>
          {value != null ? `${value}${unit ? ' ' + unit : ''}` : '–'}
        </p>
      </div>
    </div>
  )
}

// ── History table row ─────────────────────────────────────────────────────────
function WeatherRow({ rec }) {
  return (
    <tr className="border-t border-slate-100 hover:bg-slate-50 transition-colors text-xs">
      <td className="px-3 py-2 whitespace-nowrap text-slate-600">{rec.date ?? '–'}</td>
      <td className="px-3 py-2 text-right text-red-600 font-semibold">
        {rec.temperatureMax != null ? `${rec.temperatureMax}°C` : '–'}
      </td>
      <td className="px-3 py-2 text-right text-blue-600 font-semibold">
        {rec.temperatureMin != null ? `${rec.temperatureMin}°C` : '–'}
      </td>
      <td className="px-3 py-2 text-right text-slate-600">
        {rec.precipitation != null ? `${rec.precipitation} mm` : '–'}
      </td>
      <td className="px-3 py-2 text-right text-slate-500">
        {rec.humidityMean != null ? `${rec.humidityMean}%` : '–'}
      </td>
      <td className="px-3 py-2 text-right text-slate-500">
        {rec.windSpeedMean != null ? `${rec.windSpeedMean} km/h` : '–'}
      </td>
    </tr>
  )
}

// ── Main Weather page ─────────────────────────────────────────────────────────

/**
 * Farmer Weather Page.
 * Shows current weather, historical records, and weather statistics.
 *
 * Uses Open-Meteo (free, no API key) via backend proxy.
 * All calls go to /api/weather/* — never directly to Open-Meteo from React.
 *
 * Props:
 *   onNavigate — (viewKey: string) => void
 */
export default function Weather({ onNavigate }) {
  const { t } = useLanguage()
  // ── Location inputs ─────────────────────────────────────────────────────────
  // Default: Indore, Madhya Pradesh — a major agricultural mandi location
  const [latInput, setLatInput] = useState('22.7196')
  const [lonInput, setLonInput] = useState('75.8577')
  const [stagedLat, setStagedLat] = useState('22.7196')
  const [stagedLon, setStagedLon] = useState('75.8577')

  // ── Current weather ─────────────────────────────────────────────────────────
  const [currentWeather, setCurrentWeather] = useState(null)
  const [currentLoading, setCurrentLoading] = useState(false)
  const [currentError, setCurrentError]     = useState(null)

  // ── History ─────────────────────────────────────────────────────────────────
  const [histFrom, setHistFrom]     = useState('')
  const [histTo, setHistTo]         = useState('')
  const [histRecords, setHistRecords] = useState([])
  const [histLoading, setHistLoading] = useState(false)
  const [histError, setHistError]   = useState(null)
  const [histMeta, setHistMeta]     = useState(null)

  // ── Stats ────────────────────────────────────────────────────────────────────
  const [stats, setStats]           = useState(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState(null)

  // ── Fetch current weather ───────────────────────────────────────────────────
  const fetchCurrent = useCallback(async (lat, lon) => {
    setCurrentLoading(true)
    setCurrentError(null)
    try {
      const data = await getCurrentWeather(lat, lon)
      setCurrentWeather(data.weather)
    } catch (err) {
      setCurrentError(err?.message || 'Failed to load current weather.')
      setCurrentWeather(null)
    } finally {
      setCurrentLoading(false)
    }
  }, [])

  // ── Fetch history ───────────────────────────────────────────────────────────
  const fetchHistory = useCallback(async (lat, lon, from, to, refresh = false) => {
    setHistLoading(true)
    setHistError(null)
    try {
      const data = await getWeatherHistory({ latitude: lat, longitude: lon, from, to, limit: 90, refresh })
      setHistRecords(data.weather || [])
      setHistMeta({ count: data.count, note: data.note, message: data.message, fetched: data.fetched })
    } catch (err) {
      setHistError(err?.message || 'Failed to load historical weather.')
      setHistRecords([])
    } finally {
      setHistLoading(false)
    }
  }, [])

  // ── Fetch stats ─────────────────────────────────────────────────────────────
  const fetchStats = useCallback(async (lat, lon, from, to) => {
    setStatsLoading(true)
    setStatsError(null)
    try {
      const data = await getWeatherStats({ latitude: lat, longitude: lon, from, to })
      setStats(data.stats)
    } catch (err) {
      setStatsError(err?.message || 'Failed to load weather stats.')
      setStats(null)
    } finally {
      setStatsLoading(false)
    }
  }, [])

  // Initial load on mount
  useEffect(() => {
    fetchCurrent(latInput, lonInput)
  }, [fetchCurrent, latInput, lonInput])

  // ── Handle location search ──────────────────────────────────────────────────
  const handleLocationSearch = (e) => {
    e.preventDefault()
    const la = parseFloat(stagedLat)
    const lo = parseFloat(stagedLon)
    if (isNaN(la) || la < -90  || la > 90)  return
    if (isNaN(lo) || lo < -180 || lo > 180) return
    setLatInput(stagedLat)
    setLonInput(stagedLon)
    fetchCurrent(la, lo)
  }

  // ── Handle history search ───────────────────────────────────────────────────
  const handleHistSearch = (e) => {
    e.preventDefault()
    fetchHistory(parseFloat(latInput), parseFloat(lonInput), histFrom, histTo)
  }

  const handleHistRefresh = () => {
    if (!histFrom || !histTo) return
    fetchHistory(parseFloat(latInput), parseFloat(lonInput), histFrom, histTo, true)
  }

  const handleStatsSearch = (e) => {
    e.preventDefault()
    fetchStats(parseFloat(latInput), parseFloat(lonInput), histFrom, histTo)
  }

  const cw = currentWeather

  return (
    <div className="space-y-5 max-w-2xl mx-auto">

      {/* ── PAGE HEADER ──────────────────────────────────────────────── */}
      <section aria-labelledby="weather-heading">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-sky-100 text-sky-700 flex items-center justify-center shadow-xs shrink-0">
              <Cloud size={24} aria-hidden="true" />
            </div>
            <div>
              <h1 id="weather-heading" className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {t('weatherTitle', 'Weather')}
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                {t('weatherSubtitle', 'Agricultural Weather Intelligence')}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('home')} aria-label={t('goHome', 'Home')}>
            <Home size={16} />
            <span className="hidden sm:inline">{t('goHome', 'Home')}</span>
          </Button>
        </div>
      </section>

      {/* ── SOURCE NOTE ──────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-800 text-xs">
        <Info size={14} className="shrink-0 mt-0.5 text-sky-500" aria-hidden="true" />
        <p>
          <strong>Source:</strong> Open-Meteo (open-meteo.com) — free, no API key required.
          ERA5 reanalysis model data. Not exact ground-truth station readings.
          Useful for agricultural planning and AI crop-price prediction features.
        </p>
      </div>

      {/* ── LOCATION INPUT ───────────────────────────────────────────── */}
      <form onSubmit={handleLocationSearch} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {t('locationInput', 'Location — Latitude & Longitude')}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="lat-input" className="block text-xs font-semibold text-slate-600 mb-1">
              {t('latitude', 'Latitude')}
            </label>
            <input
              id="lat-input"
              type="number"
              step="any"
              min="-90"
              max="90"
              value={stagedLat}
              onChange={(e) => setStagedLat(e.target.value)}
              placeholder="e.g. 22.7196"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="lon-input" className="block text-xs font-semibold text-slate-600 mb-1">
              Longitude
            </label>
            <input
              id="lon-input"
              type="number"
              step="any"
              min="-180"
              max="180"
              value={stagedLon}
              onChange={(e) => setStagedLon(e.target.value)}
              placeholder="e.g. 75.8577"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-colors"
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-400">
          Example — Indore, MP: 22.7196, 75.8577 &nbsp;|&nbsp; Delhi: 28.6139, 77.2090 &nbsp;|&nbsp; Mumbai: 19.0760, 72.8777
        </p>
        <Button type="submit" variant="primary" size="sm" disabled={currentLoading}>
          <Search size={15} aria-hidden="true" />
          <span>Load Weather</span>
        </Button>
      </form>

      {/* ── CURRENT WEATHER ──────────────────────────────────────────── */}
      <section aria-labelledby="current-weather-heading">
        <div className="flex items-center gap-2 mb-3">
          <Thermometer size={18} className="text-orange-500" aria-hidden="true" />
          <h2 id="current-weather-heading" className="text-base font-bold text-slate-900">
            Current Weather
          </h2>
          <span className="text-[11px] text-slate-400 ml-1">({latInput}, {lonInput})</span>
        </div>

        {currentLoading && (
          <div className="flex items-center justify-center py-8 gap-3 text-slate-500">
            <Loader2 size={24} className="animate-spin text-sky-500" aria-hidden="true" />
            <span className="text-sm">Loading weather…</span>
          </div>
        )}

        {!currentLoading && currentError && (
          <Card className="p-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle size={28} className="text-rose-400" aria-hidden="true" />
              <p className="text-sm text-slate-600">{currentError}</p>
              <Button variant="outline" size="sm" onClick={() => fetchCurrent(latInput, lonInput)}>
                <RefreshCw size={14} /><span>Retry</span>
              </Button>
            </div>
          </Card>
        )}

        {!currentLoading && !currentError && cw && (
          <Card className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
              <Metric
                label="Date"
                value={cw.date}
                icon={CalendarDays}
              />
              <Metric
                label="Condition"
                value={weatherCodeLabel(cw.weatherCode)}
                icon={Cloud}
                colorClass="text-sky-700"
              />
              <Metric
                label="Temperature (Mean)"
                value={cw.temperature}
                unit="°C"
                icon={Thermometer}
                colorClass="text-orange-600"
              />
              <Metric
                label="Max / Min"
                value={cw.temperatureMax != null && cw.temperatureMin != null
                  ? `${cw.temperatureMax}°C / ${cw.temperatureMin}°C`
                  : null}
                icon={Thermometer}
              />
              <Metric
                label="Humidity"
                value={cw.humidity}
                unit="%"
                icon={Droplets}
                colorClass="text-blue-600"
              />
              <Metric
                label="Precipitation"
                value={cw.precipitation}
                unit="mm"
                icon={Droplets}
              />
              <Metric
                label="Wind Speed"
                value={cw.windSpeed}
                unit="km/h"
                icon={Wind}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-3 text-right">
              Source: Open-Meteo forecast · Not real-time station data
            </p>
          </Card>
        )}
      </section>

      {/* ── HISTORICAL WEATHER ───────────────────────────────────────── */}
      <section aria-labelledby="hist-weather-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-blue-500" aria-hidden="true" />
          <h2 id="hist-weather-heading" className="text-base font-bold text-slate-900">
            Historical Weather
          </h2>
        </div>

        {/* Date range form */}
        <form onSubmit={handleHistSearch} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="hist-from" className="block text-xs font-semibold text-slate-600 mb-1">From</label>
              <input
                id="hist-from"
                type="date"
                value={histFrom}
                onChange={(e) => setHistFrom(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-colors"
              />
            </div>
            <div>
              <label htmlFor="hist-to" className="block text-xs font-semibold text-slate-600 mb-1">To</label>
              <input
                id="hist-to"
                type="date"
                value={histTo}
                onChange={(e) => setHistTo(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition-colors"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" variant="primary" size="sm" disabled={histLoading || !histFrom || !histTo}>
              <Search size={14} /><span>Search DB</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleHistRefresh}
              disabled={histLoading || !histFrom || !histTo}
              aria-label="Fetch from Open-Meteo and store"
            >
              <RefreshCw size={14} /><span>Fetch &amp; Store</span>
            </Button>
          </div>
          <p className="text-[11px] text-slate-400">
            "Search DB" queries stored records. "Fetch &amp; Store" pulls from Open-Meteo and saves to database.
          </p>
        </form>

        {histLoading && (
          <div className="flex items-center justify-center py-8 gap-3 text-slate-500">
            <Loader2 size={24} className="animate-spin text-sky-500" aria-hidden="true" />
            <span className="text-sm">Loading weather history…</span>
          </div>
        )}

        {!histLoading && histError && (
          <Card className="p-5 text-center">
            <AlertCircle size={24} className="mx-auto text-rose-400 mb-2" aria-hidden="true" />
            <p className="text-sm text-slate-600">{histError}</p>
          </Card>
        )}

        {!histLoading && !histError && histMeta && histRecords.length === 0 && (
          <Card className="p-6 text-center">
            <CalendarDays size={28} className="mx-auto text-slate-300 mb-2" aria-hidden="true" />
            <p className="font-bold text-slate-700 text-sm">No records found</p>
            <p className="text-xs text-slate-500 mt-1">
              {histMeta.message || 'Click "Fetch & Store" to download weather data from Open-Meteo.'}
            </p>
          </Card>
        )}

        {!histLoading && !histError && histRecords.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {histMeta?.fetched && (
              <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-100 text-[11px] text-emerald-700">
                Fetched {histMeta.fetched.count} records, stored {histMeta.fetched.stored} new records from Open-Meteo.
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[480px]" aria-label="Historical weather data">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-3 py-2.5">Date</th>
                    <th className="px-3 py-2.5 text-right">Max °C</th>
                    <th className="px-3 py-2.5 text-right">Min °C</th>
                    <th className="px-3 py-2.5 text-right">Rain (mm)</th>
                    <th className="px-3 py-2.5 text-right">Humidity</th>
                    <th className="px-3 py-2.5 text-right">Wind</th>
                  </tr>
                </thead>
                <tbody>
                  {histRecords.map((rec, i) => (
                    <WeatherRow key={`${rec.date}-${i}`} rec={rec} />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between">
              <p className="text-[11px] text-slate-400">
                {histRecords.length} records · Open-Meteo ERA5 · Not real-time
              </p>
              <Button variant="outline" size="sm" onClick={() => fetchHistory(parseFloat(latInput), parseFloat(lonInput), histFrom, histTo)} disabled={histLoading}>
                <RefreshCw size={13} />
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* ── WEATHER SUMMARY / STATS ──────────────────────────────────── */}
      <section aria-labelledby="stats-heading" className="space-y-3">
        <div className="flex items-center gap-2">
          <BarChart3 size={18} className="text-emerald-500" aria-hidden="true" />
          <h2 id="stats-heading" className="text-base font-bold text-slate-900">
            Weather Summary
          </h2>
        </div>

        <form onSubmit={handleStatsSearch} className="flex gap-2 items-end">
          <div className="flex-1">
            <p className="text-[11px] text-slate-500 mb-1">
              Uses same date range as Historical filter above
            </p>
          </div>
          <Button type="submit" variant="secondary" size="sm" disabled={statsLoading || !histFrom || !histTo}>
            <BarChart3 size={14} /><span>Compute Stats</span>
          </Button>
        </form>

        {statsLoading && (
          <div className="flex items-center justify-center py-6 gap-2 text-slate-500">
            <Loader2 size={20} className="animate-spin text-emerald-500" aria-hidden="true" />
            <span className="text-sm">Computing…</span>
          </div>
        )}

        {!statsLoading && statsError && (
          <Card className="p-4 text-center">
            <p className="text-sm text-rose-500">{statsError}</p>
          </Card>
        )}

        {!statsLoading && !statsError && stats && (
          <Card className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0">
              <Metric label="Days in range"          value={stats.count}              icon={CalendarDays} />
              <Metric label="Avg Temperature"        value={stats.avgTempMean}        unit="°C" icon={Thermometer} colorClass="text-orange-600" />
              <Metric label="Max Temperature (ever)" value={stats.maxTempEver}        unit="°C" icon={Thermometer} colorClass="text-red-500" />
              <Metric label="Min Temperature (ever)" value={stats.minTempEver}        unit="°C" icon={Thermometer} colorClass="text-blue-500" />
              <Metric label="Total Rainfall"         value={stats.totalRain}          unit="mm" icon={Droplets}    colorClass="text-blue-600" />
              <Metric label="Avg Daily Rainfall"     value={stats.avgPrecipitation}   unit="mm" icon={Droplets} />
              <Metric label="Rainy Days"             value={stats.rainyDays}          icon={Droplets} colorClass="text-sky-600" />
              <Metric label="Avg Humidity"           value={stats.avgHumidity}        unit="%" icon={Droplets} />
              <Metric label="Avg Wind Speed"         value={stats.avgWindSpeed}       unit="km/h" icon={Wind} />
            </div>
            <p className="text-[11px] text-slate-400 mt-3 text-right">
              Computed from stored Open-Meteo data
            </p>
          </Card>
        )}

        {!statsLoading && !statsError && stats === null && histFrom && histTo && (
          <Card className="p-5 text-center">
            <BarChart3 size={24} className="mx-auto text-slate-300 mb-2" aria-hidden="true" />
            <p className="text-sm text-slate-600">No stored data for these dates. Fetch history first.</p>
          </Card>
        )}
      </section>

    </div>
  )
}
