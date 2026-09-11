import express from 'express'
import { protect, authorizeRoles } from '../middleware/auth.middleware.js'
import {
  getBuyerTransactions,
  getFarmerTransactions,
  getTransaction,
  updatePayment,
  refundTransaction,
} from '../controllers/transaction.controller.js'

const router = express.Router()

// All transaction endpoints require authentication
router.use(protect)

// GET /api/transactions/buyer   — buyer only: list transactions for authenticated buyer
router.get('/buyer',  authorizeRoles('buyer'),  getBuyerTransactions)

// GET /api/transactions/farmer  — farmer only: list transactions for authenticated farmer
router.get('/farmer', authorizeRoles('farmer'), getFarmerTransactions)

// GET /api/transactions/:id     — buyer or farmer owner only (ownership checked in controller)
router.get('/:id', getTransaction)

// PATCH /api/transactions/:id/payment — buyer only: update payment status
router.patch('/:id/payment', authorizeRoles('buyer'),  updatePayment)

// PATCH /api/transactions/:id/refund  — farmer only: refund a paid transaction
router.patch('/:id/refund',  authorizeRoles('farmer'), refundTransaction)

export default router
