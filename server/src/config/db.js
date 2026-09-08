import mongoose from 'mongoose'

/**
 * Connect to MongoDB instance using Mongoose.
 * Provides safe error handling without blocking HTTP server startup or causing uncontrolled crashes.
 */
const connectDB = async () => {
  const uri = process.env.MONGODB_URI

  if (!uri) {
    console.warn('⚠️ MONGODB_URI is not set in environment variables.')
    return false
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 3000,
    })
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
    return true
  } catch (error) {
    console.warn(`⚠️ MongoDB Connection Status: Unconnected (${error.message})`)
    console.log('ℹ️ Server is running. MongoDB connection will be established once MONGODB_URI/database is available.')
    return false
  }
}

export default connectDB
