import React, { useState } from 'react'
import { Sprout, Phone, Lock, Eye, EyeOff, LogIn, UserPlus, AlertCircle, Clock } from 'lucide-react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import LanguageSelector from '../../components/common/LanguageSelector'
import { loginUser } from '../../services/authService'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

/**
 * Connected Login Page for KisanMitra.
 */
export default function Login({ onSwitchToRegister, onSuccessLogin, onPendingFarmer }) {
  const [mobileNumber, setMobileNumber] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [pendingNotice, setPendingNotice] = useState(null)

  const { login, setPendingFarmerState } = useAuth()
  const { t } = useLanguage()

  const validateForm = () => {
    setErrorMsg('')
    if (!mobileNumber.trim()) {
      setErrorMsg(t('mobileRequired', 'Mobile number is required'))
      return false
    }
    if (!/^[6-9]\d{9}$/.test(mobileNumber.trim())) {
      setErrorMsg(t('mobileInvalid', 'Enter a valid 10-digit mobile number'))
      return false
    }
    if (!password) {
      setErrorMsg(t('passwordRequired', 'Password is required'))
      return false
    }
    if (password.length < 6) {
      setErrorMsg(t('passwordTooShort', 'Password must be at least 6 characters'))
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setPendingNotice(null)
    setErrorMsg('')

    if (!validateForm()) return

    setSubmitting(true)
    try {
      const res = await loginUser({
        mobile: mobileNumber.trim(),
        password,
      })

      // Case 1: Farmer Pending Verification
      if (res.verificationStatus === 'pending' || res.authenticated === false) {
        setPendingFarmerState(res)
        setPendingNotice(t('verificationPendingMsg', 'Your account is pending verification. You can log in once verification is complete.'))
        if (onPendingFarmer) onPendingFarmer(res)
        return
      }

      // Case 2: Rejected Verification
      if (res.verificationStatus === 'rejected') {
        setErrorMsg(t('rejectedFarmer', 'Your farmer verification was rejected.'))
        return
      }

      // Case 3: Authenticated (Buyer or Verified Farmer)
      if (res.token && res.user) {
        login(res.token, res.user)
        if (onSuccessLogin) onSuccessLogin(res.user)
      }
    } catch (err) {
      console.error('Login submit error:', err)
      setErrorMsg(err.message || t('loginFailed', 'Login failed. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto py-4 sm:py-8 space-y-6">
      {/* Top Header with Language Selector */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Sprout size={20} />
          </div>
          <span className="font-bold text-lg text-emerald-950">KisanMitra</span>
        </div>
        <LanguageSelector />
      </div>

      {/* Main Login Card */}
      <Card className="p-6 sm:p-8 shadow-md">
        {/* Title */}
        <div className="text-center space-y-2 mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('loginTitle', 'Login')}
          </h1>
          <p className="text-sm text-slate-600 font-medium">
            {t('loginSubtitle', 'Access your account using your mobile number')}
          </p>
        </div>

        {/* Error Alert Banner */}
        {errorMsg && (
          <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-start gap-2.5">
            <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Pending Verification Notice Banner */}
        {pendingNotice && (
          <div className="mb-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs sm:text-sm font-medium space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <Clock size={18} className="text-amber-600 shrink-0" />
              <span>{t('verificationPending', 'Verification Pending')}</span>
            </div>
            <p className="text-amber-800 leading-relaxed pl-6">
              {pendingNotice}
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Mobile Number Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="login-mobile"
              className="block text-sm font-bold text-slate-800"
            >
              {t('mobileNumber', 'Mobile Number')} <span className="text-emerald-600">*</span>
            </label>
            <div className="relative rounded-2xl">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Phone size={18} />
              </div>
              <input
                id="login-mobile"
                type="tel"
                required
                disabled={submitting}
                value={mobileNumber}
                onChange={(e) => setMobileNumber(e.target.value)}
                placeholder={t('mobilePlaceholder', 'e.g. 98765 43210')}
                className="w-full pl-10 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all min-h-[48px] disabled:opacity-60"
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label
              htmlFor="login-password"
              className="block text-sm font-bold text-slate-800"
            >
              {t('password', 'Password')} <span className="text-emerald-600">*</span>
            </label>
            <div className="relative rounded-2xl">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                disabled={submitting}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('passwordPlaceholder', 'Enter password')}
                className="w-full pl-10 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all min-h-[48px] disabled:opacity-60"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? t('hidePassword', 'Hide password') : t('showPassword', 'Show password')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-emerald-600 focus:outline-none focus:text-emerald-600"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {/* Submit CTA */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={submitting}
            className="mt-2"
          >
            <LogIn size={20} />
            <span>{submitting ? t('loggingIn', 'Logging in...') : t('loginCta', 'Login')}</span>
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-6 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <span className="relative bg-white px-3 text-xs font-semibold text-slate-400">
            {t('orSeparator', 'OR')}
          </span>
        </div>

        {/* Switch to Register */}
        <div className="text-center">
          <p className="text-sm text-slate-600 mb-3">
            {t('noAccount', 'New here?')}
          </p>
          <Button
            variant="outline"
            size="md"
            fullWidth
            disabled={submitting}
            onClick={onSwitchToRegister}
          >
            <UserPlus size={18} />
            <span>{t('createAccount', 'Create Account / Register')}</span>
          </Button>
        </div>
      </Card>
    </div>
  )
}
