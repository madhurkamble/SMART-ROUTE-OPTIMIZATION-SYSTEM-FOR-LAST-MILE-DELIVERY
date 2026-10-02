const express = require('express');
const router = express.Router();
const Delivery = require('../models/Delivery');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');

// @route   GET /api/deliveries
// @desc    Get all deliveries (with driver & vehicle names populated)
router.get('/', async (req, res) => {
  try {
    const deliveries = await Delivery.find()
      .populate('assignedDriver', 'name phone')
      .populate('assignedVehicle', 'vehicleNumber vehicleType')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: deliveries.length, data: deliveries });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/deliveries/:id
// @desc    Get single delivery by ID
router.get('/:id', async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('assignedDriver', 'name phone')
      .populate('assignedVehicle', 'vehicleNumber vehicleType');

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    return res.json({ success: true, data: delivery });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/deliveries
// @desc    Create a new delivery order
router.post('/', async (req, res) => {
  try {
    const {
      customerName, customerPhone, deliveryAddress,
      latitude, longitude, priority,
      timeWindowStart, timeWindowEnd,
      packageWeight, packageSize, notes
    } = req.body;

    if (!customerName || !customerPhone || !deliveryAddress || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Please provide: customerName, customerPhone, deliveryAddress, latitude, longitude'
      });
    }

    const delivery = new Delivery({
      customerName,
      customerPhone,
      deliveryAddress,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      priority: priority || 'standard',
      timeWindowStart: timeWindowStart || '09:00',
      timeWindowEnd: timeWindowEnd || '18:00',
      packageWeight: parseFloat(packageWeight) || 1,
      packageSize: packageSize || 'small',
      notes: notes || ''
    });

    await delivery.save();
    return res.status(201).json({ success: true, message: 'Delivery created successfully', data: delivery });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/deliveries/:id
// @desc    Update a delivery (address, status, assignment, etc.)
router.put('/:id', async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    // Allow updating any provided field
    const allowedFields = [
      'customerName', 'customerPhone', 'deliveryAddress',
      'latitude', 'longitude', 'priority',
      'timeWindowStart', 'timeWindowEnd',
      'packageWeight', 'packageSize',
      'assignedDriver', 'assignedVehicle',
      'status', 'plannedETA', 'actualDeliveryTime',
      'failureReason', 'notes'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        delivery[field] = req.body[field];
      }
    });

    // If marking completed, record the actual delivery time
    if (req.body.status === 'completed' && !delivery.actualDeliveryTime) {
      delivery.actualDeliveryTime = new Date();
    }

    await delivery.save();
    return res.json({ success: true, message: 'Delivery updated successfully', data: delivery });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/deliveries/:id
// @desc    Delete a delivery
router.delete('/:id', async (req, res) => {
  try {
    const delivery = await Delivery.findByIdAndDelete(req.params.id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }
    return res.json({ success: true, message: 'Delivery deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
