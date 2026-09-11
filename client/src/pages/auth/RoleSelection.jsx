import React from 'react'
import { Sprout, ShoppingCart, ArrowRight } from 'lucide-react'
import RoleCard from '../../components/common/RoleCard'
import Button from '../../components/common/Button'
import { useLanguage } from '../../context/LanguageContext'

/**
 * Role Selection interface for KisanMitra registration.
 * Excludes Admin from public registration options per business rules.
 */
export default function RoleSelection({
  selectedRole = 'farmer',
  onSelectRole,
  onContinue,
}) {
  const { t } = useLanguage()

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {t('selectYourRole')}
        </h2>
        <p className="text-sm sm:text-base text-slate-600 font-medium max-w-md mx-auto">
          {t('selectYourRoleSubtitle')}
        </p>
      </div>

      {/* Role Option Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
        <RoleCard
          role="farmer"
          title={t('farmerRoleTitle')}
          description={t('farmerRoleDesc')}
          icon={Sprout}
          isSelected={selectedRole === 'farmer'}
          onClick={onSelectRole}
          badge={t('farmerRoleBadge')}
        />

        <RoleCard
          role="buyer"
          title={t('buyerRoleTitle')}
          description={t('buyerRoleDesc')}
          icon={ShoppingCart}
          isSelected={selectedRole === 'buyer'}
          onClick={onSelectRole}
          badge={t('buyerRoleBadge')}
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
            <span>{t('continueBtn')}</span>
            <ArrowRight size={20} aria-hidden="true" />
          </Button>
        </div>
      )}
    </div>
  )
}
