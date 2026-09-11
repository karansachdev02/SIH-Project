/**
 * chatbot.controller.js
 *
 * KisanMitra AI Chatbot controller.
 *
 * POST /api/chatbot/message
 *
 * Security:
 *   - Requires valid JWT (protect middleware)
 *   - Supports farmer, buyer, admin roles
 *   - Input validated and length-limited before forwarding to Gemini
 *   - NEVER exposes Gemini API key, stack traces, or internal errors
 *   - NEVER bypasses role-based authorization
 */

import { chatWithGemini } from '../services/chatbotService.js'

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_MESSAGE_LENGTH = 1000   // characters
const MAX_HISTORY_TURNS  = 10     // prior conversation turns accepted

// Supported languages — default to 'en' for unknown values
const SUPPORTED_LANGUAGES = new Set(['hi', 'en'])

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Sanitise a single history turn object.
 * Returns null if the turn is malformed.
 */
function sanitiseTurn(turn) {
  if (!turn || typeof turn !== 'object') return null
  const role = typeof turn.role === 'string' ? turn.role.trim() : ''
  const text = typeof turn.text === 'string' ? turn.text.trim() : ''
  if (!['user', 'assistant'].includes(role) || !text) return null
  return { role, text: text.slice(0, 2000) }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @desc    Send a message to the KisanMitra AI Chatbot
 * @route   POST /api/chatbot/message
 * @access  Private — authenticated users (farmer, buyer, admin)
 *
 * Body:
 *   message   {string}   required — user's message (max 1000 chars)
 *   language  {string}   optional — 'hi' | 'en' (default: 'en')
 *   history   {Array}    optional — up to 10 prior turns: [{role:'user'|'assistant', text:string}]
 *
 * Response:
 *   { success: true, reply: string }                    — normal reply
 *   { success: false, unavailable: true, message: ... } — Gemini key not configured
 *   { success: false, message: ... }                    — validation / server error
 */
export const handleChatMessage = async (req, res) => {
  try {
    const { role } = req.user

    // ── Validate message ──────────────────────────────────────────────────────
    const rawMessage = req.body.message
    if (!rawMessage || typeof rawMessage !== 'string' || !rawMessage.trim()) {
      return res.status(400).json({
        success: false,
        message: 'message is required and must be a non-empty string.',
      })
    }

    const message = rawMessage.trim().slice(0, MAX_MESSAGE_LENGTH)

    // ── Validate language ─────────────────────────────────────────────────────
    const rawLang = typeof req.body.language === 'string' ? req.body.language.trim().toLowerCase() : 'en'
    const language = SUPPORTED_LANGUAGES.has(rawLang) ? rawLang : 'en'

    // ── Validate and sanitise history ─────────────────────────────────────────
    const rawHistory = Array.isArray(req.body.history) ? req.body.history : []
    const history = rawHistory
      .slice(0, MAX_HISTORY_TURNS)
      .map(sanitiseTurn)
      .filter(Boolean)

    // ── Call chatbot service ──────────────────────────────────────────────────
    const result = await chatWithGemini({ userMessage: message, role, language, history })

    // ── Gemini key not configured ─────────────────────────────────────────────
    if (result.unavailable) {
      return res.status(503).json({
        success: false,
        unavailable: true,
        message: 'AI assistant is temporarily unavailable. Please try again later or use the KisanMitra features directly.',
      })
    }

    // ── Gemini error (HTTP error, timeout, malformed response) ───────────────
    if (result.geminiError || !result.reply) {
      return res.status(502).json({
        success: false,
        message: 'AI assistant could not process your request. Please try again in a moment.',
      })
    }

    return res.status(200).json({
      success: true,
      reply:   result.reply,
    })

  } catch (err) {
    // Safe error — never expose stack trace or internal detail
    console.error('chatbot.controller handleChatMessage error:', err?.message)
    return res.status(500).json({
      success: false,
      message: 'Failed to process chatbot request. Please try again.',
    })
  }
}
