/**
 * Distance Calculator Utility
 * Uses the Haversine Formula to calculate the great-circle distance
 * between two GPS coordinates on Earth.
 *
 * WHY HAVERSINE?
 * The Earth is a sphere (approximately). A simple Euclidean (flat) distance
 * formula would give wrong results for GPS coordinates. The Haversine formula
 * accounts for the curvature of the Earth and gives the shortest distance
 * along the surface (also called "as the crow flies" distance).
 *
 * INPUTS: latitude1, longitude1, latitude2, longitude2 (all in decimal degrees)
 * OUTPUT: distance in kilometers (km)
 */

const EARTH_RADIUS_KM = 6371; // Mean radius of Earth in kilometres

/**
 * Converts degrees to radians.
 * Trigonometric functions in JS (Math.sin, Math.cos) work with radians.
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Haversine distance between two GPS points.
 * @param {number} lat1 - Latitude of point A
 * @param {number} lon1 - Longitude of point A
 * @param {number} lat2 - Latitude of point B
 * @param {number} lon2 - Longitude of point B
 * @returns {number} Distance in kilometres (rounded to 2 decimal places)
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1); // Difference in latitudes
  const dLon = toRadians(lon2 - lon1); // Difference in longitudes

  // Core Haversine formula
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_KM * c;
  return Math.round(distance * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate total route distance for an ordered list of stops.
 * Each stop must have { latitude, longitude } properties.
 * @param {object} startPoint - { latitude, longitude } of driver's starting location
 * @param {Array}  stops      - Array of delivery objects with latitude & longitude
 * @returns {number} Total distance in km
 */
function calculateTotalRouteDistance(startPoint, stops) {
  if (!stops || stops.length === 0) return 0;

  let totalDistance = 0;
  let currentLat = startPoint.latitude;
  let currentLon = startPoint.longitude;

  for (const stop of stops) {
    const dist = haversineDistance(currentLat, currentLon, stop.latitude, stop.longitude);
    totalDistance += dist;
    currentLat = stop.latitude;
    currentLon = stop.longitude;
  }

  return Math.round(totalDistance * 100) / 100;
}

/**
 * Build a distance matrix — distance from every point to every other point.
 * Useful for route optimization algorithms.
 * @param {Array} points - Array of { latitude, longitude } objects
 * @returns {number[][]} 2D array where matrix[i][j] = distance from point i to point j
 */
function buildDistanceMatrix(points) {
  const n = points.length;
  const matrix = [];

  for (let i = 0; i < n; i++) {
    matrix[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        matrix[i][j] = 0;
      } else {
        matrix[i][j] = haversineDistance(
          points[i].latitude, points[i].longitude,
          points[j].latitude, points[j].longitude
        );
      }
    }
  }

  return matrix;
}

module.exports = { haversineDistance, calculateTotalRouteDistance, buildDistanceMatrix };
