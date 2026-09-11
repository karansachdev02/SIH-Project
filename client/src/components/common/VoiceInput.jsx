import { useState, useEffect, useRef, useCallback } from 'react'
import { Mic, MicOff, AlertCircle } from 'lucide-react'
import { isSpeechRecognitionSupported, startListening, stopListening } from '../../services/voiceService'
import { useLanguage } from '../../context/LanguageContext'

/**
 * VoiceInput — microphone button that appends spoken transcript to a text field.
 *
 * Props:
 *   value       {string}    — current input value (controlled)
 *   onChange    {function}  — (newValue: string) => void
 *   placeholder {string}
 *   language    {string}    — optional BCP-47 override; defaults to context locale
 *   disabled    {boolean}
 *   className   {string}
 */
export default function VoiceInput({ value, onChange, language, disabled, className = '' }) {
  const { locale, t } = useLanguage()
  const [listening,  setListening]  = useState(false)
  const [interim,    setInterim]    = useState('')
  const [error,      setError]      = useState(null)
  const supported = isSpeechRecognitionSupported()
  const stopRef = useRef(null)

  const resolvedLocale = language || locale

  // Clean up on unmount
  useEffect(() => () => { stopListening() }, [])

  const handleToggle = useCallback(() => {
    if (listening) {
      stopListening()
      setListening(false)
      setInterim('')
      return
    }

    setError(null)
    setInterim('')
    setListening(true)

    stopRef.current = startListening({
      language: resolvedLocale,
      continuous: false,
      interimResults: true,
      onResult: (transcript, isFinal) => {
        if (isFinal) {
          onChange?.(value ? `${value} ${transcript}`.trim() : transcript)
          setInterim('')
          setListening(false)
        } else {
          setInterim(transcript)
        }
      },
      onError: (msg) => {
        setError(msg)
        setListening(false)
        setInterim('')
      },
      onEnd: () => {
        setListening(false)
        setInterim('')
      },
    })
  }, [listening, resolvedLocale, onChange, value])

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        title={t('voiceNotSupported')}
        aria-label={t('voiceNotSupported')}
        className={`p-2 rounded-xl text-slate-300 cursor-not-allowed ${className}`}
      >
        <MicOff size={16} aria-hidden="true" />
      </button>
    )
  }

  return (
    <div className={`relative inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        title={listening ? t('stopListening') : t('listen')}
        aria-label={listening ? t('stopListening') : t('listen')}
        aria-pressed={listening}
        className={`p-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 ${
          listening
            ? 'bg-rose-100 text-rose-600 hover:bg-rose-200 animate-pulse'
            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
        }`}
      >
        <Mic size={16} aria-hidden="true" />
      </button>

      {/* Interim transcript preview */}
      {listening && interim && (
        <span className="ml-2 text-xs text-slate-500 italic max-w-[140px] truncate">
          {interim}
        </span>
      )}

      {/* Listening indicator */}
      {listening && !interim && (
        <span className="ml-2 text-xs text-rose-500 font-medium animate-pulse">
          {t('listening')}
        </span>
      )}

      {/* Error */}
      {error && !listening && (
        <span
          className="ml-2 text-xs text-slate-500 flex items-center gap-1"
          title={error}
        >
          <AlertCircle size={12} className="shrink-0" />
          <span className="hidden sm:inline truncate max-w-[120px]">{error}</span>
        </span>
      )}
    </div>
  )
}
