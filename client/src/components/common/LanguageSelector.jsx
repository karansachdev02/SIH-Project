import { useState, useRef, useEffect } from 'react'
import { Globe, ChevronDown, Check } from 'lucide-react'
import { useLanguage } from '../../context/LanguageContext'

/**
 * LanguageSelector — shows supported languages (en / hi) and wires to LanguageContext.
 * Additional languages kept for display compatibility but only en/hi have translations.
 */
const ALL_LANGUAGES = [
  { code: 'en', native: 'English' },
  { code: 'hi', native: 'हिंदी' },
  { code: 'mr', native: 'मराठी' },
  { code: 'gu', native: 'ગુજરાતી' },
  { code: 'pa', native: 'ਪੰਜਾਬੀ' },
  { code: 'bn', native: 'বাংলা' },
  { code: 'ta', native: 'தமிழ்' },
  { code: 'te', native: 'తెలుగు' },
  { code: 'kn', native: 'ಕನ್ನಡ' },
  { code: 'or', native: 'ଓଡ଼ିଆ' },
]

export default function LanguageSelector({ className = '' }) {
  const { language, setLanguage, t } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  const currentLanguage = ALL_LANGUAGES.find((l) => l.code === language) || ALL_LANGUAGES[1]

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
    setLanguage(code)
    setIsOpen(false)
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={t('selectLanguage')}
        className="inline-flex items-center gap-2 px-3 py-2 text-sm md:text-base font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl border border-emerald-200/80 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 active:scale-95"
      >
        <Globe size={18} className="text-emerald-700 shrink-0" />
        <span>{currentLanguage.native}</span>
        <ChevronDown size={16} className={`text-emerald-600 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 max-h-72 overflow-y-auto rounded-2xl bg-white shadow-lg border border-emerald-100 py-1.5 z-50 focus:outline-none scrollbar-thin">
          <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100">
            {t('selectLanguage')}
          </div>
          {ALL_LANGUAGES.map((lang) => {
            const isSelected = lang.code === language
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
