import express from 'express'
import cors from 'cors'
import healthRoutes from './routes/health.routes.js'
import authRoutes from './routes/auth.routes.js'
import otpRoutes from './routes/otp.routes.js'
import verificationRoutes from './routes/verification.routes.js'
import adminVerificationRoutes from './routes/adminVerification.routes.js'
import adminStatsRoutes from './routes/adminStats.routes.js'
import cropRoutes from './routes/crop.routes.js'
import farmerProfileRoutes from './routes/farmerProfile.routes.js'
import buyerProfileRoutes from './routes/buyerProfile.routes.js'
import marketPriceRoutes from './routes/marketPrice.routes.js'
import marketHistoryRoutes from './routes/marketHistory.routes.js'
import weatherRoutes from './routes/weather.routes.js'
import predictionRoutes from './routes/prediction.routes.js'
import marketplaceRoutes from './routes/marketplace.routes.js'
import bookingRoutes     from './routes/booking.routes.js'
import reviewRoutes      from './routes/review.routes.js'
import notificationRoutes from './routes/notification.routes.js'
import deliveryRoutes     from './routes/delivery.routes.js'
import transactionRoutes  from './routes/transaction.routes.js'
import chatbotRoutes      from './routes/chatbot.routes.js'

const app = express()

// ── CORS ─────────────────────────────────────────────────────────────────────
// Restrict origins to CLIENT_URL in production; fall back to localhost for dev.
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173'
const allowedOrigins = [CLIENT_URL]
// Allow additional comma-separated origins via CLIENT_URL_EXTRA (optional)
if (process.env.CLIENT_URL_EXTRA) {
  process.env.CLIENT_URL_EXTRA.split(',').forEach((o) => {
    const trimmed = o.trim()
    if (trimmed) allowedOrigins.push(trimmed)
  })
}

app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server / curl requests (no origin header)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    return callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
}))

// ── Body parsing ──────────────────────────────────────────────────────────────
// Limit JSON body size to 1 MB to prevent large-payload DoS.
app.use(express.json({ limit: '1mb' }))
app.use(express.urlencoded({ extended: false, limit: '1mb' }))

// API Routes
app.use('/api', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/otp', otpRoutes)
app.use('/api/verification', verificationRoutes)
app.use('/api/admin/verification', adminVerificationRoutes)
app.use('/api/admin', adminStatsRoutes)
app.use('/api/farmer/crops', cropRoutes)
app.use('/api/farmer', farmerProfileRoutes)
app.use('/api/buyer', buyerProfileRoutes)
app.use('/api/market/prices', marketPriceRoutes)
app.use('/api/market/history', marketHistoryRoutes)
app.use('/api/weather', weatherRoutes)
app.use('/api/prediction', predictionRoutes)
app.use('/api/marketplace', marketplaceRoutes)
app.use('/api/marketplace', bookingRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/deliveries',    deliveryRoutes)
app.use('/api/transactions',  transactionRoutes)
app.use('/api/chatbot',       chatbotRoutes)

// 404 JSON Response Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
  })
})

// ── Global Error Handler ──────────────────────────────────────────────────────
// Catches errors forwarded via next(err) or thrown synchronously in middleware.
// Never exposes stack traces or internal details in production responses.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  // CORS errors get a clean 403 — no internal detail exposed
  if (err.message && err.message.startsWith('CORS:')) {
    return res.status(403).json({ success: false, message: 'Forbidden: cross-origin request not allowed' })
  }

  const isProduction = process.env.NODE_ENV === 'production'
  const statusCode = (typeof err.status === 'number' && err.status >= 400 && err.status < 600)
    ? err.status
    : 500

  console.error(`Global error handler [${statusCode}]:`, err?.message)

  return res.status(statusCode).json({
    success: false,
    message: isProduction
      ? 'An unexpected server error occurred. Please try again later.'
      : (err?.message || 'Internal Server Error'),
  })
})

export default app
