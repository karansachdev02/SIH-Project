import { request } from './api'

/**
 * weatherService.js (frontend)
 *
 * Calls the Smart Mandi backend weather endpoints.
 *
 * Architecture:
 *   React -> /api/weather/* (own Express backend)
 *            -> Open-Meteo (server-side only, no API key needed)
 *
 * NEVER call Open-Meteo directly from this file.
 * Open-Meteo is free and requires no API key, but all calls must
 * stay server-side to keep the architecture clean and consistent.
 */

/**
 * Get current weather for a coordinate.
 * @param {number} latitude
 * @param {number} longitude
 */
export const getCurrentWeather = (latitude, longitude) => {
  const params = new URLSearchParams({
    latitude:  String(latitude),
    longitude: String(longitude),
  })
  return request(`/weather/current?${params}`)
}

/**
 * Get historical daily weather for a coordinate and date range.
 * @param {object} filters
 * @param {number} filters.latitude
 * @param {number} filters.longitude
 * @param {string} [filters.from]        YYYY-MM-DD
 * @param {string} [filters.to]          YYYY-MM-DD
 * @param {number} [filters.limit]
 * @param {boolean} [filters.refresh]    if true, re-fetch from Open-Meteo
 * @param {string} [filters.locationName]
 * @param {string} [filters.state]
 * @param {string} [filters.district]
 */
export const getWeatherHistory = (filters = {}) => {
  const params = new URLSearchParams()
  params.set('latitude',  String(filters.latitude))
  params.set('longitude', String(filters.longitude))
  if (filters.from)         params.set('from',         filters.from)
  if (filters.to)           params.set('to',           filters.to)
  if (filters.limit)        params.set('limit',        String(filters.limit))
  if (filters.refresh)      params.set('refresh',      '1')
  if (filters.locationName) params.set('locationName', filters.locationName)
  if (filters.state)        params.set('state',        filters.state)
  if (filters.district)     params.set('district',     filters.district)
  return request(`/weather/history?${params}`)
}

/**
 * Get weather statistics for a coordinate and date range.
 * Returns aggregated values: avg temp, total rainfall, rainy days, etc.
 * Useful as input features for future AI price prediction.
 * @param {object} filters
 * @param {number} filters.latitude
 * @param {number} filters.longitude
 * @param {string} [filters.from]
 * @param {string} [filters.to]
 */
export const getWeatherStats = (filters = {}) => {
  const params = new URLSearchParams()
  params.set('latitude',  String(filters.latitude))
  params.set('longitude', String(filters.longitude))
  if (filters.from) params.set('from', filters.from)
  if (filters.to)   params.set('to',   filters.to)
  return request(`/weather/stats?${params}`)
}

export default { getCurrentWeather, getWeatherHistory, getWeatherStats }
