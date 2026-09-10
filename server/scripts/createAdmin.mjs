/**
 * Smart Mandi — Admin User Seed Script
 *
 * Creates an admin user in MongoDB for use with the Farmer Verification panel.
 * Uses the same bcrypt hashing as normal user registration (genSalt(10) + hash).
 *
 * Required environment variables:
 *   MONGODB_URI      — MongoDB connection string
 *   ADMIN_MOBILE     — 10-digit Indian mobile number (6–9 prefix)
 *   ADMIN_PASSWORD   — Plain-text password (min 6 chars); will be hashed, never stored/logged
 *
 * Optional:
 *   ADMIN_NAME       — Display name (default: "Admin")
 *
 * Usage:
 *   node scripts/createAdmin.mjs
 *   OR via package script:
 *   npm run create:admin
 *
 * Security:
 *   — MONGODB_URI, ADMIN_PASSWORD, and JWT_SECRET are NEVER printed to stdout/stderr.
 *   — The script exits with code 1 on any configuration or database error.
 *   — If an admin with the given mobile already exists, the script aborts without modification.
 */

import dotenv from 'dotenv'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env from the server root (one directory up from scripts/)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

// ─── 1. Validate required environment variables ───────────────────────────────

const MONGODB_URI = process.env.MONGODB_URI
const ADMIN_MOBILE = process.env.ADMIN_MOBILE
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin'

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set. Add it to server/.env')
  process.exit(1)
}

if (!ADMIN_MOBILE) {
  console.error('❌ ADMIN_MOBILE is not set. Add it to server/.env  (e.g. ADMIN_MOBILE=9000000001)')
  process.exit(1)
}

if (!ADMIN_PASSWORD) {
  console.error('❌ ADMIN_PASSWORD is not set. Add it to server/.env')
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
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 })
  console.log('✅ MongoDB connected')
} catch (err) {
  console.error('❌ MongoDB connection failed:', err.message)
  process.exit(1)
}

// ─── 3. Load User model (inline to avoid importing app-level side effects) ───

// Mirrors User.js exactly — same schema, same password select: false
const userSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true, trim: true },
    mobile:   { type: String, required: true, unique: true, trim: true,
                match: [/^[6-9]\d{9}$/, 'Invalid mobile'] },
    password: { type: String, required: true, minlength: 6, select: false },
    role:     { type: String, enum: ['farmer', 'buyer', 'admin'], required: true },
    preferredLanguage:        { type: String, default: 'hi' },
    state:                    { type: String, trim: true, default: '' },
    district:                 { type: String, trim: true, default: '' },
    village:                  { type: String, trim: true, default: '' },
    verificationStatus:       { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
    verificationDocumentStatus: { type: String, enum: ['none', 'submitted', 'approved', 'rejected'], default: 'none' },
    businessName:             { type: String, trim: true, default: '' },
    businessType:             { type: String, trim: true, default: '' },
  },
  { timestamps: true }
)

// Reuse existing model if already registered (safe in case of re-runs in same process)
const User = mongoose.models.User || mongoose.model('User', userSchema)

// ─── 4. Check for existing admin with this mobile ────────────────────────────

const existing = await User.findOne({ mobile: ADMIN_MOBILE })
if (existing) {
  console.error(
    `❌ A user with mobile ${ADMIN_MOBILE} already exists (role: ${existing.role}).`,
    'No changes were made.'
  )
  await mongoose.disconnect()
  process.exit(1)
}

// ─── 5. Hash password — identical method to registerFarmer / registerBuyer ───

const salt = await bcrypt.genSalt(10)
const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, salt)

// ─── 6. Create admin user ─────────────────────────────────────────────────────

try {
  const admin = await User.create({
    name: ADMIN_NAME,
    mobile: ADMIN_MOBILE,
    password: hashedPassword,
    role: 'admin',
    verificationStatus: 'verified',
    verificationDocumentStatus: 'none',
    preferredLanguage: 'hi',
    state: '',
    district: '',
    village: '',
    businessName: '',
    businessType: '',
  })

  // Confirm only safe fields — never print password or URI
  console.log('✅ Admin user created successfully')
  console.log('   Name  :', admin.name)
  console.log('   Mobile:', admin.mobile)
  console.log('   Role  :', admin.role)
  console.log('   Status:', admin.verificationStatus)
  console.log('   ID    :', admin._id.toString())
} catch (err) {
  console.error('❌ Failed to create admin user:', err.message)
  await mongoose.disconnect()
  process.exit(1)
}

// ─── 7. Close connection cleanly ─────────────────────────────────────────────

await mongoose.disconnect()
console.log('🔌 MongoDB disconnected. Done.')
process.exit(0)
