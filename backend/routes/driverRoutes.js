const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');

// @route   GET /api/drivers
// @desc    Get all drivers (with assigned vehicle info)
router.get('/', async (req, res) => {
  try {
    const drivers = await Driver.find()
      .populate('assignedVehicle', 'vehicleNumber vehicleType')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: drivers.length, data: drivers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/drivers/:id
// @desc    Get a single driver
router.get('/:id', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
      .populate('assignedVehicle', 'vehicleNumber vehicleType');

    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    return res.json({ success: true, data: driver });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/drivers
// @desc    Add a new driver
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, licenseNumber } = req.body;

    if (!name || !phone || !email || !licenseNumber) {
      return res.status(400).json({
        success: false,
        message: 'Please provide: name, phone, email, licenseNumber'
      });
    }

    const existingDriver = await Driver.findOne({ email: email.toLowerCase() });
    if (existingDriver) {
      return res.status(400).json({ success: false, message: 'A driver with this email already exists' });
    }

    const driver = new Driver({
      name,
      phone,
      email: email.toLowerCase().trim(),
      licenseNumber,
      availability: req.body.availability || 'available'
    });

    await driver.save();
    return res.status(201).json({ success: true, message: 'Driver added successfully', data: driver });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/drivers/:id
// @desc    Update driver info or assign vehicle
router.put('/:id', async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    const allowedFields = [
      'name', 'phone', 'email', 'licenseNumber',
      'assignedVehicle', 'availability',
      'currentLatitude', 'currentLongitude',
      'completedDeliveries', 'failedDeliveries', 'onTimeDeliveries'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        driver[field] = req.body[field];
      }
    });

    await driver.save();
    return res.json({ success: true, message: 'Driver updated successfully', data: driver });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/drivers/:id
// @desc    Delete a driver
router.delete('/:id', async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }
    return res.json({ success: true, message: 'Driver deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
