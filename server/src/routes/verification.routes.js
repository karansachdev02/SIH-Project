import express from 'express'
import { uploadFarmerDocument } from '../controllers/verification.controller.js'
import { verifyVerificationSession } from '../middleware/verificationAuth.middleware.js'
import { uploadSingleDocument } from '../middleware/upload.middleware.js'

const router = express.Router()

router.post(
  '/farmer/document',
  verifyVerificationSession,
  uploadSingleDocument,
  uploadFarmerDocument
)

export default router
