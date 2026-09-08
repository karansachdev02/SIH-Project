import React, { useState, useRef, useEffect } from 'react'
import { Globe, ChevronDown, Check } from 'lucide-react'

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' },
]

/**
 * Localization-ready Language Selector dropdown for Smart Mandi.
 */
export default function LanguageSelector({ className = '' }) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedLang, setSelectedLang] = useState('hi') // Defaulting to Hindi for display
  const dropdownRef = useRef(null)

  const currentLanguage = LANGUAGES.find((l) => l.code === selectedLang) || LANGUAGES[1]

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (code) => {
    setSelectedLang(code)
    setIsOpen(false)
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        className="inline-flex items-center gap-2 px-3 py-2 text-sm md:text-base font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200/80 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 active:scale-95"
      >
        <Globe size={18} className="text-emerald-700 shrink-0" />
        <span>{currentLanguage.native}</span>
        <ChevronDown size={16} className={`text-emerald-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 max-h-72 overflow-y-auto rounded-2xl bg-white shadow-lg border border-emerald-100 py-1.5 z-50 focus:outline-none scrollbar-thin">
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
            भाषा चुनें / Select Language
          </div>
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === selectedLang
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                className={`w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between transition-colors ${
                  isSelected
                    ? 'bg-emerald-50 text-emerald-800 font-semibold'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span>{lang.native}</span>
                {isSelected && <Check size={16} className="text-emerald-600" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
