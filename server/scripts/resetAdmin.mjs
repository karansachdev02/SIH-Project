/**
 * KisanMitra — Admin Password Reset Script
 *
 * Resets the password for the existing admin user identified by ADMIN_MOBILE.
 * Safe to run multiple times — only updates the password field of the existing
 * admin. Never creates a duplicate. Never prints the password or its hash.
 *
 * Required environment variables (in server/.env or set inline):
 *   MONGODB_URI      — MongoDB connection string
 *   ADMIN_MOBILE     — 10-digit mobile of the admin to reset (e.g. 9000000001)
 *   ADMIN_PASSWORD   — New plain-text password (min 6 chars); will be hashed
 *
 * Usage:
 *   ADMIN_PASSWORD=yourpassword npm run reset:admin
 *   OR: set ADMIN_PASSWORD=yourpassword in server/.env, then: npm run reset:admin
 */

import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

// ─── 1. Validate required environment variables ───────────────────────────────

const MONGODB_URI    = process.env.MONGODB_URI
const ADMIN_MOBILE   = process.env.ADMIN_MOBILE
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in server/.env')
  process.exit(1)
}

if (!ADMIN_MOBILE) {
  console.error('❌ ADMIN_MOBILE is not set. Add ADMIN_MOBILE=9000000001 to server/.env')
  process.exit(1)
}

if (!ADMIN_PASSWORD) {
  console.error('❌ ADMIN_PASSWORD is not set. Set it in server/.env or prefix the command:')
  console.error('   ADMIN_PASSWORD=yourpassword npm run reset:admin')
  process.exit(1)
}

if (!/^[6-9]\d{9}$/.test(ADMIN_MOBILE)) {
  console.error('❌ ADMIN_MOBILE must be a valid 10-digit Indian mobile number (starting 6–9).')
  process.exit(1)
}

if (ADMIN_PASSWORD.length < 6) {
  console.error('❌ ADMIN_PASSWORD must be at least 6 characters.')
  process.exit(1)
}

// ─── 2. Connect to MongoDB ────────────────────────────────────────────────────

console.log('⏳ Connecting to MongoDB…')
try {
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
  console.log('✅ MongoDB connected')
} catch (err) {
  console.error('❌ MongoDB connection failed:', err.message)
  process.exit(1)
}

// ─── 3. Minimal inline schema (mirrors User.js; password select:false) ────────

const userSchema = new mongoose.Schema(
  {
    name:               { type: String, required: true, trim: true },
    mobile:             { type: String, required: true, unique: true, trim: true },
    password:           { type: String, required: true, select: false },
    role:               { type: String, enum: ['farmer', 'buyer', 'admin'], required: true },
    verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    verificationDocumentStatus: { type: String, default: 'none' },
    preferredLanguage:  { type: String, default: 'hi' },
    state:              { type: String, default: '' },
    district:           { type: String, default: '' },
    village:            { type: String, default: '' },
    businessName:       { type: String, default: '' },
    businessType:       { type: String, default: '' },
  },
  { timestamps: true }
)

const User = mongoose.models.User || mongoose.model('User', userSchema)

// ─── 4. Find the existing admin — must exist and have role=admin ──────────────

const admin = await User.findOne({ mobile: ADMIN_MOBILE }).select('+password')

if (!admin) {
  console.error(`❌ No user found with mobile ${ADMIN_MOBILE}. Run 'npm run create:admin' first.`)
  await mongoose.disconnect()
  process.exit(1)
}

if (admin.role !== 'admin') {
  console.error(`❌ User ${ADMIN_MOBILE} exists but has role '${admin.role}', not 'admin'. Aborting.`)
  await mongoose.disconnect()
  process.exit(1)
}

console.log(`✅ Found admin user — Name: ${admin.name}, Mobile: ${admin.mobile}, Role: ${admin.role}`)

// ─── 5. Hash new password — same method as registration ──────────────────────

const salt = await bcrypt.genSalt(10)
const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt)

// ─── 6. Update ONLY the password field; preserve all other fields ─────────────

await User.updateOne(
  { _id: admin._id, role: 'admin' },           // double-check role in filter
  { $set: { password: hashedPassword } }
)

console.log('✅ Admin password reset successfully')
console.log('   Mobile:', admin.mobile)
console.log('   Role  :', admin.role)
console.log('   Status:', admin.verificationStatus)

// ─── 7. Close connection cleanly ─────────────────────────────────────────────

await mongoose.disconnect()
console.log('🔌 MongoDB disconnected. Done.')
process.exit(0)
