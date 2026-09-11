import React, { useState, useCallback } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import Chatbot from './components/chatbot/Chatbot'
import MainLayout from './layouts/MainLayout'
import FarmerHome from './pages/farmer/FarmerHome'
import FarmerProfile from './pages/farmer/FarmerProfile'
import MyCrops from './pages/farmer/MyCrops'
import Prices from './pages/farmer/Prices'
import Weather from './pages/farmer/Weather'
import PricePrediction from './pages/farmer/PricePrediction'
import DeliveryManagement from './pages/farmer/DeliveryManagement'
import TransactionManagement from './pages/farmer/TransactionManagement'
import BuyerHome from './pages/buyer/BuyerHome'
import Marketplace from './pages/buyer/Marketplace'
import CropDetails from './pages/buyer/CropDetails'
import MyBookings from './pages/buyer/MyBookings'
import BookingConfirmation from './pages/buyer/BookingConfirmation'
import BuyerProfile from './pages/buyer/BuyerProfile'
import MyDeliveries from './pages/buyer/MyDeliveries'
import DeliveryTracking from './pages/buyer/DeliveryTracking'
import MyTransactions from './pages/buyer/MyTransactions'
import BookingRequests from './pages/farmer/BookingRequests'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import FarmerVerification from './pages/admin/FarmerVerification'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminUsers from './pages/admin/AdminUsers'
import Card from './components/common/Card'
import Button from './components/common/Button'
import { Home, LogIn, UserPlus, Clock, ShieldCheck, LogOut, ShoppingBag, User, Wheat, Bot } from 'lucide-react'
// Note: ShoppingBag kept for buyer-authenticated guard block

function AppContent() {
  const [currentView, setCurrentView] = useState('home')
  // viewParams carries extra data for views that need it (e.g. crop-details needs cropId)
  const [viewParams, setViewParams] = useState({})
  const { user, isAuthenticated, logout, pendingFarmer } = useAuth()

  // navigate(view) is a drop-in replacement for setCurrentView that also resets params.
  // navigate(view, params) sets params for views that need them (e.g. crop-details).
  // Existing code that calls setCurrentView directly still works unchanged.
  const navigate = useCallback((view, params = {}) => {
    setCurrentView(view)
    setViewParams(params)
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {/* Prototype Testing Toolbar (Developer/Testing Control) */}
      <div className="bg-emerald-950 text-emerald-100 text-xs py-2 px-4 flex items-center justify-between border-b border-emerald-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-emerald-300">KisanMitra Prototype:</span>
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

          {isAuthenticated && user?.role === 'admin' && (
            <>
              <button
                type="button"
                onClick={() => setCurrentView('admin-dashboard')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  currentView === 'admin-dashboard'
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-300 hover:bg-emerald-900'
                }`}
              >
                <User size={13} />
                <span>Dashboard</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('admin-verification')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  currentView === 'admin-verification'
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-300 hover:bg-emerald-900'
                }`}
              >
                <ShieldCheck size={13} />
                <span>Verification</span>
              </button>
              <button
                type="button"
                onClick={() => setCurrentView('admin-users')}
                className={`px-2 py-1 rounded-md text-[11px] font-semibold flex items-center gap-1 transition-colors ${
                  currentView === 'admin-users'
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-300 hover:bg-emerald-900'
                }`}
              >
                <User size={13} />
                <span>Users</span>
              </button>
            </>
          )}

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
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <FarmerHome user={user} onNavigate={setCurrentView} />
        </MainLayout>
      )}

      {currentView === 'login' && (
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <Login
            onSwitchToRegister={() => setCurrentView('register')}
            onSuccessLogin={(loggedInUser) => {
              if (loggedInUser.role === 'admin') {
                setCurrentView('admin-dashboard')
              } else if (loggedInUser.role === 'buyer') {
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
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <Register
            onSwitchToLogin={() => setCurrentView('login')}
            onFarmerRegistered={() => setCurrentView('farmer-pending')}
            onBuyerRegistered={() => setCurrentView('buyer-authenticated')}
          />
        </MainLayout>
      )}

      {/* Farmer Pending Verification View */}
      {currentView === 'farmer-pending' && (
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
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

      {/* Admin Dashboard View — only rendered when role is admin */}
      {currentView === 'admin-dashboard' && isAuthenticated && user?.role === 'admin' && (
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <AdminDashboard onNavigate={setCurrentView} />
        </MainLayout>
      )}

      {/* Guard: non-admin attempting admin dashboard */}
      {currentView === 'admin-dashboard' && (!isAuthenticated || user?.role !== 'admin') && (
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <ShieldCheck size={36} className="mx-auto text-rose-400" />
              <p className="font-bold text-slate-900">Access Denied</p>
              <p className="text-sm text-slate-600">Admin access required.</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('login')}>
                Go to Login
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Admin Verification View — only rendered when role is admin */}
      {currentView === 'admin-verification' && isAuthenticated && user?.role === 'admin' && (
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <FarmerVerification />
        </MainLayout>
      )}

      {/* Guard: non-admin attempting admin view */}
      {currentView === 'admin-verification' && (!isAuthenticated || user?.role !== 'admin') && (
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <ShieldCheck size={36} className="mx-auto text-rose-400" />
              <p className="font-bold text-slate-900">Access Denied</p>
              <p className="text-sm text-slate-600">Admin access required.</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('login')}>
                Go to Login
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Admin Users View — admin role only */}
      {currentView === 'admin-users' && isAuthenticated && user?.role === 'admin' && (
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <AdminUsers onNavigate={setCurrentView} />
        </MainLayout>
      )}

      {/* Guard: non-admin attempting admin-users */}
      {currentView === 'admin-users' && (!isAuthenticated || user?.role !== 'admin') && (
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <ShieldCheck size={36} className="mx-auto text-rose-400" />
              <p className="font-bold text-slate-900">Access Denied</p>
              <p className="text-sm text-slate-600">Admin access required.</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('login')}>
                Go to Login
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Farmer Profile View — farmer role only */}
      {currentView === 'profile' && isAuthenticated && user?.role === 'farmer' && (
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <FarmerProfile user={user} onNavigate={setCurrentView} />
        </MainLayout>
      )}

      {/* Guard: profile view for non-farmer authenticated users — redirect to their own profile */}
      {currentView === 'profile' && isAuthenticated && user?.role !== 'farmer' && (
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <User size={36} className="mx-auto text-slate-400" />
              <p className="font-bold text-slate-900">Farmer Access Required</p>
              <p className="text-sm text-slate-600">This profile view is for farmers only.</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('home')}>
                <Home size={18} />
                <span>Go Home</span>
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* My Crops View — authenticated farmers only */}
      {currentView === 'my-crops' && isAuthenticated && user?.role === 'farmer' && (
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <MyCrops user={user} onNavigate={setCurrentView} />
        </MainLayout>
      )}

      {/* Guard: my-crops attempted without farmer role */}
      {currentView === 'my-crops' && isAuthenticated && user?.role !== 'farmer' && (
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <Wheat size={36} className="mx-auto text-amber-400" />
              <p className="font-bold text-slate-900">Farmer Access Required</p>
              <p className="text-sm text-slate-600">Crop management is for farmers only.</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('home')}>
                <Home size={18} />
                <span>Go Home</span>
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Guard: my-crops attempted without authentication */}
      {currentView === 'my-crops' && !isAuthenticated && (
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <Wheat size={36} className="mx-auto text-amber-400" />
              <p className="font-bold text-slate-900">लॉगिन आवश्यक है / Login Required</p>
              <p className="text-sm text-slate-600">मेरी फसल देखने के लिए पहले लॉगिन करें।</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('login')}>
                <LogIn size={18} />
                <span>लॉगिन करें</span>
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Guard: profile attempted without authentication */}
      {currentView === 'profile' && !isAuthenticated && (
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <User size={36} className="mx-auto text-slate-400" />
              <p className="font-bold text-slate-900">लॉगिन आवश्यक है / Login Required</p>
              <p className="text-sm text-slate-600">प्रोफ़ाइल देखने के लिए पहले लॉगिन करें।</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('login')}>
                <LogIn size={18} />
                <span>लॉगिन करें</span>
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Weather View — public, no authentication required */}
      {currentView === 'weather' && (
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <Weather onNavigate={setCurrentView} />
        </MainLayout>
      )}

      {/* Price Prediction View — authenticated users only */}
      {currentView === 'price-prediction' && isAuthenticated && (
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <PricePrediction onNavigate={setCurrentView} />
        </MainLayout>
      )}

      {/* Guard: price-prediction attempted without authentication */}
      {currentView === 'price-prediction' && !isAuthenticated && (
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <Bot size={36} className="mx-auto text-violet-400" />
              <p className="font-bold text-slate-900">लॉगिन आवश्यक है / Login Required</p>
              <p className="text-sm text-slate-600">AI भाव भविष्यवाणी के लिए पहले लॉगिन करें।</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('login')}>
                <LogIn size={18} />
                <span>लॉगिन करें</span>
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Prices View — public, no authentication required */}
      {currentView === 'prices' && (
        <MainLayout activeTab={currentView} onNavigate={setCurrentView} user={user} isAuthenticated={isAuthenticated}>
          <Prices onNavigate={setCurrentView} />
        </MainLayout>
      )}

      {/* Buyer Dashboard — entry point after buyer login */}
      {currentView === 'buyer-authenticated' && isAuthenticated && user?.role === 'buyer' && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <BuyerHome user={user} onNavigate={navigate} />
        </MainLayout>
      )}

      {/* Guard: buyer-authenticated without buyer auth */}
      {currentView === 'buyer-authenticated' && (!isAuthenticated || user?.role !== 'buyer') && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <ShoppingBag size={36} className="mx-auto text-blue-400" />
              <p className="font-bold text-slate-900">Buyer Login Required</p>
              <p className="text-sm text-slate-600">Please log in as a buyer to access the dashboard.</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('login')}>
                <LogIn size={18} />
                <span>Log In</span>
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Marketplace View — buyer authenticated */}
      {currentView === 'marketplace' && isAuthenticated && user?.role === 'buyer' && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <Marketplace onNavigate={navigate} />
        </MainLayout>
      )}

      {/* Guard: non-buyer attempting marketplace */}
      {currentView === 'marketplace' && isAuthenticated && user?.role !== 'buyer' && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <ShoppingBag size={36} className="mx-auto text-slate-400" />
              <p className="font-bold text-slate-900">Buyer Access Required</p>
              <p className="text-sm text-slate-600">The marketplace is for registered buyers only.</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('home')}>
                <Home size={18} />
                <span>Go Home</span>
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Guard: marketplace without authentication */}
      {currentView === 'marketplace' && !isAuthenticated && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <ShoppingBag size={36} className="mx-auto text-blue-400" />
              <p className="font-bold text-slate-900">Login Required</p>
              <p className="text-sm text-slate-600">Please log in as a buyer to browse the marketplace.</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('login')}>
                <LogIn size={18} />
                <span>Log In</span>
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Crop Details View — buyer authenticated */}
      {currentView === 'crop-details' && isAuthenticated && user?.role === 'buyer' && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <CropDetails cropId={viewParams.cropId} onNavigate={navigate} />
        </MainLayout>
      )}

      {/* Guard: crop-details without buyer auth */}
      {currentView === 'crop-details' && (!isAuthenticated || user?.role !== 'buyer') && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <ShoppingBag size={36} className="mx-auto text-blue-400" />
              <p className="font-bold text-slate-900">Buyer Login Required</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('login')}>
                <LogIn size={18} />
                <span>Log In</span>
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* My Bookings — buyer authenticated */}
      {currentView === 'my-bookings' && isAuthenticated && user?.role === 'buyer' && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <MyBookings onNavigate={navigate} />
        </MainLayout>
      )}

      {/* Guard: my-bookings without buyer auth */}
      {currentView === 'my-bookings' && (!isAuthenticated || user?.role !== 'buyer') && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <ShoppingBag size={36} className="mx-auto text-blue-400" />
              <p className="font-bold text-slate-900">Buyer Login Required</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('login')}>
                <LogIn size={18} /><span>Log In</span>
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Booking Confirmation — buyer authenticated */}
      {currentView === 'booking-confirmation' && isAuthenticated && user?.role === 'buyer' && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <BookingConfirmation booking={viewParams.booking} onNavigate={navigate} />
        </MainLayout>
      )}

      {/* Guard: booking-confirmation without buyer auth */}
      {currentView === 'booking-confirmation' && (!isAuthenticated || user?.role !== 'buyer') && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <ShoppingBag size={36} className="mx-auto text-blue-400" />
              <p className="font-bold text-slate-900">Buyer Login Required</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('login')}>
                <LogIn size={18} /><span>Log In</span>
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Booking Requests — farmer authenticated */}
      {currentView === 'booking-requests' && isAuthenticated && user?.role === 'farmer' && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <BookingRequests onNavigate={navigate} />
        </MainLayout>
      )}

      {/* Guard: booking-requests without farmer auth */}
      {currentView === 'booking-requests' && (!isAuthenticated || user?.role !== 'farmer') && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <ShoppingBag size={36} className="mx-auto text-slate-400" />
              <p className="font-bold text-slate-900">Farmer Access Required</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('home')}>
                <Home size={18} /><span>Go Home</span>
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Buyer Profile — buyer authenticated */}
      {currentView === 'buyer-profile' && isAuthenticated && user?.role === 'buyer' && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <BuyerProfile user={user} onNavigate={navigate} />
        </MainLayout>
      )}

      {/* Guard: buyer-profile without buyer auth */}
      {currentView === 'buyer-profile' && (!isAuthenticated || user?.role !== 'buyer') && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <ShoppingBag size={36} className="mx-auto text-blue-400" />
              <p className="font-bold text-slate-900">Buyer Login Required</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('login')}>
                <LogIn size={18} /><span>Log In</span>
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Delivery Management — farmer only */}
      {currentView === 'delivery-management' && isAuthenticated && user?.role === 'farmer' && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <DeliveryManagement onNavigate={navigate} />
        </MainLayout>
      )}

      {/* Guard: delivery-management without farmer auth */}
      {currentView === 'delivery-management' && (!isAuthenticated || user?.role !== 'farmer') && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <ShoppingBag size={36} className="mx-auto text-slate-400" />
              <p className="font-bold text-slate-900">Farmer Access Required</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('home')}>
                <Home size={18} /><span>Go Home</span>
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Buyer Deliveries — buyer only */}
      {currentView === 'buyer-deliveries' && isAuthenticated && user?.role === 'buyer' && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <MyDeliveries onNavigate={navigate} />
        </MainLayout>
      )}

      {/* Guard: buyer-deliveries without buyer auth */}
      {currentView === 'buyer-deliveries' && (!isAuthenticated || user?.role !== 'buyer') && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <ShoppingBag size={36} className="mx-auto text-blue-400" />
              <p className="font-bold text-slate-900">Buyer Login Required</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('login')}>
                <LogIn size={18} /><span>Log In</span>
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Delivery Tracking — buyer or farmer owner */}
      {currentView === 'delivery-tracking' && isAuthenticated && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <DeliveryTracking deliveryId={viewParams.deliveryId} onNavigate={navigate} />
        </MainLayout>
      )}

      {/* Guard: delivery-tracking without auth */}
      {currentView === 'delivery-tracking' && !isAuthenticated && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <ShoppingBag size={36} className="mx-auto text-blue-400" />
              <p className="font-bold text-slate-900">Login Required</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('login')}>
                <LogIn size={18} /><span>Log In</span>
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Buyer Transactions — buyer only */}
      {currentView === 'buyer-transactions' && isAuthenticated && user?.role === 'buyer' && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <MyTransactions onNavigate={navigate} />
        </MainLayout>
      )}

      {/* Guard: buyer-transactions without buyer auth */}
      {currentView === 'buyer-transactions' && (!isAuthenticated || user?.role !== 'buyer') && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <ShoppingBag size={36} className="mx-auto text-blue-400" />
              <p className="font-bold text-slate-900">Buyer Login Required</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('login')}>
                <LogIn size={18} /><span>Log In</span>
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* Farmer Transactions — farmer only */}
      {currentView === 'farmer-transactions' && isAuthenticated && user?.role === 'farmer' && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <TransactionManagement onNavigate={navigate} />
        </MainLayout>
      )}

      {/* Guard: farmer-transactions without farmer auth */}
      {currentView === 'farmer-transactions' && (!isAuthenticated || user?.role !== 'farmer') && (
        <MainLayout activeTab={currentView} onNavigate={navigate} user={user} isAuthenticated={isAuthenticated}>
          <div className="max-w-lg mx-auto py-8">
            <Card className="text-center p-8 space-y-4">
              <ShoppingBag size={36} className="mx-auto text-slate-400" />
              <p className="font-bold text-slate-900">Farmer Access Required</p>
              <Button variant="primary" size="md" onClick={() => setCurrentView('home')}>
                <Home size={18} /><span>Go Home</span>
              </Button>
            </Card>
          </div>
        </MainLayout>
      )}

      {/* ── Global Floating Chatbot ────────────────────────────────────────── */}
      {/* Rendered outside MainLayout so it floats above all views.            */}
      {/* Only visible when authenticated (Chatbot component guards internally). */}
      <Chatbot user={user} isAuthenticated={isAuthenticated} />
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