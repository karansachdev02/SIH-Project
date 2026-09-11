import mongoose from 'mongoose'

/**
 * VerificationDocument Schema for KisanMitra Farmer Verification.
 * Stores controlled document metadata without exposing sensitive numbers or files.
 */
const verificationDocumentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: ['farmer_id', 'land_record', 'kisan_credit_card', 'other'],
      default: 'farmer_id',
    },
    originalFileName: {
      type: String,
      required: true,
    },
    storedFileName: {
      type: String,
      required: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    storageProvider: {
      type: String,
      enum: ['local', 's3', 'gcs'],
      default: 'local',
    },
    storageKey: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

const VerificationDocument = mongoose.model('VerificationDocument', verificationDocumentSchema)

export default VerificationDocument
