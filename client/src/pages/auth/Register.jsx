import React, { useState, useEffect } from 'react'
import {
  Sprout,
  Phone,
  User,
  MapPin,
  Building,
  Upload,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  FileText,
  AlertCircle,
  Clock,
  Lock,
  KeyRound,
} from 'lucide-react'
import Card from '../../components/common/Card'
import Button from '../../components/common/Button'
import RoleSelection from './RoleSelection'
import LanguageSelector from '../../components/common/LanguageSelector'
import { sendFarmerOtp, verifyFarmerOtp, registerFarmer, registerBuyer } from '../../services/authService'
import { uploadFarmerDocument } from '../../services/verificationService'
import { useAuth } from '../../context/AuthContext'

const INDIAN_LANGUAGES = [
  'English',
  'हिंदी (Hindi)',
  'मराठी (Marathi)',
  '<ctrl42>ગુજરાતી (Gujarati)',
  'ਪੰਜਾਬੀ (Punjabi)',
  'বাংলা (Bengali)',
  'தமிழ் (Tamil)',
  'తెలుగు (Telugu)',
  '<ctrl42>ಕನ್ನಡ (Kannada)',
  'ଓଡ଼ିଆ (Odia)',
]

export default function Register({ onSwitchToLogin, onFarmerRegistered, onBuyerRegistered }) {
  const [role, setRole] = useState('farmer')
  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingDoc, setUploadingDoc] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [uploadErrorMsg, setUploadErrorMsg] = useState('')
  const [farmerSuccess, setFarmerSuccess] = useState(null)
  const [docSubmitted, setDocSubmitted] = useState(false)
  const [buyerSuccess, setBuyerSuccess] = useState(null)

  // OTP Verification States
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifyingOtp, setVerifyingOtp] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [isMobileVerified, setIsMobileVerified] = useState(false)
  const [devOtpHint, setDevOtpHint] = useState('')
  const [cooldownSeconds, setCooldownSeconds] = useState(0)

  const { login } = useAuth()

  // Farmer form state
  const [farmerForm, setFarmerForm] = useState({
    name: '',
    mobile: '',
    otp: '',
    password: '',
    preferredLanguage: 'hi',
    state: '',
    district: '',
    village: '',
    mobileVerificationToken: '',
    documentFile: null,
    documentName: null,
    documentType: 'farmer_id',
  })

  // Buyer form state
  const [buyerForm, setBuyerForm] = useState({
    name: '',
    mobile: '',
    password: '',
    preferredLanguage: 'hi',
    state: '',
    district: '',
    businessName: '',
    businessType: 'मंडी व्यापारी / Trader',
  })

  const farmerSteps = ['मोबाइल व OTP सत्यापन', 'किसान विवरण', 'दस्तावेज़', 'जमा करें']
  const buyerSteps = ['खाता विवरण', 'व्यवसाय विवरण', 'खाता बनाएं']
  const activeSteps = role === 'farmer' ? farmerSteps : buyerSteps

  // Cooldown timer tick
  useEffect(() => {
    let timer
    if (cooldownSeconds > 0) {
      timer = setTimeout(() => setCooldownSeconds((prev) => prev - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [cooldownSeconds])

  const handleSendOtp = async () => {
    setErrorMsg('')
    if (!farmerForm.mobile.trim() || !/^[6-9]\d{9}$/.test(farmerForm.mobile.trim())) {
      setErrorMsg('कृपया मान्य 10-अंकीय मोबाइल नंबर दर्ज करें / Enter a valid 10-digit mobile number')
      return
    }

    setSendingOtp(true)
    try {
      const res = await sendFarmerOtp(farmerForm.mobile.trim())
      setOtpSent(true)
      setCooldownSeconds(60)
      if (res.developmentOtp) {
        setDevOtpHint(res.developmentOtp)
      }
    } catch (err) {
      setErrorMsg(err.message || 'OTP भेजने में विफलता / Failed to send OTP')
    } finally {
      setSendingOtp(false)
    }
  }

  const handleVerifyOtp = async () => {
    setErrorMsg('')
    if (!farmerForm.otp || farmerForm.otp.trim().length !== 6) {
      setErrorMsg('कृपया 6-अंकीय OTP दर्ज करें / Enter 6-digit OTP')
      return
    }

    setVerifyingOtp(true)
    try {
      const res = await verifyFarmerOtp(farmerForm.mobile.trim(), farmerForm.otp.trim())
      if (res.mobileVerificationToken) {
        setFarmerForm((prev) => ({
          ...prev,
          mobileVerificationToken: res.mobileVerificationToken,
        }))
        setIsMobileVerified(true)
        setDevOtpHint('')
      }
    } catch (err) {
      setErrorMsg(err.message || 'OTP सत्यापन विफल / OTP verification failed')
    } finally {
      setVerifyingOtp(false)
    }
  }

  const validateCurrentStep = () => {
    setErrorMsg('')

    if (role === 'farmer') {
      if (currentStep === 1) {
        if (!farmerForm.name.trim()) {
          setErrorMsg('कृपया पूरा नाम दर्ज करें / Full name is required')
          return false
        }
        if (!/^[6-9]\d{9}$/.test(farmerForm.mobile.trim())) {
          setErrorMsg('कृपया मान्य 10-अंकीय मोबाइल नंबर दर्ज करें / Valid 10-digit mobile number required')
          return false
        }
        if (!isMobileVerified || !farmerForm.mobileVerificationToken) {
          setErrorMsg('कृपया पहले अपना मोबाइल नंबर OTP से सत्यापित करें / Please verify mobile number via OTP first')
          return false
        }
        if (!farmerForm.password || farmerForm.password.length < 6) {
          setErrorMsg('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए / Password must be at least 6 characters')
          return false
        }
      }
    } else {
      if (currentStep === 1) {
        if (!buyerForm.name.trim()) {
          setErrorMsg('कृपया पूरा नाम दर्ज करें / Full name is required')
          return false
        }
        if (!/^[6-9]\d{9}$/.test(buyerForm.mobile.trim())) {
          setErrorMsg('कृपया मान्य 10-अंकीय मोबाइल नंबर दर्ज करें / Valid 10-digit mobile number required')
          return false
        }
        if (!buyerForm.password || buyerForm.password.length < 6) {
          setErrorMsg('पासवर्ड कम से कम 6 अक्षरों का होना चाहिए / Password must be at least 6 characters')
          return false
        }
      }
    }
    return true
  }

  const handleNext = () => {
    if (!validateCurrentStep()) return
    if (currentStep < activeSteps.length) {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    setErrorMsg('')
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1)
    }
  }

  const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
  const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5 MB

  const handleFileUpload = (e) => {
    setErrorMsg('')
    const file = e.target.files?.[0]
    if (!file) return

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setErrorMsg('केवल PDF, JPG, JPEG और PNG फ़ाइलें समर्थित हैं / Only PDF, JPG, JPEG and PNG files are allowed')
      e.target.value = ''
      return
    }

    if (file.size > MAX_FILE_SIZE) {
      setErrorMsg('फ़ाइल का आकार 5MB से अधिक नहीं होना चाहिए / File size must not exceed 5MB')
      e.target.value = ''
      return
    }

    setFarmerForm((prev) => ({ ...prev, documentFile: file, documentName: file.name }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setUploadErrorMsg('')

    if (!validateCurrentStep()) return

    setSubmitting(true)

    try {
      if (role === 'farmer') {
        const payload = {
          name: farmerForm.name.trim(),
          mobile: farmerForm.mobile.trim(),
          password: farmerForm.password,
          preferredLanguage: farmerForm.preferredLanguage,
          state: farmerForm.state.trim(),
          district: farmerForm.district.trim(),
          village: farmerForm.village.trim(),
          mobileVerificationToken: farmerForm.mobileVerificationToken,
        }

        const res = await registerFarmer(payload)
        const registeredUser = res.user || res
        const verificationSessionToken = res.verificationSessionToken

        // Registration succeeded — now upload document if one was selected
        setFarmerSuccess(registeredUser)
        setSubmitting(false)

        if (verificationSessionToken && farmerForm.documentFile) {
          setUploadingDoc(true)
          try {
            await uploadFarmerDocument(
              farmerForm.documentFile,
              farmerForm.documentType,
              verificationSessionToken
            )
            setDocSubmitted(true)
          } catch (uploadErr) {
            // Registration succeeded but upload failed — show clear error, keep farmerSuccess set
            setUploadErrorMsg(
              uploadErr.message ||
              'पंजीकरण सफल हुआ, लेकिन दस्तावेज़ अपलोड विफल रहा। कृपया लॉगिन करके पुनः प्रयास करें। / Registration succeeded but document upload failed. Please retry after logging in.'
            )
          } finally {
            setUploadingDoc(false)
          }
        } else {
          setDocSubmitted(false)
        }

        if (onFarmerRegistered) onFarmerRegistered(registeredUser)
        return
      } else {
        const payload = {
          name: buyerForm.name.trim(),
          mobile: buyerForm.mobile.trim(),
          password: buyerForm.password,
          preferredLanguage: buyerForm.preferredLanguage,
          state: buyerForm.state.trim(),
          district: buyerForm.district.trim(),
          businessName: buyerForm.businessName.trim(),
          businessType: buyerForm.businessType.trim(),
        }

        const res = await registerBuyer(payload)
        if (res.token && res.user) {
          login(res.token, res.user)
          setBuyerSuccess(res.user)
          if (onBuyerRegistered) onBuyerRegistered(res.user)
        }
      }
    } catch (err) {
      console.error('Registration submit error:', err)
      setErrorMsg(err.message || 'पंजीकरण में विफलता। कृपया पुनः प्रयास करें। / Registration failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-4 sm:py-8 space-y-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
            <Sprout size={20} />
          </div>
          <span className="font-bold text-lg text-emerald-950">Smart Mandi</span>
        </div>
        <LanguageSelector />
      </div>

      <Card className="p-6 sm:p-8 shadow-md">
        {/* FARMER REGISTRATION SUCCESS */}
        {farmerSuccess ? (
          <div className="text-center py-6 space-y-5">
            {uploadingDoc ? (
              /* Document upload in progress */
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm animate-pulse">
                  <Upload size={36} />
                </div>
                <h2 className="text-xl font-extrabold text-emerald-950">
                  दस्तावेज़ अपलोड हो रहा है… / Uploading document…
                </h2>
              </>
            ) : docSubmitted ? (
              /* Registration + document upload both succeeded */
              <>
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 size={36} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-emerald-950">
                    दस्तावेज़ सफलतापूर्वक जमा किया गया / Document Submitted
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto font-medium">
                    आपका खाता प्रशासन समीक्षा के बाद सक्रिय होगा
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs sm:text-sm max-w-md mx-auto text-left space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck size={18} className="text-emerald-700" />
                    <span>स्थिति: दस्तावेज़ समीक्षा में (Document Under Review)</span>
                  </p>
                  <p className="text-emerald-800">
                    नाम: <strong>{farmerSuccess.name}</strong> | मोबाइल: <strong>{farmerSuccess.mobile}</strong>
                  </p>
                </div>
              </>
            ) : (
              /* Registration succeeded but document upload failed or no document */
              <>
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
                  <Clock size={36} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-extrabold text-emerald-950">
                    पंजीकरण सफल, सत्यापन लंबित / Registration Successful
                  </h2>
                  <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto font-medium">
                    खाता सक्रिय होने के बाद आप लॉगिन कर सकेंगे
                  </p>
                </div>

                {uploadErrorMsg && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-start gap-2.5 max-w-md mx-auto text-left">
                    <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                    <span>{uploadErrorMsg}</span>
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm max-w-md mx-auto text-left space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck size={18} className="text-amber-700" />
                    <span>सत्यापन स्थिति: लंबित (Pending Verification)</span>
                  </p>
                  <p className="text-amber-800">
                    नाम: <strong>{farmerSuccess.name}</strong> | मोबाइल: <strong>{farmerSuccess.mobile}</strong>
                  </p>
                </div>
              </>
            )}

            {!uploadingDoc && (
              <div className="pt-4 flex justify-center">
                <Button variant="primary" size="md" onClick={onSwitchToLogin}>
                  <span>लॉगिन पृष्ठ पर जाएं / Go to Login</span>
                </Button>
              </div>
            )}
          </div>
        ) : buyerSuccess ? (
          /* BUYER REGISTRATION SUCCESS */
          <div className="text-center py-6 space-y-5">
            <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 size={36} />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-slate-900">
                खरीदार पंजीकरण सफल! / Buyer Registration Successful!
              </h2>
              <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto">
                आपका खाता सक्रिय हो गया है और टोकन प्राप्त हो गया है।
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 text-xs sm:text-sm max-w-md mx-auto text-left">
              <p className="font-bold">कंपनी / नाम: {buyerSuccess.businessName || buyerSuccess.name}</p>
              <p className="text-blue-800">मोबाइल: {buyerSuccess.mobile} | भूमिका: खरीदार</p>
            </div>

            <div className="pt-4 flex justify-center gap-3">
              <Button variant="primary" size="md" onClick={onSwitchToLogin}>
                <span>जारी रखें / Continue</span>
              </Button>
            </div>
          </div>
        ) : (
          /* STANDARD REGISTRATION FORM */
          <>
            {/* Role Picker */}
            <div className="mb-6 border-b border-slate-100 pb-6">
              <RoleSelection
                selectedRole={role}
                onSelectRole={(r) => {
                  setRole(r)
                  setCurrentStep(1)
                  setErrorMsg('')
                }}
              />
            </div>

            {/* Step Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  चरण {currentStep} / {activeSteps.length}: {activeSteps[currentStep - 1]}
                </span>
                <span className="text-xs font-semibold text-slate-500">
                  {role === 'farmer' ? 'किसान पंजीकरण' : 'खरीदार पंजीकरण'}
                </span>
              </div>
              <div className="flex gap-1.5">
                {activeSteps.map((stepTitle, idx) => {
                  const stepNum = idx + 1
                  const isDone = stepNum < currentStep
                  const isCurrent = stepNum === currentStep
                  return (
                    <div
                      key={stepTitle}
                      className={`h-2 flex-1 rounded-full transition-all ${
                        isDone
                          ? 'bg-emerald-600'
                          : isCurrent
                          ? 'bg-emerald-400'
                          : 'bg-slate-200'
                      }`}
                      title={stepTitle}
                    />
                  )
                })}
              </div>
            </div>

            {/* Error Alert */}
            {errorMsg && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm font-semibold flex items-start gap-2.5">
                <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* ================= FARMER FORM STEPS ================= */}
              {role === 'farmer' && (
                <>
                  {currentStep === 1 && (
                    <div className="space-y-5">
                      <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
                        चरण 1: नाम, मोबाइल व OTP सत्यापन
                      </h3>

                      {/* Full Name */}
                      <div className="space-y-1.5">
                        <label htmlFor="reg-farmer-name" className="block text-sm font-bold text-slate-800">
                          पूरा नाम / Full Name <span className="text-emerald-600">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <User size={18} />
                          </div>
                          <input
                            id="reg-farmer-name"
                            type="text"
                            required
                            disabled={submitting}
                            value={farmerForm.name}
                            onChange={(e) => setFarmerForm({ ...farmerForm, name: e.target.value })}
                            placeholder="अपना पूरा नाम दर्ज करें"
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                          />
                        </div>
                      </div>

                      {/* Mobile & Send OTP */}
                      <div className="space-y-1.5">
                        <label htmlFor="reg-farmer-mobile" className="block text-sm font-bold text-slate-800">
                          मोबाइल नंबर / Mobile Number <span className="text-emerald-600">*</span>
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                              <Phone size={18} />
                            </div>
                            <input
                              id="reg-farmer-mobile"
                              type="tel"
                              required
                              readOnly={isMobileVerified}
                              disabled={submitting}
                              value={farmerForm.mobile}
                              onChange={(e) => setFarmerForm({ ...farmerForm, mobile: e.target.value })}
                              placeholder="10-अंकीय मोबाइल नंबर (उदा. 9876543210)"
                              className={`w-full pl-10 pr-4 py-3 border rounded-xl text-base text-slate-900 focus:ring-2 focus:ring-emerald-500 ${
                                isMobileVerified
                                  ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900'
                                  : 'bg-slate-50 border-slate-200'
                              }`}
                            />
                          </div>

                          {!isMobileVerified && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="md"
                              disabled={sendingOtp || cooldownSeconds > 0}
                              onClick={handleSendOtp}
                              className="shrink-0 text-sm font-bold min-w-[120px]"
                            >
                              {sendingOtp
                                ? 'भेजा जा रहा है...'
                                : cooldownSeconds > 0
                                ? `${cooldownSeconds}s प्रतीक्षा`
                                : otpSent
                                ? 'पुनः OTP भेजें'
                                : 'OTP भेजें'}
                            </Button>
                          )}
                        </div>

                        {isMobileVerified && (
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 mt-1">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            <span>मोबाइल नंबर OTP से सत्यापित हो चुका है / Mobile Verified</span>
                          </div>
                        )}
                      </div>

                      {/* Development OTP Display Badge */}
                      {devOtpHint && !isMobileVerified && (
                        <div className="p-3 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-950 text-xs sm:text-sm font-bold flex items-center gap-2">
                          <KeyRound size={18} className="text-amber-700 shrink-0" />
                          <span>Development Mode OTP: <code className="bg-amber-200 px-2 py-0.5 rounded text-base">{devOtpHint}</code> (Testing Only)</span>
                        </div>
                      )}

                      {/* Enter OTP Field (Shown if OTP sent & not yet verified) */}
                      {otpSent && !isMobileVerified && (
                        <div className="space-y-1.5 pt-2 border-t border-slate-100">
                          <label htmlFor="reg-farmer-otp" className="block text-sm font-bold text-slate-800">
                            6-अंकीय OTP दर्ज करें / Enter 6-Digit OTP <span className="text-emerald-600">*</span>
                          </label>
                          <div className="flex gap-2">
                            <input
                              id="reg-farmer-otp"
                              type="text"
                              maxLength={6}
                              value={farmerForm.otp}
                              onChange={(e) => setFarmerForm({ ...farmerForm, otp: e.target.value })}
                              placeholder="6-अंकीय OTP दर्ज करें"
                              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono tracking-widest text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                            />
                            <Button
                              type="button"
                              variant="primary"
                              size="md"
                              disabled={verifyingOtp || farmerForm.otp.length !== 6}
                              onClick={handleVerifyOtp}
                              className="shrink-0 text-sm font-bold"
                            >
                              {verifyingOtp ? 'जांच जारी...' : 'OTP सत्यापित करें'}
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Password Field */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-100">
                        <label htmlFor="reg-farmer-pass" className="block text-sm font-bold text-slate-800">
                          पासवर्ड / Password <span className="text-emerald-600">*</span>
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <Lock size={18} />
                          </div>
                          <input
                            id="reg-farmer-pass"
                            type="password"
                            required
                            disabled={submitting}
                            value={farmerForm.password}
                            onChange={(e) => setFarmerForm({ ...farmerForm, password: e.target.value })}
                            placeholder="कम से कम 6 अक्षर"
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
                        चरण 2: किसान पता व पसंदीदा भाषा
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label htmlFor="reg-farmer-state" className="block text-sm font-bold text-slate-800">
                            राज्य / State
                          </label>
                          <input
                            id="reg-farmer-state"
                            type="text"
                            disabled={submitting}
                            value={farmerForm.state}
                            onChange={(e) => setFarmerForm({ ...farmerForm, state: e.target.value })}
                            placeholder="राज्य"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="reg-farmer-district" className="block text-sm font-bold text-slate-800">
                            जिला / District
                          </label>
                          <input
                            id="reg-farmer-district"
                            type="text"
                            disabled={submitting}
                            value={farmerForm.district}
                            onChange={(e) => setFarmerForm({ ...farmerForm, district: e.target.value })}
                            placeholder="जिला"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="reg-farmer-village" className="block text-sm font-bold text-slate-800">
                          गांव / Village
                        </label>
                        <input
                          id="reg-farmer-village"
                          type="text"
                          disabled={submitting}
                          value={farmerForm.village}
                          onChange={(e) => setFarmerForm({ ...farmerForm, village: e.target.value })}
                          placeholder="गांव का नाम"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="reg-farmer-lang" className="block text-sm font-bold text-slate-800">
                          पसंदीदा भाषा / Preferred Language
                        </label>
                        <select
                          id="reg-farmer-lang"
                          disabled={submitting}
                          value={farmerForm.preferredLanguage}
                          onChange={(e) => setFarmerForm({ ...farmerForm, preferredLanguage: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        >
                          {INDIAN_LANGUAGES.map((lang) => (
                            <option key={lang} value={lang}>
                              {lang}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-4">
                      <div className="border-b border-slate-100 pb-2">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                          <ShieldCheck className="text-emerald-600" size={22} />
                          <span>किसान सत्यापन / Farmer Verification</span>
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          सुरक्षित व्यापार हेतु किसान पहचान दस्तावेज़ (UI Prototype)
                        </p>
                      </div>

                      <div className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 rounded-2xl p-6 text-center bg-slate-50/60 transition-colors cursor-pointer">
                        <input
                          id="farmer-doc-upload"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                        <label htmlFor="farmer-doc-upload" className="cursor-pointer flex flex-col items-center">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 ${farmerForm.documentFile ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                            {farmerForm.documentFile ? <CheckCircle2 size={24} /> : <Upload size={24} />}
                          </div>
                          <span className="text-base font-bold text-emerald-900">
                            {farmerForm.documentName || 'दस्तावेज़ चुनें / Choose Document'}
                          </span>
                          <span className="text-xs text-slate-500 mt-1">
                            समर्थित फ़ाइल: PDF, JPG, JPEG, PNG (अधिकतम 5MB)
                          </span>
                        </label>
                      </div>
                    </div>
                  )}

                  {currentStep === 4 && (
                    <div className="space-y-4 text-center py-2">
                      <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                        <ShieldCheck size={32} />
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-900">
                        सत्यापन हेतु जमा करने के लिए तैयार
                      </h3>
                      <p className="text-sm text-slate-600 max-w-md mx-auto">
                        पंजीकरण जमा करने के बाद आपका खाता सत्यापन समीक्षा में जाएगा।
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* ================= BUYER FORM STEPS ================= */}
              {role === 'buyer' && (
                <>
                  {currentStep === 1 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
                        चरण 1: खरीदार खाता विवरण
                      </h3>

                      <div className="space-y-1.5">
                        <label htmlFor="reg-buyer-name" className="block text-sm font-bold text-slate-800">
                          पूरा नाम / Full Name <span className="text-emerald-600">*</span>
                        </label>
                        <input
                          id="reg-buyer-name"
                          type="text"
                          required
                          disabled={submitting}
                          value={buyerForm.name}
                          onChange={(e) => setBuyerForm({ ...buyerForm, name: e.target.value })}
                          placeholder="खरीदार का नाम"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="reg-buyer-mobile" className="block text-sm font-bold text-slate-800">
                          मोबाइल नंबर / Mobile Number <span className="text-emerald-600">*</span>
                        </label>
                        <input
                          id="reg-buyer-mobile"
                          type="tel"
                          required
                          disabled={submitting}
                          value={buyerForm.mobile}
                          onChange={(e) => setBuyerForm({ ...buyerForm, mobile: e.target.value })}
                          placeholder="10-अंकीय मोबाइल नंबर"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label htmlFor="reg-buyer-pass" className="block text-sm font-bold text-slate-800">
                          पासवर्ड / Password <span className="text-emerald-600">*</span>
                        </label>
                        <input
                          id="reg-buyer-pass"
                          type="password"
                          required
                          disabled={submitting}
                          value={buyerForm.password}
                          onChange={(e) => setBuyerForm({ ...buyerForm, password: e.target.value })}
                          placeholder="कम से कम 6 अक्षर"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>
                    </div>
                  )}

                  {currentStep === 2 && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">
                        चरण 2: व्यवसाय विवरण
                      </h3>

                      <div className="space-y-1.5">
                        <label htmlFor="reg-buyer-biz" className="block text-sm font-bold text-slate-800">
                          व्यवसाय / फर्म का नाम (Business Name)
                        </label>
                        <input
                          id="reg-buyer-biz"
                          type="text"
                          disabled={submitting}
                          value={buyerForm.businessName}
                          onChange={(e) => setBuyerForm({ ...buyerForm, businessName: e.target.value })}
                          placeholder="फर्म का नाम"
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label htmlFor="reg-buyer-state" className="block text-sm font-bold text-slate-800">
                            राज्य / State
                          </label>
                          <input
                            id="reg-buyer-state"
                            type="text"
                            disabled={submitting}
                            value={buyerForm.state}
                            onChange={(e) => setBuyerForm({ ...buyerForm, state: e.target.value })}
                            placeholder="राज्य"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label htmlFor="reg-buyer-district" className="block text-sm font-bold text-slate-800">
                            जिला / District
                          </label>
                          <input
                            id="reg-buyer-district"
                            type="text"
                            disabled={submitting}
                            value={buyerForm.district}
                            onChange={(e) => setBuyerForm({ ...buyerForm, district: e.target.value })}
                            placeholder="जिला"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-base text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentStep === 3 && (
                    <div className="space-y-4 text-center py-2">
                      <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
                        <Building size={32} />
                      </div>
                      <h3 className="text-xl font-extrabold text-slate-900">
                        खाता बनाने के लिए तैयार
                      </h3>
                      <p className="text-sm text-slate-600 max-w-md mx-auto">
                        पंजीकरण पूर्ण होने पर टोकन प्राप्त होगा तथा खाता सक्रिय हो जाएगा।
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Form Navigation Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                {currentStep > 1 ? (
                  <Button type="button" variant="outline" size="md" disabled={submitting} onClick={handlePrev}>
                    <ArrowLeft size={18} />
                    <span>पीछे</span>
                  </Button>
                ) : <div />}

                {currentStep < activeSteps.length ? (
                  <Button type="button" variant="primary" size="md" disabled={submitting} onClick={handleNext}>
                    <span>आगे बढ़ें</span>
                    <ArrowRight size={18} />
                  </Button>
                ) : (
                  <Button type="submit" variant="primary" size="md" disabled={submitting}>
                    <CheckCircle2 size={18} />
                    <span>
                      {submitting
                        ? 'जमा हो रहा है... / Submitting...'
                        : role === 'farmer'
                        ? 'सत्यापन हेतु जमा करें'
                        : 'खाता बनाएं'}
                    </span>
                  </Button>
                )}
              </div>
            </form>

            {/* Switch to Login */}
            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-600 mb-2">
                पहले से खाता है? / Already registered?
              </p>
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-sm font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                लॉगिन पृष्ठ पर जाएं / Go to Login
              </button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
