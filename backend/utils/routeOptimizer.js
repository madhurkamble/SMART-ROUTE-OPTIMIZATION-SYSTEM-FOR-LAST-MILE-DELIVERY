/**
 * Route Optimizer Utility
 * Implements a Priority-Aware, Traffic-Aware, Fuel-Efficient
 * Multi-Stop Route Optimization Engine using Nearest Neighbor.
 *
 * ALGORITHM EXPLANATION:
 * 1. Start at the driver's current coordinates.
 * 2. At each step, evaluate all unvisited delivery orders.
 * 3. Calculate the Haversine distance from current position to each order.
 * 4. Apply a Priority Weight factor:
 *    - Urgent orders receive an effective distance discount (0.6x)
 *    - This gives urgent orders high preference unless a standard order
 *      is dramatically closer.
 * 5. Choose the candidate with the lowest effective cost, visit it,
 *    and update current coordinates.
 * 6. Repeat until all deliveries are sequenced.
 * 7. Calculate incremental ETAs, fuel usage, and the comprehensive Route Score.
 *
 * ROUTE SCORE FORMULA (Student MVP):
 * Route Score = Distance Cost + Traffic Cost + Fuel Cost - Priority Benefit
 * - Distance Cost   = totalDistanceKm * 1.5
 * - Traffic Cost    = (trafficFactor - 1.0) * 25.0
 * - Fuel Cost       = estimatedFuelCost
 * - Priority Benefit = urgentDeliveriesCount * 15.0
 * (Lower score represents a more cost-effective and optimized route)
 */

const { haversineDistance, calculateTotalRouteDistance } = require('./distanceCalculator');
const { calculateFuelUsage } = require('./fuelCalculator');
const { calculateRouteETA, calculateStopETAs } = require('./etaCalculator');

/**
 * Optimize route for a driver, vehicle, and list of deliveries.
 *
 * @param {object} params
 * @param {object} params.startPoint - { latitude, longitude, label }
 * @param {Array} params.deliveries - Array of delivery documents or plain objects
 * @param {object} params.vehicle - Vehicle object with { mileage, fuelType, vehicleNumber, vehicleType }
 * @param {string} [params.trafficCondition='medium'] - 'low' | 'medium' | 'high'
 * @param {object} [params.customFuelPrices] - Optional fuel price overrides
 * @param {Date} [params.startTime] - Start time for ETA calculation
 * @returns {object} Complete optimized route plan
 */
function optimizeRoute({
  startPoint,
  deliveries,
  vehicle,
  trafficCondition = 'medium',
  customFuelPrices = {},
  startTime = new Date()
}) {
  if (!deliveries || deliveries.length === 0) {
    throw new Error('No deliveries provided to optimize');
  }

  const unvisited = deliveries.map(d => (d.toObject ? d.toObject() : { ...d }));
  const orderedStops = [];

  let currentLat = startPoint.latitude;
  let currentLon = startPoint.longitude;

  // Step-by-step Nearest Neighbor with Priority Discount
  while (unvisited.length > 0) {
    let bestIndex = 0;
    let lowestWeightedCost = Infinity;
    let bestRawDistance = 0;

    for (let i = 0; i < unvisited.length; i++) {
      const candidate = unvisited[i];
      const rawDist = haversineDistance(
        currentLat, currentLon,
        candidate.latitude, candidate.longitude
      );

      // Priority discount: urgent deliveries are effectively weighted 40% closer
      // so urgent stops are visited early unless standard stops are directly adjacent
      const isUrgent = candidate.priority === 'urgent';
      const priorityMultiplier = isUrgent ? 0.6 : 1.0;
      const weightedCost = rawDist * priorityMultiplier;

      if (weightedCost < lowestWeightedCost) {
        lowestWeightedCost = weightedCost;
        bestRawDistance = rawDist;
        bestIndex = i;
      }
    }

    const selectedStop = unvisited[bestIndex];
    orderedStops.push({
      ...selectedStop,
      stopNumber: orderedStops.length + 1,
      distanceFromPrevious: Math.round(bestRawDistance * 100) / 100
    });

    currentLat = selectedStop.latitude;
    currentLon = selectedStop.longitude;
    unvisited.splice(bestIndex, 1);
  }

  // 1. Total distance
  const totalDistanceKm = calculateTotalRouteDistance(startPoint, orderedStops);

  // 2. ETA & Stop-by-stop cumulative times
  const etaSummary = calculateRouteETA({
    distanceKm: totalDistanceKm,
    stopsCount: orderedStops.length,
    trafficCondition,
    startTime
  });

  const stopsWithETA = calculateStopETAs(orderedStops, trafficCondition, startTime);

  // 3. Fuel calculation
  const fuelSummary = calculateFuelUsage({
    distanceKm: totalDistanceKm,
    mileage: vehicle.mileage || 15,
    fuelType: vehicle.fuelType || 'diesel',
    stopsCount: orderedStops.length,
    customPrices: customFuelPrices
  });

  // 4. Route Score Calculation
  const urgentCount = orderedStops.filter(s => s.priority === 'urgent').length;
  const distanceCost = Math.round(totalDistanceKm * 1.5 * 100) / 100;
  const trafficCost = Math.round((etaSummary.trafficFactor - 1.0) * 25.0 * 100) / 100;
  const fuelCost = fuelSummary.totalCost;
  const priorityBenefit = urgentCount * 15.0;

  // Composite Route Score (Lower is better)
  const routeScore = Math.max(
    10,
    Math.round((distanceCost + trafficCost + fuelCost - priorityBenefit) * 10) / 10
  );

  return {
    algorithm: 'Priority-Aware Nearest Neighbor',
    startPoint,
    orderedStops: stopsWithETA,
    totalStops: orderedStops.length,
    urgentStopsCount: urgentCount,
    standardStopsCount: orderedStops.length - urgentCount,
    totalDistanceKm,
    etaSummary,
    fuelSummary,
    scoringBreakdown: {
      distanceCost,
      trafficCost,
      fuelCost,
      priorityBenefit,
      routeScore,
      formulaExplanation: 'Score = (Distance * 1.5) + (Traffic Factor Penalty) + (Fuel Cost) - (Urgent Priority Bonus)'
    }
  };
}

module.exports = {
  optimizeRoute
};
