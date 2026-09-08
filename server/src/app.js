import express from 'express'
import cors from 'cors'
import healthRoutes from './routes/health.routes.js'
import authRoutes from './routes/auth.routes.js'
import otpRoutes from './routes/otp.routes.js'

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// API Routes
app.use('/api', healthRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/otp', otpRoutes)

// 404 JSON Response Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found',
  })
})

export default app
