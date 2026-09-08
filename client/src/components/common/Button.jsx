import React from 'react'

/**
 * Reusable, touch-friendly Button component with farmer-first sizing.
 */
export default function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'lg',
  icon: Icon,
  fullWidth = false,
  className = '',
  disabled = false,
  type = 'button',
  ...props
}) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98]'

  const variants = {
    primary:
      'bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-md shadow-emerald-600/20',
    secondary:
      'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 active:bg-emerald-300',
    outline:
      'border-2 border-emerald-600 text-emerald-700 bg-white hover:bg-emerald-50 active:bg-emerald-100',
  }

  const sizes = {
    sm: 'px-4 py-2 text-sm min-h-[40px] gap-1.5',
    md: 'px-5 py-3 text-base min-h-[48px] gap-2',
    lg: 'px-6 py-3.5 text-lg min-h-[56px] gap-2.5', // Farmer-friendly default
  }

  const iconSizes = {
    sm: 18,
    md: 20,
    lg: 24,
  }

  const widthClass = fullWidth ? 'w-full' : ''

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.lg} ${widthClass} ${className}`}
      {...props}
    >
      {Icon && <Icon size={iconSizes[size] || 24} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  )
}
