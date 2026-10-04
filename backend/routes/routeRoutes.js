const express = require('express');
const router = express.Router();
const Delivery = require('../models/Delivery');
const Driver = require('../models/Driver');
const Vehicle = require('../models/Vehicle');
const Route = require('../models/Route');
const { optimizeRoute } = require('../utils/routeOptimizer');
const { calculateRouteETA, calculateStopETAs } = require('../utils/etaCalculator');
const { calculateFuelUsage } = require('../utils/fuelCalculator');

// @route   GET /api/routes/data
// @desc    Get all active drivers, available vehicles, and pending deliveries for Route Planner form
router.get('/data', async (req, res) => {
  try {
    const [drivers, vehicles, deliveries] = await Promise.all([
      Driver.find({ availability: { $ne: 'off_duty' } })
        .select('name phone email availability licenseNumber assignedVehicle currentLatitude currentLongitude'),
      Vehicle.find({ availability: { $ne: 'maintenance' } })
        .select('vehicleNumber vehicleType fuelType mileage loadCapacity availability'),
      Delivery.find({ status: { $in: ['pending', 'assigned'] } })
        .select('orderId customerName customerPhone deliveryAddress latitude longitude priority timeWindowStart timeWindowEnd packageWeight status')
        .sort({ priority: -1, createdAt: 1 })
    ]);

    return res.json({ success: true, data: { drivers, vehicles, deliveries } });
  } catch (error) {
    console.error('Error fetching planner data:', error);
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   POST /api/routes/preview
// @desc    Preview an optimized multi-stop route without persisting to database
router.post('/preview', async (req, res) => {
  try {
    const { driverId, vehicleId, deliveryIds, trafficCondition = 'medium', customFuelPrices } = req.body;

    if (!driverId || !vehicleId || !deliveryIds || deliveryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide driverId, vehicleId, and at least one deliveryId'
      });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    const deliveries = await Delivery.find({ _id: { $in: deliveryIds } });
    if (deliveries.length === 0) {
      return res.status(404).json({ success: false, message: 'Deliveries not found for given IDs' });
    }

    const startPoint = {
      latitude: driver.currentLatitude || 18.5204,
      longitude: driver.currentLongitude || 73.8567,
      label: `Driver Start: ${driver.name}`
    };

    const optimizationResult = optimizeRoute({
      startPoint,
      deliveries,
      vehicle,
      trafficCondition,
      customFuelPrices
    });

    return res.json({
      success: true,
      data: {
        driver: { id: driver._id, name: driver.name, phone: driver.phone },
        vehicle: {
          id: vehicle._id,
          vehicleNumber: vehicle.vehicleNumber,
          vehicleType: vehicle.vehicleType,
          mileage: vehicle.mileage,
          fuelType: vehicle.fuelType
        },
        ...optimizationResult
      }
    });
  } catch (error) {
    console.error('Route preview error:', error);
    return res.status(500).json({ success: false, message: 'Server error during preview', error: error.message });
  }
});

// @route   POST /api/routes/optimize
// @desc    Run full Smart Route Optimization and persist the Route & assignments to database
router.post('/optimize', async (req, res) => {
  try {
    const {
      driverId,
      vehicleId,
      deliveryIds,
      trafficCondition = 'medium',
      customFuelPrices = {}
    } = req.body;

    if (!driverId || !vehicleId || !deliveryIds || deliveryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select a driver, a vehicle, and at least one delivery order.'
      });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });

    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    const deliveries = await Delivery.find({ _id: { $in: deliveryIds } });
    if (deliveries.length === 0) {
      return res.status(404).json({ success: false, message: 'No delivery orders found' });
    }

    const startPoint = {
      latitude: driver.currentLatitude || 18.5204,
      longitude: driver.currentLongitude || 73.8567,
      label: `Driver Start: ${driver.name}`
    };

    // Run Optimization Engine
    const optPlan = optimizeRoute({
      startPoint,
      deliveries,
      vehicle,
      trafficCondition,
      customFuelPrices
    });

    // Format stops for Route model schema
    const routeStops = optPlan.orderedStops.map(stop => ({
      delivery: stop._id,
      stopNumber: stop.stopNumber,
      orderId: stop.orderId,
      customerName: stop.customerName,
      customerPhone: stop.customerPhone || '',
      deliveryAddress: stop.deliveryAddress,
      latitude: stop.latitude,
      longitude: stop.longitude,
      priority: stop.priority,
      distanceFromPrevious: stop.distanceFromPrevious,
      estimatedArrival: stop.estimatedArrival,
      status: 'pending'
    }));

    // Save Route to Database
    const savedRoute = new Route({
      driver: driver._id,
      vehicle: vehicle._id,
      trafficCondition: optPlan.etaSummary.trafficCondition,
      trafficFactor: optPlan.etaSummary.trafficFactor,
      totalDistanceKm: optPlan.totalDistanceKm,
      totalDurationMinutes: optPlan.etaSummary.totalMinutes,
      formattedDuration: optPlan.etaSummary.formattedDuration,
      estimatedETA: optPlan.etaSummary.estimatedETA,
      estimatedFuelLiters: optPlan.fuelSummary.fuelConsumed,
      estimatedFuelCost: optPlan.fuelSummary.totalCost,
      routeScore: optPlan.scoringBreakdown.routeScore,
      stops: routeStops,
      status: 'planned'
    });

    await savedRoute.save();

    // Update assigned Deliveries to link to this driver & vehicle, and mark status as 'assigned'
    await Delivery.updateMany(
      { _id: { $in: deliveryIds } },
      {
        assignedDriver: driver._id,
        assignedVehicle: vehicle._id,
        status: 'assigned',
        plannedETA: optPlan.etaSummary.estimatedETA
      }
    );

    // Update driver status to on_duty & vehicle to in_use
    await Driver.findByIdAndUpdate(driver._id, { availability: 'on_duty' });
    await Vehicle.findByIdAndUpdate(vehicle._id, { availability: 'in_use' });

    return res.status(201).json({
      success: true,
      message: 'Smart Route optimized and dispatched successfully!',
      routeId: savedRoute.routeId,
      routeDatabaseId: savedRoute._id,
      data: {
        driver: { id: driver._id, name: driver.name, phone: driver.phone },
        vehicle: {
          id: vehicle._id,
          vehicleNumber: vehicle.vehicleNumber,
          vehicleType: vehicle.vehicleType,
          mileage: vehicle.mileage,
          fuelType: vehicle.fuelType
        },
        ...optPlan
      }
    });
  } catch (error) {
    console.error('Route optimization error:', error);
    return res.status(500).json({ success: false, message: 'Server error during optimization', error: error.message });
  }
});

// @route   POST /api/routes/:id/recalculate
// @desc    Dynamic Route Recalculation when traffic conditions change (LOW/MEDIUM/HIGH)
router.post('/:id/recalculate', async (req, res) => {
  try {
    const { trafficCondition = 'high', customFuelPrices = {} } = req.body;

    // Search by _id or custom routeId
    let route = await Route.findById(req.params.id)
      .populate('driver')
      .populate('vehicle');

    if (!route) {
      route = await Route.findOne({ routeId: req.params.id })
        .populate('driver')
        .populate('vehicle');
    }

    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found to recalculate' });
    }

    // Re-evaluate ETA metrics under new traffic condition
    const etaSummary = calculateRouteETA({
      distanceKm: route.totalDistanceKm,
      stopsCount: route.stops.length,
      trafficCondition,
      startTime: new Date()
    });

    // Re-evaluate stop-by-stop cumulative ETAs
    const rawStops = route.stops.map(s => s.toObject ? s.toObject() : s);
    const updatedStops = calculateStopETAs(rawStops, trafficCondition, new Date());

    // Re-evaluate fuel cost
    const fuelSummary = calculateFuelUsage({
      distanceKm: route.totalDistanceKm,
      mileage: route.vehicle.mileage || 15,
      fuelType: route.vehicle.fuelType || 'diesel',
      stopsCount: route.stops.length,
      customPrices: customFuelPrices
    });

    // Recalculate Route Score with new traffic penalty
    const urgentCount = route.stops.filter(s => s.priority === 'urgent').length;
    const distanceCost = Math.round(route.totalDistanceKm * 1.5 * 100) / 100;
    const trafficCost = Math.round((etaSummary.trafficFactor - 1.0) * 25.0 * 100) / 100;
    const fuelCost = fuelSummary.totalCost;
    const priorityBenefit = urgentCount * 15.0;

    const newRouteScore = Math.max(
      10,
      Math.round((distanceCost + trafficCost + fuelCost - priorityBenefit) * 10) / 10
    );

    // Update saved route in database
    route.trafficCondition = trafficCondition;
    route.trafficFactor = etaSummary.trafficFactor;
    route.totalDurationMinutes = etaSummary.totalMinutes;
    route.formattedDuration = etaSummary.formattedDuration;
    route.estimatedETA = etaSummary.estimatedETA;
    route.estimatedFuelLiters = fuelSummary.fuelConsumed;
    route.estimatedFuelCost = fuelSummary.totalCost;
    route.routeScore = newRouteScore;
    route.stops = updatedStops;

    await route.save();

    return res.json({
      success: true,
      message: `Route dynamically recalculated for ${trafficCondition.toUpperCase()} traffic!`,
      routeId: route.routeId,
      data: {
        trafficCondition,
        trafficFactor: etaSummary.trafficFactor,
        totalDistanceKm: route.totalDistanceKm,
        etaSummary,
        fuelSummary,
        scoringBreakdown: {
          distanceCost,
          trafficCost,
          fuelCost,
          priorityBenefit,
          routeScore: newRouteScore
        },
        orderedStops: updatedStops
      }
    });
  } catch (error) {
    console.error('Route recalculation error:', error);
    return res.status(500).json({ success: false, message: 'Server error during recalculation', error: error.message });
  }
});

// @route   GET /api/routes/:id
// @desc    Get details of a specific route by ID
router.get('/:id', async (req, res) => {
  try {
    let route = await Route.findById(req.params.id)
      .populate('driver', 'name phone email licenseNumber')
      .populate('vehicle', 'vehicleNumber vehicleType fuelType mileage');

    if (!route) {
      route = await Route.findOne({ routeId: req.params.id })
        .populate('driver', 'name phone email licenseNumber')
        .populate('vehicle', 'vehicleNumber vehicleType fuelType mileage');
    }

    if (!route) {
      return res.status(404).json({ success: false, message: 'Route not found' });
    }

    return res.json({ success: true, data: route });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// @route   GET /api/routes
// @desc    List all routes
router.get('/', async (req, res) => {
  try {
    const routes = await Route.find()
      .populate('driver', 'name phone')
      .populate('vehicle', 'vehicleNumber vehicleType')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: routes.length, data: routes });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

module.exports = router;
