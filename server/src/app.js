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

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

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

// 404 JSON Response Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
  })
})

export default app
