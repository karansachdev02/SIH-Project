import { request } from './api'

/**
 * Browse available crops on the marketplace.
 * Public endpoint — no authentication required, but token is attached if present.
 *
 * @param {object} [filters]
 * @param {string} [filters.cropName]
 * @param {string} [filters.cropType]
 * @param {string} [filters.state]
 * @param {string} [filters.district]
 * @param {string} [filters.location]
 * @param {number} [filters.minPrice]
 * @param {number} [filters.maxPrice]
 * @param {string} [filters.search]   free-text across name/type/location
 * @param {number} [filters.limit]    1–100
 * @returns {Promise<{ success: boolean, count: number, crops: object[] }>}
 */
export function getMarketplaceCrops(filters = {}) {
  const params = new URLSearchParams()
  if (filters.cropName)  params.set('cropName',  filters.cropName)
  if (filters.cropType)  params.set('cropType',  filters.cropType)
  if (filters.state)     params.set('state',     filters.state)
  if (filters.district)  params.set('district',  filters.district)
  if (filters.location)  params.set('location',  filters.location)
  if (filters.search)    params.set('search',    filters.search)
  if (filters.minPrice !== undefined && filters.minPrice !== '') params.set('minPrice', String(filters.minPrice))
  if (filters.maxPrice !== undefined && filters.maxPrice !== '') params.set('maxPrice', String(filters.maxPrice))
  if (filters.limit)     params.set('limit',     String(filters.limit))

  const qs = params.toString()
  return request(`/marketplace/crops${qs ? `?${qs}` : ''}`)
}

/**
 * Fetch a single available crop by ID.
 *
 * @param {string} id  MongoDB ObjectId string
 * @returns {Promise<{ success: boolean, crop: object }>}
 */
export function getMarketplaceCropById(id) {
  return request(`/marketplace/crops/${encodeURIComponent(id)}`)
}

export default { getMarketplaceCrops, getMarketplaceCropById }
