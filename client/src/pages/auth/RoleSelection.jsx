import React from 'react'
import { Sprout, ShoppingCart, ArrowRight } from 'lucide-react'
import RoleCard from '../../components/common/RoleCard'
import Button from '../../components/common/Button'

/**
 * Role Selection interface for Smart Mandi registration.
 * Excludes Admin from public registration options per business rules.
 */
export default function RoleSelection({
  selectedRole = 'farmer',
  onSelectRole,
  onContinue,
}) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          आपकी भूमिका चुनें / Select Your Role
        </h2>
        <p className="text-sm sm:text-base text-slate-600 font-medium max-w-md mx-auto">
          स्मार्ट मंडी का उपयोग आप किस रूप में करना चाहते हैं?
        </p>
      </div>

      {/* Role Option Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
        <RoleCard
          role="farmer"
          title="किसान"
          description="अपनी फसल का बेहतर भाव खोजें और सीधी बिक्री करें"
          icon={Sprout}
          isSelected={selectedRole === 'farmer'}
          onClick={onSelectRole}
          badge="सत्यापन आवश्यक"
        />

        <RoleCard
          role="buyer"
          title="खरीदार"
          description="किसानों से सीधे ताज़ा फसल और कृषि उत्पाद खरीदें"
          icon={ShoppingCart}
          isSelected={selectedRole === 'buyer'}
          onClick={onSelectRole}
          badge="आसान पंजीकरण"
        />
      </div>

      {/* Continue CTA */}
      {onContinue && (
        <div className="flex justify-center pt-2">
          <Button
            variant="primary"
            size="lg"
            onClick={onContinue}
            className="w-full sm:w-auto min-w-[220px]"
          >
            <span>आगे बढ़ें</span>
            <ArrowRight size={20} aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  )
}
