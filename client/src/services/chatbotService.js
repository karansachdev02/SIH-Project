import { request } from './api'

/**
 * chatbotService.js  (frontend)
 *
 * Thin wrapper around POST /api/chatbot/message.
 * GEMINI_API_KEY is NEVER handled here — it stays server-side only.
 *
 * @param {object} params
 * @param {string}   params.message   — user's message
 * @param {string}   params.language  — 'hi' | 'en'
 * @param {Array}    params.history   — prior turns [{role, text}]
 * @returns {Promise<{ success: boolean, reply?: string, unavailable?: boolean, message?: string }>}
 */
export function sendChatMessage({ message, language, history = [] }) {
  return request('/chatbot/message', {
    method: 'POST',
    body: JSON.stringify({ message, language, history }),
  })
}

export default { sendChatMessage }
