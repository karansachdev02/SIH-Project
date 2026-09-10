import { request } from './api'

/**
 * marketPriceService.js
 *
 * Frontend service for fetching mandi/market prices from the Smart Mandi backend.
 *
 * Architecture:
 *   React → GET /api/market/prices (own Express backend)
 *           → data.gov.in (server-side only, key never exposed to browser)
 *
 * Never call data.gov.in directly from this file.
 * The API key lives only in server/.env and is never sent to the browser.
 */

/**
 * Fetch commodity market prices via the Smart Mandi backend proxy.
 *
 * @param {object} [filters]
 * @param {string} [filters.commodity]  — crop/commodity name (Hindi or English)
 * @param {string} [filters.state]      — Indian state name
 * @param {string} [filters.district]   — district name
 * @param {string} [filters.market]     — specific mandi/market name
 * @param {number} [filters.limit]      — max records to return
 *
 * @returns {Promise<{
 *   success: boolean,
 *   source: 'data.gov.in' | 'fallback',
 *   count: number,
 *   prices: Array<{
 *     commodity: string,
 *     variety: string,
 *     market: string,
 *     district: string,
 *     state: string,
 *     modalPrice: number,
 *     minPrice: number,
 *     maxPrice: number,
 *     unit: string,
 *     date: string | null,
 *   }>,
 *   message?: string,
 * }>}
 */
export const getMarketPrices = (filters = {}) => {
  const params = new URLSearchParams()

  if (filters.commodity) params.set('commodity', filters.commodity)
  if (filters.state)     params.set('state',     filters.state)
  if (filters.district)  params.set('district',  filters.district)
  if (filters.market)    params.set('market',    filters.market)
  if (filters.limit)     params.set('limit',     String(filters.limit))

  const qs = params.toString()
  return request(`/market/prices${qs ? `?${qs}` : ''}`)
}

export default { getMarketPrices }
