import express from 'express'
import {
  listVerificationDocuments,
  reviewVerificationDocument,
  serveVerificationDocumentFile,
} from '../controllers/adminVerification.controller.js'
import { protect, authorizeRoles } from '../middleware/auth.middleware.js'

const router = express.Router()

// Every route in this file requires a normal authenticated admin token.
// The verificationAuth.middleware is NOT used here.
router.use(protect)
router.use(authorizeRoles('admin'))

// GET  /api/admin/verification/documents          — list documents (filter by ?status=pending|approved|rejected)
router.get('/documents', listVerificationDocuments)

// PATCH /api/admin/verification/documents/:id     — approve or reject a document
router.patch('/documents/:id', reviewVerificationDocument)

// GET  /api/admin/verification/documents/:id/file — serve the actual document file (admin-authenticated only)
router.get('/documents/:id/file', serveVerificationDocumentFile)

export default router
