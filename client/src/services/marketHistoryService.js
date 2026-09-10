import { request } from './api'

/**
 * marketHistoryService.js
 *
 * Frontend service for fetching historical government mandi price records.
 *
 * Architecture:
 *   React -> GET /api/market/history (own Express backend)
 *            -> MongoDB (persisted government data)
 *            -> data.gov.in (only when ?refresh=1, server-side only)
 *
 * Never call data.gov.in directly from this file.
 * DATA_GOV_API_KEY lives only in server/.env.
 */

/**
 * Fetch historical government mandi price records.
 *
 * @param {object} [filters]
 * @param {string} [filters.commodity]   - crop/commodity name
 * @param {string} [filters.state]       - Indian state name
 * @param {string} [filters.district]    - district name
 * @param {string} [filters.market]      - specific mandi/market name
 * @param {string} [filters.from]        - ISO date string, e.g. '2025-01-01'
 * @param {string} [filters.to]          - ISO date string, e.g. '2025-12-31'
 * @param {number} [filters.limit]       - max records to return
 * @param {boolean} [filters.refresh]    - if true, pulls fresh data from gov API first
 *
 * @returns {Promise<{
 *   success: boolean,
 *   source: string,
 *   dataType: string,
 *   note: string,
 *   count: number,
 *   prices: Array<{
 *     commodity: string,
 *     variety: string,
 *     grade: string,
 *     market: string,
 *     district: string,
 *     state: string,
 *     arrivalDate: string | null,
 *     minPrice: number,
 *     maxPrice: number,
 *     modalPrice: number,
 *     fetchedAt: string | null,
 *   }>,
 *   message?: string,
 *   refreshed?: object,
 * }>}
 */
export const getMarketHistory = (filters = {}) => {
  const params = new URLSearchParams()

  if (filters.commodity) params.set('commodity', filters.commodity)
  if (filters.state)     params.set('state',     filters.state)
  if (filters.district)  params.set('district',  filters.district)
  if (filters.market)    params.set('market',    filters.market)
  if (filters.from)      params.set('from',      filters.from)
  if (filters.to)        params.set('to',        filters.to)
  if (filters.limit)     params.set('limit',     String(filters.limit))
  if (filters.refresh)   params.set('refresh',   '1')

  const qs = params.toString()
  return request(`/market/history${qs ? `?${qs}` : ''}`)
}

export default { getMarketHistory }
