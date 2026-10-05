const express = require('express');
const router = express.Router();
const Delivery = require('../models/Delivery');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');

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

// @route   GET /api/deliveries/driver/:driverId
// @desc    Get deliveries assigned to a specific driver
router.get('/driver/:driverId', async (req, res) => {
  try {
    const deliveries = await Delivery.find({ assignedDriver: req.params.driverId })
      .populate('assignedVehicle', 'vehicleNumber vehicleType')
      .sort({ priority: -1, createdAt: 1 });

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

// @route   PUT /api/deliveries/:id/status
// @desc    Driver updates delivery status (pending -> out_for_delivery -> completed / failed)
router.put('/:id/status', async (req, res) => {
  try {
    const { status, failureReason, notes } = req.body;
    const validStatuses = ['pending', 'assigned', 'out_for_delivery', 'completed', 'failed'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    delivery.status = status;
    if (failureReason) delivery.failureReason = failureReason;
    if (notes) delivery.notes = notes;

    if (status === 'completed') {
      delivery.actualDeliveryTime = new Date();
      // Update driver completed & on-time stats
      if (delivery.assignedDriver) {
        await Driver.findByIdAndUpdate(delivery.assignedDriver, {
          $inc: { completedDeliveries: 1, onTimeDeliveries: 1 }
        });
      }
    } else if (status === 'failed') {
      if (delivery.assignedDriver) {
        await Driver.findByIdAndUpdate(delivery.assignedDriver, {
          $inc: { failedDeliveries: 1 }
        });
      }
    }

    await delivery.save();

    // Also sync the status into any Route containing this delivery
    await Route.updateMany(
      { 'stops.delivery': delivery._id },
      { $set: { 'stops.$.status': status } }
    );

    return res.json({
      success: true,
      message: `Delivery status updated to ${status.replace('_', ' ')}`,
      data: delivery
    });
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ success: false, message: 'Server error updating status', error: error.message });
  }
});

// @route   POST /api/deliveries/:id/issue
// @desc    Driver reports an issue/delay (traffic, vehicle problem, customer unavailable, etc.)
router.post('/:id/issue', async (req, res) => {
  try {
    const { issueType, description } = req.body;
    const delivery = await Delivery.findById(req.params.id);

    if (!delivery) {
      return res.status(404).json({ success: false, message: 'Delivery not found' });
    }

    const issueText = `[ISSUE: ${issueType || 'General'}] ${description || ''} (${new Date().toLocaleTimeString()})`;
    delivery.notes = delivery.notes ? `${delivery.notes} | ${issueText}` : issueText;

    if (issueType === 'customer_unavailable') {
      delivery.status = 'failed';
      delivery.failureReason = 'Customer unavailable at location';
    }

    await delivery.save();

    return res.json({
      success: true,
      message: 'Delivery issue logged successfully',
      data: delivery
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error reporting issue', error: error.message });
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
