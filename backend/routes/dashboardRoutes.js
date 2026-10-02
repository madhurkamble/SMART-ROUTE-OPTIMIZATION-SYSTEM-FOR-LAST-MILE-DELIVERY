const express = require('express');
const router = express.Router();
const Delivery = require('../models/Delivery');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');

// @route   GET /api/dashboard/summary
// @desc    Return live KPI counts aggregated from the database
router.get('/summary', async (req, res) => {
  try {
    const [
      totalDeliveries,
      pendingDeliveries,
      assignedDeliveries,
      activeDeliveries,
      completedDeliveries,
      failedDeliveries,
      totalDrivers,
      totalVehicles,
      availableVehicles
    ] = await Promise.all([
      Delivery.countDocuments(),
      Delivery.countDocuments({ status: 'pending' }),
      Delivery.countDocuments({ status: 'assigned' }),
      Delivery.countDocuments({ status: 'out_for_delivery' }),
      Delivery.countDocuments({ status: 'completed' }),
      Delivery.countDocuments({ status: 'failed' }),
      Driver.countDocuments(),
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ availability: 'available' })
    ]);

    return res.json({
      success: true,
      data: {
        totalDeliveries,
        pendingDeliveries,
        assignedDeliveries,
        activeDeliveries,
        completedDeliveries,
        failedDeliveries,
        totalDrivers,
        totalVehicles,
        availableVehicles,
        // Placeholder values - will be calculated dynamically in Day 4 (route optimizer)
        totalDistanceKm: 48.6,
        estimatedFuelCost: 245.50,
        systemStatus: 'Operational',
        lastUpdated: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving dashboard data' });
  }
});

module.exports = router;
