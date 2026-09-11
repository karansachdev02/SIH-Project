import { useState, useEffect, useCallback } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { isSpeechSynthesisSupported, speak, cancelSpeech, isSpeaking } from '../../services/voiceService'
import { useLanguage } from '../../context/LanguageContext'

/**
 * SpeakButton — taps into browser speechSynthesis to read text aloud.
 *
 * Props:
 *   text     {string}    — the text to speak
 *   language {string}    — optional BCP-47 override; defaults to context locale
 *   label    {string}    — optional accessible label
 *   size     {number}    — icon size, default 14
 *   className {string}
 */
export default function SpeakButton({ text, language, label, size = 14, className = '' }) {
  const { locale, t } = useLanguage()
  const [active, setActive] = useState(false)
  const supported = isSpeechSynthesisSupported()

  const resolvedLocale = language || locale

  // Sync active state when speech ends externally
  useEffect(() => {
    if (!supported) return
    const interval = setInterval(() => {
      setActive(isSpeaking())
    }, 300)
    return () => clearInterval(interval)
  }, [supported])

  const handleClick = useCallback(() => {
    if (!supported || !text) return
    if (isSpeaking()) {
      cancelSpeech()
      setActive(false)
      return
    }
    speak(text, resolvedLocale)
    setActive(true)
  }, [supported, text, resolvedLocale])

  if (!supported) return null

  const ariaLabel = active ? (label ? `${t('stopSpeaking')}: ${label}` : t('stopSpeaking')) : (label ? `${t('speak')}: ${label}` : t('speak'))

  return (
    <button
      type="button"
      onClick={handleClick}
      title={ariaLabel}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={`inline-flex items-center justify-center p-1.5 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
        active
          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
          : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
      } ${className}`}
    >
      {active
        ? <VolumeX size={size} aria-hidden="true" />
        : <Volume2 size={size} aria-hidden="true" />}
    </button>
  )
}
