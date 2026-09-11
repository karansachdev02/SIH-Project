/**
 * voiceService.js — Browser-native speech recognition and synthesis helpers.
 *
 * Uses:
 *   window.SpeechRecognition / window.webkitSpeechRecognition  (voice input)
 *   window.speechSynthesis                                      (text-to-speech)
 *
 * All functions degrade gracefully when the browser does not support these APIs.
 * No API keys required.
 */

// ── Speech Recognition ────────────────────────────────────────────────────────

const SpeechRecognitionClass =
  (typeof window !== 'undefined') &&
  (window.SpeechRecognition || window.webkitSpeechRecognition)

export function isSpeechRecognitionSupported() {
  return Boolean(SpeechRecognitionClass)
}

let _activeRecognition = null

/**
 * Start speech recognition.
 *
 * @param {object} options
 * @param {string} options.language          - BCP-47 locale, e.g. 'hi-IN' or 'en-IN'
 * @param {boolean} [options.continuous]     - default false (single utterance)
 * @param {boolean} [options.interimResults] - default true
 * @param {(transcript: string, isFinal: boolean) => void} options.onResult
 * @param {(error: string) => void} [options.onError]
 * @param {() => void} [options.onEnd]
 * @returns {SpeechRecognition | null}
 */
export function startListening({ language, continuous = false, interimResults = true, onResult, onError, onEnd }) {
  if (!isSpeechRecognitionSupported()) {
    onError?.('Speech recognition is not supported in this browser.')
    return null
  }

  // Stop any existing session first
  stopListening()

  const recognition = new SpeechRecognitionClass()
  recognition.lang             = language || 'hi-IN'
  recognition.continuous       = continuous
  recognition.interimResults   = interimResults
  recognition.maxAlternatives  = 1

  recognition.onresult = (event) => {
    let interim = ''
    let finalTranscript = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript
      if (event.results[i].isFinal) {
        finalTranscript += t
      } else {
        interim += t
      }
    }
    if (finalTranscript) {
      onResult?.(finalTranscript, true)
    } else if (interim) {
      onResult?.(interim, false)
    }
  }

  recognition.onerror = (event) => {
    const msg = event.error === 'not-allowed'
      ? 'Microphone permission denied.'
      : event.error === 'no-speech'
      ? 'No speech detected.'
      : `Speech error: ${event.error}`
    onError?.(msg)
  }

  recognition.onend = () => {
    _activeRecognition = null
    onEnd?.()
  }

  recognition.start()
  _activeRecognition = recognition
  return recognition
}

export function stopListening() {
  if (_activeRecognition) {
    try { _activeRecognition.stop() } catch { /* ignore */ }
    _activeRecognition = null
  }
}

// ── Speech Synthesis ─────────────────────────────────────────────────────────

export function isSpeechSynthesisSupported() {
  return typeof window !== 'undefined' && Boolean(window.speechSynthesis)
}

/**
 * Speak a text string aloud.
 *
 * @param {string} text
 * @param {string} [language]  - BCP-47 locale, e.g. 'hi-IN' or 'en-IN'
 * @param {{ rate?: number, pitch?: number, volume?: number }} [options]
 */
export function speak(text, language, options = {}) {
  if (!isSpeechSynthesisSupported() || !text) return

  cancelSpeech()

  const utter = new window.SpeechSynthesisUtterance(text)
  utter.lang   = language || 'hi-IN'
  utter.rate   = options.rate   ?? 0.95
  utter.pitch  = options.pitch  ?? 1
  utter.volume = options.volume ?? 1

  window.speechSynthesis.speak(utter)
}

export function cancelSpeech() {
  if (isSpeechSynthesisSupported()) {
    try { window.speechSynthesis.cancel() } catch { /* ignore */ }
  }
}

export function isSpeaking() {
  return isSpeechSynthesisSupported() && window.speechSynthesis.speaking
}

export default {
  isSpeechRecognitionSupported,
  startListening,
  stopListening,
  isSpeechSynthesisSupported,
  speak,
  cancelSpeech,
  isSpeaking,
}
