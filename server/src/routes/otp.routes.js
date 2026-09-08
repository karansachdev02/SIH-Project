import express from 'express'
import {
  sendFarmerRegistrationOtp,
  verifyFarmerRegistrationOtp,
} from '../controllers/otp.controller.js'

const router = express.Router()

router.post('/send/farmer-registration', sendFarmerRegistrationOtp)
router.post('/verify/farmer-registration', verifyFarmerRegistrationOtp)

export default router
