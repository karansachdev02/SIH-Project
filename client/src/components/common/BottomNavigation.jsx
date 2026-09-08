import React, { useState } from 'react'
import { Home, TrendingUp, ShoppingBag, Bot, User } from 'lucide-react'

const NAV_ITEMS = [
  { id: 'home', label: 'होम', englishLabel: 'Home', icon: Home },
  { id: 'prices', label: 'मंडी भाव', englishLabel: 'Prices', icon: TrendingUp },
  { id: 'sell', label: 'बेचें', englishLabel: 'Sell', icon: ShoppingBag },
  { id: 'ai', label: 'AI सहायक', englishLabel: 'AI', icon: Bot },
  { id: 'profile', label: 'प्रोफ़ाइल', englishLabel: 'Profile', icon: User },
]

/**
 * Mobile-first Bottom Navigation Bar for Smart Mandi.
 * Shown on mobile/tablet viewports and hidden on desktop (md:hidden).
 */
export default function BottomNavigation() {
  const [activeTab, setActiveTab] = useState('home')

  return (
    <nav
      aria-label="मुख्य नेविगेशन / Main navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-emerald-100 shadow-lg px-2 py-1.5"
    >
      <div className="flex items-center justify-around max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2 min-w-[56px] min-h-[48px] rounded-xl transition-all ${
                isActive
                  ? 'text-emerald-700 font-bold bg-emerald-50 scale-105'
                  : 'text-gray-500 font-medium hover:text-emerald-600'
              }`}
            >
              <Icon
                size={22}
                className={`transition-colors ${isActive ? 'text-emerald-600 stroke-[2.5]' : 'stroke-[1.75]'}`}
                aria-hidden="true"
              />
              <span className="text-[11px] mt-0.5 leading-tight tracking-tight">
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
