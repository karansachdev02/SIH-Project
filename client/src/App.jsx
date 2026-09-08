import React, { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import MainLayout from './layouts/MainLayout'
import FarmerHome from './pages/farmer/FarmerHome'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Card from './components/common/Card'
import Button from './components/common/Button'
import { Home, LogIn, UserPlus, Clock, ShieldCheck, LogOut, ShoppingBag, User } from 'lucide-react'

function AppContent() {
  const [currentView, setCurrentView] = useState('home')
  const { user, isAuthenticated, logout, pendingFarmer } = useAuth()

  return (
    <div className="min-h-screen flex flex-col">
      {/* Prototype Testing Toolbar (Developer/Testing Control) */}
      <div className="bg-emerald-950 text-emerald-100 text-xs py-2 px-4 flex items-center justify-between border-b border-emerald-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-emerald-300">Smart Mandi Prototype:</span>
          {isAuthenticated ? (
            <span className="px-2 py-0.5 rounded-full bg-emerald-800 text-emerald-100 text-[11px]">
              Logged in as: {user?.name} ({user?.role})
            </span>
          ) : pendingFarmer ? (
            <span className="px-2 py-0.5 rounded-full bg-amber-900/80 text-amber-200 text-[11px]">
              Pending Farmer: {pendingFarmer.user?.name || pendingFarmer.name}
            </span>
          ) : (
            <span className="text-emerald-400 text-[11px]">Visitor Mode</span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCurrentView('home')}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
              currentView === 'home'
                ? 'bg-emerald-700 text-white'
                : 'text-emerald-300 hover:bg-emerald-900'
            }`}
          >
            <Home size={13} />
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('login')}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
              currentView === 'login'
                ? 'bg-emerald-700 text-white'
                : 'text-emerald-300 hover:bg-emerald-900'
            }`}
          >
            <LogIn size={13} />
            <span>Login</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('register')}
            className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
              currentView === 'register'
                ? 'bg-emerald-700 text-white'
                : 'text-emerald-300 hover:bg-emerald-900'
            }`}
          >
            <UserPlus size={13} />
            <span>Register</span>
          </button>

          {isAuthenticated && (
            <button
              type="button"
              onClick={logout}
              className="px-2 py-1 rounded-md text-[11px] font-semibold text-rose-300 hover:bg-rose-950 flex items-center gap-1"
            >
              <LogOut size={13} />
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>

      {/* Main View Renderer */}
      {currentView === 'home' && (
        <MainLayout>
          <FarmerHome />
        </MainLayout>
      )}

      {currentView === 'login' && (
        <MainLayout>
          <Login
            onSwitchToRegister={() => setCurrentView('register')}
            onSuccessLogin={(loggedInUser) => {
              if (loggedInUser.role === 'buyer') {
                setCurrentView('buyer-authenticated')
              } else if (loggedInUser.role === 'farmer') {
                setCurrentView('home')
              }
            }}
            onPendingFarmer={() => setCurrentView('farmer-pending')}
          />
        </MainLayout>
      )}

      {currentView === 'register' && (
        <MainLayout>
          <Register
            onSwitchToLogin={() => setCurrentView('login')}
            onFarmerRegistered={() => setCurrentView('farmer-pending')}
            onBuyerRegistered={() => setCurrentView('buyer-authenticated')}
          />
        </MainLayout>
      )}

      {/* Farmer Pending Verification View */}
      {currentView === 'farmer-pending' && (
        <MainLayout>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-6">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto shadow-sm">
                <Clock size={36} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-slate-900">
                  आपका खाता अभी सत्यापन के लिए लंबित है
                </h2>
                <p className="text-sm text-slate-600 font-medium">
                  सत्यापन पूरा होने के बाद आप लॉगिन कर सकेंगे
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm text-left space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <ShieldCheck size={18} className="text-amber-700" />
                  <span>स्थिति: किसान सत्यापन समीक्षा (Pending Admin Review)</span>
                </p>
                <p className="text-amber-800">
                  सत्यापन प्रक्रिया सुरक्षा व पारदर्शिता हेतु आवश्यक है।
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <Button variant="outline" size="md" onClick={() => setCurrentView('home')}>
                  <Home size={18} />
                  <span>होम पर जाएं</span>
                </Button>
                <Button variant="primary" size="md" onClick={() => setCurrentView('login')}>
                  <LogIn size={18} />
                  <span>लॉगिन पर जाएं</span>
                </Button>
              </div>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Buyer Authenticated Placeholder View */}
      {currentView === 'buyer-authenticated' && (
        <MainLayout>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-6">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto shadow-sm">
                <ShoppingBag size={36} />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-extrabold text-slate-900">
                  खरीदार डैशबोर्ड (Buyer Portal)
                </h2>
                <p className="text-sm text-slate-600 font-medium">
                  आप सफलतापूर्वक लॉगिन हैं (Authenticated as Buyer)
                </p>
              </div>

              {user && (
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 text-xs sm:text-sm text-left">
                  <p className="font-bold flex items-center gap-1.5">
                    <User size={16} />
                    <span>नाम: {user.name}</span>
                  </p>
                  <p className="text-blue-800 mt-1">
                    मोबाइल: <strong>{user.mobile}</strong> | भूमिका: <strong>{user.role}</strong>
                  </p>
                </div>
              )}

              <div className="pt-2 flex justify-center gap-3">
                <Button variant="outline" size="md" onClick={() => setCurrentView('home')}>
                  <Home size={18} />
                  <span>होम देखें</span>
                </Button>
                <Button variant="secondary" size="md" onClick={logout}>
                  <LogOut size={18} />
                  <span>लॉगआउट</span>
                </Button>
              </div>
            </Card>
          </div>
        </MainLayout>
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}