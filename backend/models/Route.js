const mongoose = require('mongoose');

const routeStopSchema = new mongoose.Schema({
  delivery: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Delivery'
  },
  stopNumber: {
    type: Number,
    required: true
  },
  orderId: {
    type: String,
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerPhone: {
    type: String
  },
  deliveryAddress: {
    type: String,
    required: true
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  priority: {
    type: String,
    enum: ['urgent', 'standard'],
    default: 'standard'
  },
  distanceFromPrevious: {
    type: Number,
    default: 0
  },
  estimatedArrival: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'out_for_delivery', 'completed', 'failed'],
    default: 'pending'
  }
});

const routeSchema = new mongoose.Schema({
  routeId: {
    type: String,
    unique: true,
    default: function () {
      return 'ROU-' + Math.floor(1000 + Math.random() * 9000);
    }
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: true
  },
  trafficCondition: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  trafficFactor: {
    type: Number,
    default: 1.2
  },
  totalDistanceKm: {
    type: Number,
    required: true
  },
  totalDurationMinutes: {
    type: Number,
    required: true
  },
  formattedDuration: {
    type: String,
    default: ''
  },
  estimatedETA: {
    type: String,
    default: ''
  },
  estimatedFuelLiters: {
    type: Number,
    default: 0
  },
  estimatedFuelCost: {
    type: Number,
    default: 0
  },
  routeScore: {
    type: Number,
    default: 0
  },
  stops: [routeStopSchema],
  status: {
    type: String,
    enum: ['planned', 'in_progress', 'completed'],
    default: 'planned'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Route', routeSchema);
