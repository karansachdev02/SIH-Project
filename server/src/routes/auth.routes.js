import express from 'express'
import {
  registerFarmer,
  registerBuyer,
  loginUser,
} from '../controllers/auth.controller.js'

const router = express.Router()

// Public authentication routes
router.post('/register/farmer', registerFarmer)
router.post('/register/buyer', registerBuyer)
router.post('/login', loginUser)

export default router
