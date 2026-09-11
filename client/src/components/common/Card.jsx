import React from 'react'

/**
 * Reusable responsive Card container for KisanMitra.
 */
export default function Card({
  children,
  className = '',
  onClick,
  hoverable = false,
  ...props
}) {
  const interactiveStyles = (onClick || hoverable)
    ? 'cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all active:scale-[0.99]'
    : ''

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-emerald-100/80 shadow-sm shadow-emerald-900/5 p-4 sm:p-6 ${interactiveStyles} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
