const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  vehicleNumber: {
    type: String,
    required: [true, 'Vehicle registration number is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  vehicleType: {
    type: String,
    enum: ['bike', 'van', 'truck'],
    required: [true, 'Vehicle type is required']
  },
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'electric'],
    required: [true, 'Fuel type is required']
  },
  mileage: {
    // km per litre (or km per charge unit for electric)
    type: Number,
    required: [true, 'Mileage is required'],
    min: 1
  },
  fuelTankCapacity: {
    // litres (use 0 for electric)
    type: Number,
    default: 40
  },
  loadCapacity: {
    // in kilograms
    type: Number,
    required: [true, 'Load capacity is required']
  },
  currentLatitude: {
    type: Number,
    default: 18.5204
  },
  currentLongitude: {
    type: Number,
    default: 73.8567
  },
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  availability: {
    type: String,
    enum: ['available', 'in_use', 'maintenance'],
    default: 'available'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Vehicle', vehicleSchema);
