import React from 'react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import {
  Sprout,
  Wheat,
  TrendingUp,
  ShoppingCart,
  Truck,
  Bot,
  Lightbulb,
  Clock,
  ArrowUpRight,
  PlusCircle,
} from 'lucide-react'

/**
 * Isolated demo data for Price Discovery UI demonstration.
 * Structured cleanly to be replaced by API / backend data in future iterations.
 */
const demoMarketData = {
  crop: 'गेहूं',
  price: '₹2,450',
  unit: 'क्विंटल',
  trend: '+3.2%',
  updated: 'आज अपडेट',
}

/**
 * Primary Farmer Action Grid Configuration
 */
const ACTION_ITEMS = [
  {
    id: 'my-crops',
    title: 'मेरी फसल',
    ariaLabel: 'मेरी फसल देखें या प्रबंधित करें / View My Crops',
    icon: Wheat,
    color: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  {
    id: 'buyers',
    title: 'खरीदार',
    ariaLabel: 'पास के खरीदार खोजें / Find Buyers',
    icon: ShoppingCart,
    color: 'bg-blue-100 text-blue-800 border-blue-200',
  },
  {
    id: 'transport',
    title: 'ट्रांसपोर्ट',
    ariaLabel: 'परिवहन सेवाएं देखें / Find Transport',
    icon: Truck,
    color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  {
    id: 'ai-assistant',
    title: 'AI सहायक',
    ariaLabel: 'स्मार्ट AI सहायक से पूछें / Ask AI Assistant',
    icon: Bot,
    color: 'bg-purple-100 text-purple-800 border-purple-200',
  },
]

/**
 * Farmer Home Dashboard Component for Smart Mandi.
 */
export default function FarmerHome() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* 1. GREETING SECTION */}
      <section aria-labelledby="greeting-heading" className="flex items-center justify-between bg-white rounded-2xl p-5 border border-emerald-100/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 id="greeting-heading" className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              नमस्ते किसान
            </h1>
            <span className="text-2xl" role="img" aria-label="waving hand">👋</span>
          </div>
          <p className="text-base sm:text-lg text-emerald-800 font-medium">
            आज अपनी फसल का बेहतर भाव खोजें
          </p>
        </div>
        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
          <Sprout size={28} aria-hidden="true" />
        </div>
      </section>

      {/* 2. MARKET PRICE CARD */}
      <section aria-labelledby="market-price-heading">
        <Card className="bg-gradient-to-br from-emerald-900 via-emerald-850 to-teal-900 text-white border-none shadow-xl relative overflow-hidden p-6">
          {/* Subtle background icon glow */}
          <TrendingUp className="absolute -right-6 -bottom-6 w-40 h-40 text-emerald-500/10 pointer-events-none" aria-hidden="true" />

          {/* Card Header */}
          <div className="flex items-center justify-between mb-4 border-b border-emerald-700/50 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-700/60 text-emerald-300 flex items-center justify-center">
                <TrendingUp size={20} aria-hidden="true" />
              </div>
              <h2 id="market-price-heading" className="text-lg sm:text-xl font-bold text-white tracking-wide">
                आज का मंडी भाव
              </h2>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-800/80 text-emerald-200 text-xs font-semibold border border-emerald-700/60">
              <Clock size={12} />
              <span>{demoMarketData.updated}</span>
            </div>
          </div>

          {/* Price Metrics Grid */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="text-emerald-300 text-sm font-semibold tracking-wider uppercase">
                मुख्य फसल / Crop
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
                {demoMarketData.crop}
              </div>
            </div>

            <div className="bg-emerald-800/50 backdrop-blur-xs rounded-2xl p-4 border border-emerald-700/50 flex items-center justify-between sm:justify-end gap-6">
              <div>
                <div className="text-xs text-emerald-200 font-medium">अनुमानित भाव / Market Rate</div>
                <div className="text-2xl sm:text-3xl font-black text-amber-300 mt-0.5">
                  {demoMarketData.price} <span className="text-sm font-medium text-emerald-100">/ {demoMarketData.unit}</span>
                </div>
              </div>
              <div className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 text-sm font-bold border border-emerald-400/30 shrink-0">
                <ArrowUpRight size={18} />
                <span>{demoMarketData.trend}</span>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* 3. PRIMARY ACTION GRID */}
      <section aria-label="मुख्य कार्य / Primary Actions">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
          {ACTION_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                aria-label={item.ariaLabel}
                className="group flex flex-col items-center justify-center p-5 sm:p-6 bg-white rounded-2xl border border-emerald-100 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center border ${item.color} mb-3 group-hover:scale-110 transition-transform duration-200 shadow-xs`}>
                  <Icon size={30} aria-hidden="true" />
                </div>
                <span className="text-base sm:text-lg font-bold text-slate-800 group-hover:text-emerald-800 transition-colors">
                  {item.title}
                </span>
              </button>
            )
          })}
        </div>
      </section>

      {/* 4. SMART ADVICE CARD */}
      <section aria-labelledby="advice-heading">
        <Card className="bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-amber-50/90 border-amber-200/80 p-5 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Lightbulb size={26} aria-hidden="true" />
          </div>
          <div className="space-y-1">
            <h3 id="advice-heading" className="text-base sm:text-lg font-bold text-amber-950 flex items-center gap-2">
              <span>आज की सलाह</span>
            </h3>
            <p className="text-sm sm:text-base text-amber-900/90 font-medium leading-relaxed">
              आपके पास के खरीदार बेहतर भाव दे सकते हैं।
            </p>
          </div>
        </Card>
      </section>

      {/* 5. QUICK SELL PRIMARY CTA BUTTON */}
      <section aria-label="फसल बिक्री / Sell Crop CTA">
        <Button
          variant="primary"
          size="lg"
          fullWidth
          className="py-4 text-xl font-extrabold shadow-lg shadow-emerald-600/30 gap-3 rounded-2xl"
        >
          <Sprout size={28} aria-hidden="true" />
          <span>फसल बेचें</span>
        </Button>
      </section>
    </div>
  )
}
