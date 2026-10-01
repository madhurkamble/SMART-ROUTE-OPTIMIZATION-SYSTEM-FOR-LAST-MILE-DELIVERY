const express = require('express');
const router = express.Router();

// @route   GET /api/dashboard/summary
// @desc    Get dashboard metrics & overview data
router.get('/summary', async (req, res) => {
  try {
    // Realistic initial baseline stats for Day 1
    // On Day 2 & Day 5, this will aggregate live data from Delivery, Driver, and Vehicle collections
    const summaryData = {
      totalDeliveries: 12,
      pendingDeliveries: 5,
      activeDeliveries: 4,
      completedDeliveries: 3,
      failedDeliveries: 0,
      totalDrivers: 4,
      totalVehicles: 5,
      availableVehicles: 3,
      totalDistanceKm: 48.6,
      estimatedFuelCost: 245.50,
      systemStatus: 'Operational',
      lastUpdated: new Date().toISOString()
    };

    return res.json({
      success: true,
      data: summaryData
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    return res.status(500).json({ success: false, message: 'Server error retrieving dashboard data' });
  }
});

module.exports = router;
