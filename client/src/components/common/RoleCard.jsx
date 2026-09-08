import React from 'react'
import { CheckCircle2 } from 'lucide-react'

/**
 * Reusable accessible Role Selection Card component for Smart Mandi.
 */
export default function RoleCard({
  role,
  title,
  description,
  icon: Icon,
  isSelected = false,
  onClick,
  badge,
}) {
  return (
    <button
      type="button"
      onClick={() => onClick && onClick(role)}
      aria-pressed={isSelected}
      aria-label={`${title}: ${description}`}
      className={`relative flex flex-col items-center text-center p-6 rounded-2xl border-2 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 active:scale-98 min-h-[160px] ${
        isSelected
          ? 'bg-emerald-50/80 border-emerald-600 shadow-md text-emerald-950 ring-1 ring-emerald-600'
          : 'bg-white border-emerald-100/90 hover:border-emerald-300 hover:shadow-xs text-slate-800'
      }`}
    >
      {/* Selected Indicator Checkmark */}
      {isSelected && (
        <div className="absolute top-3 right-3 text-emerald-600">
          <CheckCircle2 size={22} className="fill-emerald-100" />
        </div>
      )}

      {/* Optional Badge */}
      {badge && (
        <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
          {badge}
        </span>
      )}

      {/* Icon Badge */}
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform duration-200 ${
          isSelected
            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 scale-105'
            : 'bg-emerald-100/80 text-emerald-700'
        }`}
      >
        {Icon && <Icon size={32} aria-hidden="true" />}
      </div>

      {/* Title */}
      <h3 className="text-xl font-bold tracking-tight mb-1">{title}</h3>

      {/* Description */}
      <p className="text-sm font-medium text-slate-600 max-w-xs leading-snug">
        {description}
      </p>
    </button>
  )
}
