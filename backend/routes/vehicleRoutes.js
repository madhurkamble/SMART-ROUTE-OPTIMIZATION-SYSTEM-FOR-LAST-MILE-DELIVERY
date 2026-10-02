const express = require('express');
const router = express.Router();
const Vehicle = require('../models/Vehicle');
const Driver = require('../models/Driver');

// @route   GET /api/vehicles
// @desc    Get all vehicles (with assigned driver name)
router.get('/', async (req, res) => {
  try {
    const vehicles = await Vehicle.find()
      .populate('assignedDriver', 'name phone')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: vehicles.length, data: vehicles });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/vehicles/:id
// @desc    Get single vehicle
router.get('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id)
      .populate('assignedDriver', 'name phone');

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    return res.json({ success: true, data: vehicle });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/vehicles
// @desc    Add a new vehicle to fleet
router.post('/', async (req, res) => {
  try {
    const { vehicleNumber, vehicleType, fuelType, mileage, loadCapacity } = req.body;

    if (!vehicleNumber || !vehicleType || !fuelType || !mileage || !loadCapacity) {
      return res.status(400).json({
        success: false,
        message: 'Please provide: vehicleNumber, vehicleType, fuelType, mileage, loadCapacity'
      });
    }

    const existingVehicle = await Vehicle.findOne({ vehicleNumber: vehicleNumber.toUpperCase() });
    if (existingVehicle) {
      return res.status(400).json({ success: false, message: 'Vehicle with this registration already exists' });
    }

    const vehicle = new Vehicle({
      vehicleNumber: vehicleNumber.toUpperCase(),
      vehicleType,
      fuelType,
      mileage: parseFloat(mileage),
      fuelTankCapacity: parseFloat(req.body.fuelTankCapacity) || 40,
      loadCapacity: parseFloat(loadCapacity),
      availability: req.body.availability || 'available'
    });

    await vehicle.save();
    return res.status(201).json({ success: true, message: 'Vehicle added successfully', data: vehicle });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/vehicles/:id
// @desc    Update vehicle info or assign driver
router.put('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    const allowedFields = [
      'vehicleNumber', 'vehicleType', 'fuelType',
      'mileage', 'fuelTankCapacity', 'loadCapacity',
      'currentLatitude', 'currentLongitude',
      'assignedDriver', 'availability'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        vehicle[field] = req.body[field];
      }
    });

    await vehicle.save();
    return res.json({ success: true, message: 'Vehicle updated successfully', data: vehicle });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/vehicles/:id
// @desc    Delete a vehicle
router.delete('/:id', async (req, res) => {
  try {
    const vehicle = await Vehicle.findByIdAndDelete(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    return res.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
