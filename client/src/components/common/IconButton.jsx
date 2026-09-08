import React from 'react'

/**
 * Accessible, touch-friendly icon button for Smart Mandi.
 */
export default function IconButton({
  icon: Icon,
  label,
  onClick,
  variant = 'ghost',
  size = 'md',
  className = '',
  ariaLabel,
  disabled = false,
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-95'

  const variants = {
    ghost: 'text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 active:bg-emerald-100',
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm',
    secondary: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 active:bg-emerald-300',
    outline: 'border border-emerald-200 text-emerald-800 hover:bg-emerald-50 hover:border-emerald-300',
  }

  const sizes = {
    sm: 'w-10 h-10 text-sm',
    md: 'w-12 h-12 text-base', // Touch friendly (min 48px target)
    lg: 'w-14 h-14 text-lg',
  }

  const iconSizes = {
    sm: 18,
    md: 22,
    lg: 26,
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label || ariaLabel}
      aria-label={ariaLabel || label}
      className={`${baseStyles} ${variants[variant] || variants.ghost} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {Icon && <Icon size={iconSizes[size] || 22} aria-hidden="true" />}
      {label && <span className="sr-only">{label}</span>}
    </button>
  )
}
