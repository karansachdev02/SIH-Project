import multer from 'multer'
import path from 'path'
import crypto from 'crypto'
import fs from 'fs'

const uploadDir = path.join(process.cwd(), 'uploads', 'farmer-verification')

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const userId = req.user?._id?.toString() || 'anonymous'
    const timestamp = Date.now()
    const randomHex = crypto.randomBytes(4).toString('hex')
    const ext = path.extname(file.originalname).toLowerCase()
    const safeFilename = `${userId}_${timestamp}_${randomHex}${ext}`
    cb(null, safeFilename)
  },
})

// File Type Filter
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
  const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png']
  const ext = path.extname(file.originalname).toLowerCase()

  if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
    cb(null, true)
  } else {
    cb(
      new Error(
        'अमान्य फ़ाइल प्रकार! केवल PDF, JPG, JPEG, और PNG फ़ाइलें समर्थित हैं। / Invalid file type! Only PDF, JPG, JPEG, and PNG files are allowed.'
      ),
      false
    )
  }
}

// Multer Instance with 5MB Limit
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
})

/**
 * Single Document Upload Middleware wrapper with error handling.
 */
export const uploadSingleDocument = (req, res, next) => {
  const singleUpload = upload.single('document')

  singleUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'फ़ाइल का आकार 5MB से अधिक नहीं होना चाहिए / File size must not exceed 5MB',
        })
      }
      return res.status(400).json({
        success: false,
        message: `फ़ाइल अपलोड त्रुटि: ${err.message}`,
      })
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'फ़ाइल अपलोड विफल / File upload failed',
      })
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'कृपया एक फ़ाइल चुनें / Please select a file to upload',
      })
    }

    next()
  })
}

export default uploadSingleDocument
