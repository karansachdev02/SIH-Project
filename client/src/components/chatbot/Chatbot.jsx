import { useState, useRef, useEffect, useCallback } from 'react'
import {
  MessageCircle,
  X,
  Send,
  Loader2,
  Bot,
  User,
  Trash2,
  AlertCircle,
  WifiOff,
} from 'lucide-react'
import { sendChatMessage } from '../../services/chatbotService'
import VoiceInput from '../common/VoiceInput'
import SpeakButton from '../common/SpeakButton'
import { useLanguage } from '../../context/LanguageContext'
import { useAuth } from '../../context/AuthContext'

// ── Message bubble ────────────────────────────────────────────────────────────

function MessageBubble({ msg, language }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end`}>
      {/* Avatar */}
      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
        isUser
          ? 'bg-emerald-600 text-white'
          : 'bg-violet-100 text-violet-700 border border-violet-200'
      }`}>
        {isUser ? <User size={14} aria-hidden="true" /> : <Bot size={14} aria-hidden="true" />}
      </div>

      {/* Bubble */}
      <div className={`group max-w-[78%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-emerald-600 text-white rounded-br-sm'
            : 'bg-white border border-slate-100 text-slate-800 shadow-sm rounded-bl-sm'
        }`}>
          {msg.text}
        </div>

        {/* Speak button for AI messages */}
        {!isUser && (
          <div className="opacity-0 group-hover:opacity-100 transition-opacity ml-1">
            <SpeakButton text={msg.text} language={language} size={13} />
          </div>
        )}
      </div>
    </div>
  )
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-2.5 items-end">
      <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 border border-violet-200 flex items-center justify-center shrink-0">
        <Bot size={14} aria-hidden="true" />
      </div>
      <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white border border-slate-100 shadow-sm flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  )
}

// ── Welcome state ─────────────────────────────────────────────────────────────

function WelcomeMessage({ role, language }) {
  const greetings = {
    hi: {
      farmer: 'नमस्ते! मैं KisanMitra AI असिस्टेंट हूँ। 🌾\n\nमैं आपकी मदद कर सकता हूँ:\n• फसल की कीमतें और बाज़ार भाव\n• बुकिंग और डिलीवरी\n• मौसम और AI भाव भविष्यवाणी\n• फसल सूची प्रबंधन\n\nकोई भी सवाल पूछें!',
      buyer:  'नमस्ते! मैं KisanMitra AI असिस्टेंट हूँ। 🛒\n\nमैं आपकी मदद कर सकता हूँ:\n• फसल खोजें और खरीदें\n• बुकिंग ट्रैक करें\n• डिलीवरी और भुगतान\n• किसानों की रेटिंग और समीक्षा\n\nकोई भी सवाल पूछें!',
      admin:  'नमस्ते! मैं KisanMitra AI असिस्टेंट हूँ। ⚙️\n\nमैं आपकी मदद कर सकता हूँ:\n• किसान सत्यापन प्रक्रिया\n• प्लेटफ़ॉर्म सांख्यिकी\n• उपयोगकर्ता प्रबंधन\n\nकोई भी सवाल पूछें!',
    },
    en: {
      farmer: 'Hello! I\'m the KisanMitra AI Assistant. 🌾\n\nI can help you with:\n• Crop prices & mandi rates\n• Bookings & deliveries\n• Weather & AI price prediction\n• Managing your crop listings\n\nAsk me anything!',
      buyer:  'Hello! I\'m the KisanMitra AI Assistant. 🛒\n\nI can help you with:\n• Finding & buying crops\n• Tracking your bookings\n• Delivery & demo payments\n• Farmer ratings & reviews\n\nAsk me anything!',
      admin:  'Hello! I\'m the KisanMitra AI Assistant. ⚙️\n\nI can help you with:\n• Farmer verification process\n• Platform statistics\n• User management guidance\n\nAsk me anything!',
    },
  }

  const langKey = language === 'hi' ? 'hi' : 'en'
  const roleKey = ['farmer', 'buyer', 'admin'].includes(role) ? role : 'farmer'
  const text = greetings[langKey][roleKey]

  return (
    <div className="flex gap-2.5 items-end">
      <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 border border-violet-200 flex items-center justify-center shrink-0">
        <Bot size={14} aria-hidden="true" />
      </div>
      <div className="max-w-[78%] px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-white border border-slate-100 shadow-sm text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
        {text}
      </div>
    </div>
  )
}

// ── Unavailable state ─────────────────────────────────────────────────────────

function UnavailableBanner({ language }) {
  const text = language === 'hi'
    ? 'AI असिस्टेंट अभी उपलब्ध नहीं है। बाद में पुनः प्रयास करें।'
    : 'AI assistant is temporarily unavailable. Please try again later.'
  return (
    <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
      <WifiOff size={13} className="shrink-0 mt-0.5" />
      <span>{text}</span>
    </div>
  )
}

// ── Main Chatbot component ────────────────────────────────────────────────────

/**
 * Chatbot — floating button + slide-up chat panel.
 *
 * This component mounts globally (inside App.jsx when authenticated).
 * It manages its own open/close state and does not affect the currentView system.
 *
 * Props:
 *   user            — authenticated user from AuthContext
 *   isAuthenticated — boolean
 */
export default function Chatbot({ user, isAuthenticated }) {
  const { language } = useLanguage()
  const { token } = useAuth()

  const [open,         setOpen]         = useState(false)
  const [inputValue,   setInputValue]   = useState('')
  const [messages,     setMessages]     = useState([])  // {id, role, text}
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState(null)
  const [unavailable,  setUnavailable]  = useState(false)
  const [unreadCount,  setUnreadCount]  = useState(0)

  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)
  const messageIdRef   = useRef(0)

  const role = user?.role || 'farmer'

  // ── Scroll to bottom on new messages ────────────────────────────────────────
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, loading, open])

  // ── Focus input when panel opens ─────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 120)
    }
  }, [open])

  // ── Track unread when panel is closed ────────────────────────────────────────
  useEffect(() => {
    if (!open && messages.length > 0) {
      const lastMsg = messages[messages.length - 1]
      if (lastMsg.role === 'assistant') {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUnreadCount((c) => c + 1)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages])

  const handleOpen = () => {
    setOpen(true)
    setUnreadCount(0)
  }
  const handleClose = useCallback(() => setOpen(false), [])

  // ── Clear conversation ───────────────────────────────────────────────────────
  const handleClear = () => {
    setMessages([])
    setError(null)
    setUnavailable(false)
    setInputValue('')
  }

  // ── Build history for API ────────────────────────────────────────────────────
  // Send the last 10 turns to provide conversation context
  function buildHistory(currentMessages) {
    return currentMessages
      .slice(-10)
      .map((m) => ({ role: m.role, text: m.text }))
  }

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = inputValue.trim()
    if (!text || loading) return

    const userMsg = { id: ++messageIdRef.current, role: 'user', text }
    setMessages((prev) => [...prev, userMsg])
    setInputValue('')
    setError(null)
    setUnavailable(false)
    setLoading(true)

    try {
      const history = buildHistory([...messages, userMsg].slice(0, -1))
      const res = await sendChatMessage({ message: text, language, history })

      if (res.unavailable) {
        setUnavailable(true)
      } else if (res.success && res.reply) {
        const aiMsg = { id: ++messageIdRef.current, role: 'assistant', text: res.reply }
        setMessages((prev) => [...prev, aiMsg])
      } else {
        setError(
          language === 'hi'
            ? 'AI असिस्टेंट से जवाब नहीं मिला। कृपया दोबारा कोशिश करें।'
            : 'Could not get a response. Please try again.'
        )
      }
    } catch (err) {
      // 503 = unavailable (no key configured)
      if (err?.status === 503) {
        setUnavailable(true)
      } else {
        setError(
          err?.message ||
          (language === 'hi'
            ? 'कुछ गड़बड़ हुई। कृपया दोबारा कोशिश करें।'
            : 'Something went wrong. Please try again.')
        )
      }
    } finally {
      setLoading(false)
    }
  }, [inputValue, loading, messages, language])

  // ── Enter key handler ────────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Don't render if not authenticated ────────────────────────────────────────
  if (!isAuthenticated || !token) return null

  const hasMessages = messages.length > 0

  const panelLabel = language === 'hi' ? 'KisanMitra AI असिस्टेंट' : 'KisanMitra AI Assistant'
  const placeholderText = language === 'hi' ? 'यहाँ लिखें या बोलें…' : 'Type or speak a question…'
  const sendLabel  = language === 'hi' ? 'भेजें' : 'Send'
  const clearLabel = language === 'hi' ? 'साफ़ करें' : 'Clear chat'
  const closeLabel = language === 'hi' ? 'बंद करें' : 'Close'

  return (
    <>
      {/* ── Floating Action Button ──────────────────────────────────────────── */}
      {!open && (
        <button
          type="button"
          aria-label={panelLabel}
          onClick={handleOpen}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-violet-600 text-white shadow-lg shadow-violet-600/40 hover:bg-violet-700 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 flex items-center justify-center"
        >
          <MessageCircle size={26} aria-hidden="true" />
          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} unread messages`}
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center leading-none"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* ── Chat Panel ─────────────────────────────────────────────────────── */}
      {open && (
        <div
          role="dialog"
          aria-modal="false"
          aria-label={panelLabel}
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
          style={{ height: 'min(520px, calc(100dvh - 120px))' }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-600 to-violet-700 text-white shrink-0">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Bot size={18} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold leading-tight truncate">{panelLabel}</p>
              <p className="text-[10px] text-violet-200 font-medium">
                {language === 'hi' ? 'Gemini AI द्वारा संचालित' : 'Powered by Gemini AI'}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {hasMessages && (
                <button
                  type="button"
                  onClick={handleClear}
                  title={clearLabel}
                  aria-label={clearLabel}
                  className="p-1.5 rounded-lg hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
                >
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                title={closeLabel}
                aria-label={closeLabel}
                className="p-1.5 rounded-lg hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Messages area */}
          <div
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50"
            aria-live="polite"
            aria-relevant="additions"
          >
            {/* Welcome message — shown when no messages yet */}
            {!hasMessages && !unavailable && (
              <WelcomeMessage role={role} language={language} />
            )}

            {/* Conversation messages */}
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} language={language} />
            ))}

            {/* Typing indicator */}
            {loading && <TypingIndicator />}

            {/* Unavailable banner */}
            {unavailable && <UnavailableBanner language={language} />}

            {/* Error banner */}
            {error && !unavailable && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
                <AlertCircle size={13} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div className="shrink-0 px-3 py-3 border-t border-slate-200 bg-white">
            <div className="flex items-end gap-2">
              {/* Text input + voice */}
              <div className="flex-1 relative flex items-end">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.slice(0, 1000))}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholderText}
                  disabled={loading}
                  rows={1}
                  aria-label={placeholderText}
                  className="w-full pl-3 pr-2 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-white transition-all disabled:opacity-60 max-h-28 overflow-y-auto leading-snug"
                  style={{ minHeight: '40px' }}
                />
              </div>

              {/* Voice input button */}
              <VoiceInput
                value={inputValue}
                onChange={setInputValue}
                disabled={loading}
                className="shrink-0"
              />

              {/* Send button */}
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !inputValue.trim()}
                aria-label={sendLabel}
                title={sendLabel}
                className="shrink-0 w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center hover:bg-violet-700 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? <Loader2 size={17} className="animate-spin" aria-hidden="true" />
                  : <Send size={17} aria-hidden="true" />}
              </button>
            </div>

            {/* Character count hint */}
            {inputValue.length > 800 && (
              <p className="mt-1 text-[10px] text-slate-400 text-right">
                {inputValue.length}/1000
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
