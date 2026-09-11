/**
 * chatbotService.js
 *
 * KisanMitra AI Chatbot — Gemini backend service.
 *
 * ARCHITECTURE:
 *   - Reads GEMINI_API_KEY exclusively from process.env (server/.env)
 *   - Key is NEVER logged, NEVER returned to frontend, NEVER hardcoded
 *   - When key is absent → returns graceful "unavailable" signal
 *   - Handles Gemini errors / timeouts without crashing the server
 *   - System prompt scoped to KisanMitra agricultural marketplace domain
 *
 * SECURITY:
 *   - No API key in any response
 *   - No stack traces in responses
 *   - Input length limits enforced before sending to Gemini
 */

const GEMINI_MODEL   = 'gemini-2.5-flash'
const GEMINI_URL     = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`
const GEMINI_TIMEOUT = 20_000   // 20 s

// ── System prompt ─────────────────────────────────────────────────────────────

/**
 * Build the role-scoped system prompt for the KisanMitra assistant.
 *
 * @param {'farmer'|'buyer'|'admin'} role
 * @param {string} language  — 'hi' | 'en'
 * @returns {string}
 */
function buildSystemPrompt(role, language) {
  const langInstruction = language === 'hi'
    ? 'Always respond in Hindi (Devanagari script). Use simple, clear language suitable for Indian farmers and rural buyers.'
    : 'Always respond in English. Use simple, clear language.'

  const roleContext = {
    farmer: `The user is a FARMER on the KisanMitra platform.
Assist with:
- Listing/managing crops (adding, editing, removing crops from their account)
- Understanding mandi (wholesale market) prices and historical price trends
- AI price prediction feature (available in the app)
- Weather information and how it affects crops
- Pre-booking requests received from buyers (confirming, completing, cancelling)
- Delivery management (updating logistics, tracking delivery status)
- Transaction/payment status for confirmed bookings
- Farmer profile and verification process
- Using KisanMitra app features effectively
- General agricultural advice for Indian market conditions
- Hindi agricultural terminology`,

    buyer: `The user is a BUYER on the KisanMitra platform.
Assist with:
- Finding and browsing available crops on the marketplace
- Understanding crop quality, types, and typical prices
- How to pre-book crops from verified farmers
- Tracking booking status (pending → confirmed → completed)
- Delivery tracking and logistics
- Demo payment system (how to initiate, mark paid, cancel payments)
- Reviewing farmers after completed bookings
- Understanding farmer ratings and reviews
- Using KisanMitra app features effectively`,

    admin: `The user is an ADMIN on the KisanMitra platform.
Assist with:
- Farmer verification process (approving/rejecting documents)
- Platform statistics overview
- User management (searching, filtering, viewing user details)
- Understanding platform workflows (booking lifecycle, delivery, transactions)
- KisanMitra admin panel features`,
  }

  return `You are the KisanMitra AI Assistant — a helpful, accurate and trustworthy agricultural marketplace assistant for the KisanMitra digital platform used by Indian farmers and buyers.

${langInstruction}

USER ROLE: ${role.toUpperCase()}
${roleContext[role] || roleContext.farmer}

CRITICAL SAFETY RULES — ALWAYS FOLLOW:
1. NEVER fabricate or invent live market prices, weather data, booking status, payment status, or any specific user data. If asked, tell the user to open the relevant KisanMitra feature for live/real-time information.
2. NEVER expose another user's private information.
3. You are an informational assistant, NOT a financial, legal, or medical authority. For financial decisions, advise users to consult appropriate professionals.
4. If uncertain about something, clearly say so — do not guess.
5. Keep responses concise and practical. Avoid lengthy disclaimers.
6. For live data (prices, weather, bookings, deliveries, transactions, notifications) — always guide the user to the relevant section of KisanMitra app instead of making up numbers.
7. You can explain how features work but cannot see the user's actual account data.

KISANMITRA PLATFORM FEATURES you can explain:
- Marketplace: Browse available crops from verified farmers
- My Crops (Farmer): Manage crop listings
- Booking Requests (Farmer): View and respond to buyer pre-bookings
- My Bookings (Buyer): Track booking status
- Delivery Management (Farmer): Update logistics and delivery status
- My Deliveries (Buyer): Track delivery orders
- Transactions (both): Demo payment system
- Mandi Prices: Live government API commodity prices
- AI Price Prediction: Statistical + Gemini-powered price forecast
- Weather: Location-based agricultural weather
- Reviews: Rate farmers after completed bookings
- Notifications: In-app alerts for bookings, deliveries, payments
- Farmer Verification: Document upload and admin review

Respond helpfully, practically, and in the language specified.`
}

// ── Gemini API call ───────────────────────────────────────────────────────────

/**
 * Send a message to Gemini and return the assistant's reply text.
 *
 * @param {object} params
 * @param {string}   params.userMessage    — sanitised user message
 * @param {string}   params.role           — 'farmer' | 'buyer' | 'admin'
 * @param {string}   params.language       — 'hi' | 'en'
 * @param {Array}    params.history        — prior {role, text} turns (max 10)
 * @returns {Promise<{ reply: string, unavailable: boolean }>}
 */
export async function chatWithGemini({ userMessage, role, language, history = [] }) {
  const apiKey = process.env.GEMINI_API_KEY

  // ── Key absent: return graceful signal ───────────────────────────────────────
  if (!apiKey || !apiKey.trim() || apiKey === 'your_gemini_api_key_here') {
    return { reply: '', unavailable: true }
  }

  const systemPrompt = buildSystemPrompt(role, language)

  // ── Build Gemini contents array ───────────────────────────────────────────────
  // Gemini 1.5 Flash supports a "system_instruction" field plus a contents array.
  // History turns are included so the model has conversation context (max 10 prior).
  const contents = []

  // Prior conversation turns (each entry: { role: 'user'|'model', parts: [{text}] })
  for (const turn of history.slice(-10)) {
    contents.push({
      role:  turn.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(turn.text).slice(0, 2000) }],
    })
  }

  // Current user message
  contents.push({
    role:  'user',
    parts: [{ text: userMessage }],
  })

  const requestBody = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature:     0.7,
      maxOutputTokens: 800,
      topP:            0.9,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  }

  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), GEMINI_TIMEOUT)

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(requestBody),
      signal:  controller.signal,
    })
    clearTimeout(timeoutId)

    if (!res.ok) {
      // Log status code only — never log the key
      console.error(`chatbotService: Gemini HTTP ${res.status}`)
      return { reply: '', unavailable: false, geminiError: true }
    }

    const json  = await res.json()
    const text  = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    if (!text) {
      // Blocked or empty candidate
      console.error('chatbotService: Gemini returned empty candidate')
      return { reply: '', unavailable: false, geminiError: true }
    }

    return { reply: text.trim(), unavailable: false }

  } catch (err) {
    clearTimeout(timeoutId)
    const reason = err?.name === 'AbortError' ? 'timeout' : (err?.message || 'unknown')
    console.error(`chatbotService: Gemini call failed (${reason})`)
    return { reply: '', unavailable: false, geminiError: true }
  }
}

export default { chatWithGemini }
