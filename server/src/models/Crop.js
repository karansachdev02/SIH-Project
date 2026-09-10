import mongoose from 'mongoose'

/**
 * Crop Model for Smart Mandi.
 * Represents a crop listing created by a verified farmer.
 * Designed to be future-compatible with marketplace, pre-booking,
 * and transport features — without implementing those yet.
 */
const cropSchema = new mongoose.Schema(
  {
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'किसान संदर्भ आवश्यक है / Farmer reference is required'],
      index: true,
    },

    cropName: {
      type: String,
      required: [true, 'फसल का नाम आवश्यक है / Crop name is required'],
      trim: true,
    },

    cropType: {
      type: String,
      trim: true,
      default: '',
    },

    quantity: {
      type: Number,
      required: [true, 'मात्रा आवश्यक है / Quantity is required'],
      min: [0, 'मात्रा शून्य या अधिक होनी चाहिए / Quantity must be 0 or greater'],
    },

    quantityUnit: {
      type: String,
      required: [true, 'मात्रा इकाई आवश्यक है / Quantity unit is required'],
      default: 'quintal',
      trim: true,
    },

    expectedPrice: {
      type: Number,
      min: [0, 'अपेक्षित मूल्य शून्य या अधिक होना चाहिए / Expected price must be 0 or greater'],
      default: null,
    },

    location: {
      type: String,
      trim: true,
      default: '',
    },

    description: {
      type: String,
      trim: true,
      default: '',
    },

    harvestDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: {
        values: ['available', 'sold', 'inactive'],
        message: 'अमान्य स्थिति / Invalid status',
      },
      default: 'available',
    },
  },
  {
    timestamps: true,
  }
)

const Crop = mongoose.model('Crop', cropSchema)

export default Crop
