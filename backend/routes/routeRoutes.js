const express = require('express');
const router = express.Router();
const Delivery = require('../models/Delivery');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const { haversineDistance, calculateTotalRouteDistance } = require('../utils/distanceCalculator');

/**
 * Simple Nearest Neighbor Algorithm (preview version for Day 3).
 *
 * HOW IT WORKS:
 * 1. Start at driver's current location.
 * 2. Look at all unvisited deliveries.
 * 3. Go to the CLOSEST one (minimum distance).
 * 4. Mark it visited. Now you are at that delivery's location.
 * 5. Repeat steps 2–4 until all deliveries are visited.
 *
 * This is NOT the globally optimal solution, but it is fast, simple,
 * and gives a very reasonable route for small fleets.
 * Full optimization with traffic + priority + fuel comes in Day 4.
 */
function nearestNeighborRoute(startPoint, deliveries) {
  const unvisited = [...deliveries]; // Copy so we don't modify original
  const orderedRoute = [];

  let currentLat = startPoint.latitude;
  let currentLon = startPoint.longitude;

  while (unvisited.length > 0) {
    let closestIndex = 0;
    let closestDistance = Infinity;

    // Find the closest unvisited delivery from current position
    for (let i = 0; i < unvisited.length; i++) {
      const dist = haversineDistance(
        currentLat, currentLon,
        unvisited[i].latitude, unvisited[i].longitude
      );
      if (dist < closestDistance) {
        closestDistance = dist;
        closestIndex = i;
      }
    }

    // Move to the closest delivery
    const nextStop = unvisited[closestIndex];
    orderedRoute.push({
      ...nextStop.toObject ? nextStop.toObject() : nextStop,
      distanceFromPrevious: Math.round(closestDistance * 100) / 100
    });

    currentLat = nextStop.latitude;
    currentLon = nextStop.longitude;

    // Remove from unvisited list
    unvisited.splice(closestIndex, 1);
  }

  return orderedRoute;
}

// @route   POST /api/routes/preview
// @desc    Preview a multi-stop route without saving it.
//          Takes driver ID, vehicle ID, and delivery IDs.
//          Returns: ordered stops, distances, map data.
router.post('/preview', async (req, res) => {
  try {
    const { driverId, vehicleId, deliveryIds } = req.body;

    // --- Validation ---
    if (!driverId || !vehicleId || !deliveryIds || deliveryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide driverId, vehicleId, and at least one deliveryId'
      });
    }

    // --- Fetch data from DB ---
    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    const deliveries = await Delivery.find({ _id: { $in: deliveryIds } });
    if (deliveries.length === 0) {
      return res.status(404).json({ success: false, message: 'No deliveries found for given IDs' });
    }

    // --- Driver starting point ---
    const startPoint = {
      latitude: driver.currentLatitude || 18.5204,
      longitude: driver.currentLongitude || 73.8567,
      label: `Driver Start: ${driver.name}`
    };

    // --- Apply Nearest Neighbor to get ordered stops ---
    const orderedStops = nearestNeighborRoute(startPoint, deliveries);

    // --- Calculate total distance ---
    const totalDistance = calculateTotalRouteDistance(startPoint, orderedStops);

    // --- Build map markers array for Leaflet ---
    const mapMarkers = [
      {
        type: 'driver',
        label: `🚚 ${driver.name} (Start)`,
        latitude: startPoint.latitude,
        longitude: startPoint.longitude
      },
      ...orderedStops.map((stop, index) => ({
        type: 'delivery',
        stopNumber: index + 1,
        orderId: stop.orderId,
        label: `#${index + 1}: ${stop.customerName}`,
        address: stop.deliveryAddress,
        priority: stop.priority,
        latitude: stop.latitude,
        longitude: stop.longitude,
        distanceFromPrevious: stop.distanceFromPrevious
      }))
    ];

    return res.json({
      success: true,
      data: {
        driver: { id: driver._id, name: driver.name, phone: driver.phone },
        vehicle: { id: vehicle._id, vehicleNumber: vehicle.vehicleNumber, vehicleType: vehicle.vehicleType, mileage: vehicle.mileage, fuelType: vehicle.fuelType },
        startPoint,
        orderedStops,
        totalDistance,
        stopCount: orderedStops.length,
        mapMarkers,
        algorithm: 'Nearest Neighbor (basic)',
        note: 'Full optimization with traffic, fuel & priority will be applied in Day 4'
      }
    });
  } catch (error) {
    console.error('Route preview error:', error);
    return res.status(500).json({ success: false, message: 'Server error during route preview', error: error.message });
  }
});

// @route   GET /api/routes/data
// @desc    Get all data needed to populate the Route Planner form dropdowns
router.get('/data', async (req, res) => {
  try {
    const [drivers, vehicles, deliveries] = await Promise.all([
      Driver.find({ availability: { $ne: 'off_duty' } }).select('name phone availability assignedVehicle'),
      Vehicle.find({ availability: { $ne: 'maintenance' } }).select('vehicleNumber vehicleType fuelType mileage loadCapacity availability'),
      Delivery.find({ status: { $in: ['pending', 'assigned'] } })
        .select('orderId customerName deliveryAddress latitude longitude priority timeWindowStart timeWindowEnd packageWeight status')
        .sort({ priority: -1, createdAt: 1 }) // Urgent first
    ]);

    return res.json({ success: true, data: { drivers, vehicles, deliveries } });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
