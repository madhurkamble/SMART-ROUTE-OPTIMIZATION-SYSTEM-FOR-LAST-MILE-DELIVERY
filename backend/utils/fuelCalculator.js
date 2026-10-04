/**
 * Fuel Calculator Utility
 * Estimates fuel consumption, fuel cost, and cost per delivery.
 *
 * FORMULA:
 * Fuel Consumed = Distance (km) / Mileage (km/L)
 * Total Fuel Cost = Fuel Consumed * Fuel Price (₹/L)
 * Fuel Cost Per Stop = Total Fuel Cost / Number of Deliveries
 *
 * Configurable market fuel prices with realistic defaults.
 */

// Default fuel price configuration (₹ per Litre or kWh)
// Kept configurable so users can adjust or supply custom prices
const DEFAULT_FUEL_PRICES = {
  petrol: 104.0,   // ₹104 / litre
  diesel: 91.0,    // ₹91 / litre
  electric: 8.5    // ₹8.5 / kWh equivalent unit (approx 1.2 ₹/km)
};

/**
 * Calculate estimated fuel usage and cost for a given distance and vehicle.
 *
 * @param {object} params
 * @param {number} params.distanceKm - Total route distance in kilometres
 * @param {number} params.mileage - Vehicle mileage (km per litre or km per charge unit)
 * @param {string} params.fuelType - 'petrol', 'diesel', or 'electric'
 * @param {number} params.stopsCount - Number of delivery stops
 * @param {object} [params.customPrices] - Optional user-configured fuel prices
 * @returns {object} Fuel consumption summary
 */
function calculateFuelUsage({ distanceKm, mileage, fuelType = 'diesel', stopsCount = 1, customPrices = {} }) {
  const safeDistance = Math.max(0, Number(distanceKm) || 0);
  const safeMileage = Math.max(1, Number(mileage) || 15);
  const normalizedFuelType = (fuelType || 'diesel').toLowerCase();

  // Determine unit price
  const pricePerUnit = Number(customPrices[normalizedFuelType]) ||
    DEFAULT_FUEL_PRICES[normalizedFuelType] ||
    DEFAULT_FUEL_PRICES.diesel;

  // Fuel consumption = distance / mileage
  const fuelConsumedUnits = Math.round((safeDistance / safeMileage) * 100) / 100;

  // Total cost
  const totalCost = Math.round(fuelConsumedUnits * pricePerUnit * 100) / 100;

  // Cost per delivery stop
  const safeStops = Math.max(1, Number(stopsCount) || 1);
  const costPerDelivery = Math.round((totalCost / safeStops) * 100) / 100;

  const unitLabel = normalizedFuelType === 'electric' ? 'kWh' : 'litres';

  return {
    distanceKm: safeDistance,
    mileage: safeMileage,
    fuelType: normalizedFuelType,
    unitPrice: pricePerUnit,
    fuelConsumed: fuelConsumedUnits,
    unitLabel,
    totalCost,
    costPerDelivery
  };
}

module.exports = {
  DEFAULT_FUEL_PRICES,
  calculateFuelUsage
};
