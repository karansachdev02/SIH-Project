import path from 'path'
import fs from 'fs'
import VerificationDocument from '../models/VerificationDocument.js'
import User from '../models/User.js'

/**
 * @desc    Upload Farmer Verification Document
 * @route   POST /api/verification/farmer/document
 * @access  Private (Farmer only via Verification Session Token)
 */
export const uploadFarmerDocument = async (req, res) => {
  try {
    const userId = req.user._id
    const file = req.file
    const documentType = req.body.documentType || 'farmer_id'

    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'कृपया एक फ़ाइल चुनें / Please select a file',
      })
    }

    // Duplicate Document Handling: Replace any existing pending document for this farmer
    const existingPendingDoc = await VerificationDocument.findOne({
      user: userId,
      status: 'pending',
    })

    if (existingPendingDoc) {
      // Safely remove previous file from local disk to prevent orphan files
      try {
        const oldFilePath = path.join(process.cwd(), existingPendingDoc.storageKey)
        if (fs.existsSync(oldFilePath)) {
          fs.unlinkSync(oldFilePath)
        }
      } catch (unlinkErr) {
        console.warn('Warning: Old document file unlink failed:', unlinkErr.message)
      }

      // Remove previous metadata record
      await VerificationDocument.deleteOne({ _id: existingPendingDoc._id })
    }

    const relativeStorageKey = path.join('uploads', 'farmer-verification', file.filename).replace(/\\/g, '/')

    // Save metadata record to MongoDB
    const doc = await VerificationDocument.create({
      user: userId,
      documentType,
      originalFileName: file.originalname,
      storedFileName: file.filename,
      mimeType: file.mimetype,
      fileSize: file.size,
      storageProvider: 'local',
      storageKey: relativeStorageKey,
      status: 'pending',
      uploadedAt: new Date(),
    })

    // Update Farmer User record: document submitted, verificationStatus remains pending
    await User.findByIdAndUpdate(userId, {
      verificationDocumentStatus: 'submitted',
    })

    return res.status(201).json({
      success: true,
      message: 'दस्तावेज़ सत्यापन के लिए सफलतापूर्वक जमा कर दिया गया है / Document submitted for verification successfully',
      document: {
        id: doc._id,
        documentType: doc.documentType,
        status: doc.status,
        originalFileName: doc.originalFileName,
        uploadedAt: doc.uploadedAt,
      },
    })
  } catch (error) {
    console.error('uploadFarmerDocument error:', error)
    return res.status(500).json({
      success: false,
      message: 'सर्वर त्रुटि: दस्तावेज़ अपलोड विफल / Server error: Document upload failed',
    })
  }
}
