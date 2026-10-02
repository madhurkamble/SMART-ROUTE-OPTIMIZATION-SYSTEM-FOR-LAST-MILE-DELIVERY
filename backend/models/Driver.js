const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Driver name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Driver phone is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Driver email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    unique: true,
    trim: true
  },
  assignedVehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    default: null
  },
  availability: {
    type: String,
    enum: ['available', 'on_duty', 'off_duty'],
    default: 'available'
  },
  currentLatitude: {
    type: Number,
    default: 18.5204  // Default: Pune city center
  },
  currentLongitude: {
    type: Number,
    default: 73.8567
  },
  completedDeliveries: {
    type: Number,
    default: 0
  },
  failedDeliveries: {
    type: Number,
    default: 0
  },
  onTimeDeliveries: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Driver', driverSchema);
