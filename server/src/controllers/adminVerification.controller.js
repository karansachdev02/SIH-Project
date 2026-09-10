import path from 'path'
import fs from 'fs'
import mongoose from 'mongoose'
import VerificationDocument from '../models/VerificationDocument.js'
import User from '../models/User.js'

/**
 * @desc    List farmer verification documents for admin review
 * @route   GET /api/admin/verification/documents
 * @access  Private (Admin only)
 */
export const listVerificationDocuments = async (req, res) => {
  try {
    const { status } = req.query

    // Build filter — if a valid status is supplied use it, else return all
    const VALID_STATUSES = ['pending', 'approved', 'rejected']
    const filter = {}
    if (status && VALID_STATUSES.includes(status)) {
      filter.status = status
    }

    const documents = await VerificationDocument.find(filter)
      .populate('user', 'name mobile state district village verificationStatus verificationDocumentStatus')
      .populate('reviewedBy', 'name')
      .sort({ uploadedAt: -1 }) // newest first; pending docs naturally surface when filtered
      .lean()

    // Shape the response — never expose storageKey / storedFileName / filesystem path
    const safeDocuments = documents.map((doc) => ({
      id: doc._id,
      documentType: doc.documentType,
      originalFileName: doc.originalFileName,
      mimeType: doc.mimeType,
      fileSize: doc.fileSize,
      status: doc.status,
      uploadedAt: doc.uploadedAt,
      reviewedAt: doc.reviewedAt,
      rejectionReason: doc.rejectionReason || '',
      reviewedBy: doc.reviewedBy ? { id: doc.reviewedBy._id, name: doc.reviewedBy.name } : null,
      farmer: doc.user
        ? {
            id: doc.user._id,
            name: doc.user.name,
            mobile: doc.user.mobile,
            state: doc.user.state,
            district: doc.user.district,
            village: doc.user.village,
            verificationStatus: doc.user.verificationStatus,
            verificationDocumentStatus: doc.user.verificationDocumentStatus,
          }
        : null,
    }))

    return res.status(200).json({
      success: true,
      count: safeDocuments.length,
      documents: safeDocuments,
    })
  } catch (error) {
    console.error('listVerificationDocuments error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error: Failed to fetch verification documents',
    })
  }
}

/**
 * @desc    Approve or reject a farmer verification document
 * @route   PATCH /api/admin/verification/documents/:id
 * @access  Private (Admin only)
 */
export const reviewVerificationDocument = async (req, res) => {
  try {
    const { id } = req.params

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document ID',
      })
    }

    const { status, rejectionReason } = req.body

    // status must be approved or rejected — pending is not a valid review outcome
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'status must be "approved" or "rejected"',
      })
    }

    // rejectionReason is required when rejecting
    if (status === 'rejected') {
      const trimmedReason = typeof rejectionReason === 'string' ? rejectionReason.trim() : ''
      if (!trimmedReason) {
        return res.status(400).json({
          success: false,
          message: 'rejectionReason is required and cannot be empty when rejecting a document',
        })
      }
    }

    const doc = await VerificationDocument.findById(id)
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Verification document not found',
      })
    }

    const farmer = await User.findById(doc.user)
    if (!farmer) {
      return res.status(404).json({
        success: false,
        message: 'Associated farmer user not found',
      })
    }

    const reviewedAt = new Date()
    const reviewedBy = req.user._id

    if (status === 'approved') {
      // Update document record
      doc.status = 'approved'
      doc.reviewedAt = reviewedAt
      doc.reviewedBy = reviewedBy
      doc.rejectionReason = ''
      await doc.save()

      // Update farmer user — verified and document approved
      await User.findByIdAndUpdate(farmer._id, {
        verificationStatus: 'verified',
        verificationDocumentStatus: 'approved',
      })

      return res.status(200).json({
        success: true,
        message: 'Farmer verification approved successfully',
        document: {
          id: doc._id,
          status: doc.status,
          reviewedAt: doc.reviewedAt,
        },
      })
    } else {
      // status === 'rejected'
      const trimmedReason = rejectionReason.trim()

      doc.status = 'rejected'
      doc.reviewedAt = reviewedAt
      doc.reviewedBy = reviewedBy
      doc.rejectionReason = trimmedReason
      await doc.save()

      // Update farmer user — rejected
      await User.findByIdAndUpdate(farmer._id, {
        verificationStatus: 'rejected',
        verificationDocumentStatus: 'rejected',
      })

      return res.status(200).json({
        success: true,
        message: 'Farmer verification rejected',
        document: {
          id: doc._id,
          status: doc.status,
          rejectionReason: doc.rejectionReason,
          reviewedAt: doc.reviewedAt,
        },
      })
    }
  } catch (error) {
    console.error('reviewVerificationDocument error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error: Failed to review verification document',
    })
  }
}

/**
 * @desc    Serve a verification document file — admin only, authorized access
 * @route   GET /api/admin/verification/documents/:id/file
 * @access  Private (Admin only)
 */
export const serveVerificationDocumentFile = async (req, res) => {
  try {
    const { id } = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document ID',
      })
    }

    const doc = await VerificationDocument.findById(id).lean()
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: 'Verification document not found',
      })
    }

    // storageKey is stored as a relative forward-slash path, e.g.
    // "uploads/farmer-verification/userId_timestamp_hex.pdf"
    // Resolve it safely from process.cwd() and prevent path traversal
    const storageKey = doc.storageKey

    // Normalise to POSIX, then check it stays inside uploads/farmer-verification
    const normalised = path.posix.normalize(storageKey)
    if (!normalised.startsWith('uploads/farmer-verification/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid document storage reference',
      })
    }

    const absolutePath = path.join(process.cwd(), normalised)

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({
        success: false,
        message: 'Document file not found on server',
      })
    }

    // Set Content-Type from stored mimeType (validated on upload to known-safe values)
    const SAFE_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
    const mimeType = SAFE_MIME_TYPES.includes(doc.mimeType) ? doc.mimeType : 'application/octet-stream'

    res.setHeader('Content-Type', mimeType)
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(doc.originalFileName)}"`
    )

    const fileStream = fs.createReadStream(absolutePath)
    fileStream.on('error', (streamErr) => {
      console.error('serveVerificationDocumentFile stream error:', streamErr.message)
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Failed to stream document file',
        })
      }
    })

    fileStream.pipe(res)
  } catch (error) {
    console.error('serveVerificationDocumentFile error:', error)
    return res.status(500).json({
      success: false,
      message: 'Server error: Failed to serve document file',
    })
  }
}
