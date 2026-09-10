import { request } from './api'

/**
 * Predict price for a commodity.
 * Requires authentication (JWT token attached automatically).
 *
 * @param {object} opts
 * @param {string} opts.commodity  - commodity name, e.g. 'Wheat'
 * @param {string} [opts.state]    - state name for localised prediction
 * @param {string} [opts.district]
 * @param {number} [opts.latitude]
 * @param {number} [opts.longitude]
 * @param {number} [opts.horizon]  - days ahead: 1 | 7 | 14 | 30 (default 7)
 * @param {number} [opts.lookback] - history window in days (default 90)
 * @returns {Promise<object>}
 */
export function getPricePrediction({
  commodity,
  state = '',
  district = '',
  latitude,
  longitude,
  horizon = 7,
  lookback = 90,
} = {}) {
  const params = new URLSearchParams()
  if (commodity) params.set('commodity', commodity)
  if (state)     params.set('state',     state)
  if (district)  params.set('district',  district)
  if (latitude  !== undefined) params.set('latitude',  String(latitude))
  if (longitude !== undefined) params.set('longitude', String(longitude))
  params.set('horizon',  String(horizon))
  params.set('lookback', String(lookback))

  return request(`/prediction/price?${params.toString()}`)
}

/**
 * Fetch raw feature vectors (joined mandi price + weather data).
 * Useful for advanced users to inspect the underlying data.
 *
 * @param {object} opts
 * @param {string} opts.commodity
 * @param {string} [opts.state]
 * @param {string} [opts.district]
 * @param {string} [opts.from]  YYYY-MM-DD
 * @param {string} [opts.to]    YYYY-MM-DD
 * @param {number} [opts.latitude]
 * @param {number} [opts.longitude]
 * @param {number} [opts.limit]
 * @returns {Promise<object>}
 */
export function getFeatureVectors({
  commodity,
  state = '',
  district = '',
  from,
  to,
  latitude,
  longitude,
  limit = 90,
} = {}) {
  const params = new URLSearchParams()
  if (commodity)  params.set('commodity', commodity)
  if (state)      params.set('state',     state)
  if (district)   params.set('district',  district)
  if (from)       params.set('from',      from)
  if (to)         params.set('to',        to)
  if (latitude  !== undefined) params.set('latitude',  String(latitude))
  if (longitude !== undefined) params.set('longitude', String(longitude))
  params.set('limit', String(limit))

  return request(`/prediction/features?${params.toString()}`)
}

export default { getPricePrediction, getFeatureVectors }
