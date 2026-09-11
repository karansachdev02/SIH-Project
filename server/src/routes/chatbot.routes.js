import express from 'express'
import { protect } from '../middleware/auth.middleware.js'
import { handleChatMessage } from '../controllers/chatbot.controller.js'

const router = express.Router()

/**
 * POST /api/chatbot/message
 *
 * Authenticated users only (farmer, buyer, admin).
 * Forwards message to KisanMitra AI assistant via Gemini API.
 * GEMINI_API_KEY is read server-side only — never exposed to client.
 */
router.post('/message', protect, handleChatMessage)

export default router
