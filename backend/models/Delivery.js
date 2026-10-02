const mongoose = require('mongoose');

const deliverySchema = new mongoose.Schema({
  orderId: {
    type: String,
    unique: true,
    default: function () {
      // Auto-generate like DEL-1001, DEL-1002 ...
      return 'DEL-' + Math.floor(1000 + Math.random() * 9000);
    }
  },
  customerName: {
    type: String,
    required: [true, 'Customer name is required'],
    trim: true
  },
  customerPhone: {
    type: String,
    required: [true, 'Customer phone is required'],
    trim: true
  },
  deliveryAddress: {
    type: String,
    required: [true, 'Delivery address is required'],
    trim: true
  },
  latitude: {
    type: Number,
    required: [true, 'Latitude is required']
  },
  longitude: {
    type: Number,
    required: [true, 'Longitude is required']
  },
  priority: {
    type: String,
    enum: ['urgent', 'standard'],
    default: 'standard'
  },
  timeWindowStart: {
    type: String,
    default: '09:00'
  },
  timeWindowEnd: {
    type: String,
    default: '18:00'
  },
  packageWeight: {
    type: Number,  // in kilograms
    default: 1
  },
  packageSize: {
    type: String,
    enum: ['small', 'medium', 'large'],
    default: 'small'
  },
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    default: null
  },
  assignedVehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    default: null
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'out_for_delivery', 'completed', 'failed'],
    default: 'pending'
  },
  plannedETA: {
    type: String,
    default: ''
  },
  actualDeliveryTime: {
    type: Date,
    default: null
  },
  failureReason: {
    type: String,
    default: ''
  },
  notes: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Delivery', deliverySchema);
