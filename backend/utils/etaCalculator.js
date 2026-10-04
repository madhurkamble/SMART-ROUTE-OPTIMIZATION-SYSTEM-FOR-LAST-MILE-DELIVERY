/**
 * ETA Calculator Utility
 * Calculates approximate travel time, delivery service time, and stop-by-stop ETAs.
 *
 * TRAFFIC FACTORS (Simulated Traffic):
 * - LOW:    1.0 (Free flowing traffic, baseline travel time)
 * - MEDIUM: 1.2 (Normal city traffic, 20% delay factor)
 * - HIGH:   1.5 (Congested city traffic, 50% delay factor)
 *
 * NOTE: Clearly labeled as simulated traffic for student-level MVP demonstration.
 *
 * FORMULA:
 * Effective Speed = Base Speed (e.g. 35 km/h) / Traffic Factor
 * Driving Time (mins) = (Distance / Effective Speed) * 60
 * Service Time (mins) = Stops Count * 5 mins (unloading & customer handover)
 * Total Time (mins) = Driving Time + Service Time
 */

const TRAFFIC_FACTORS = {
  low: 1.0,
  medium: 1.2,
  high: 1.5
};

const BASE_SPEED_KMH = 35.0; // Realistic average city delivery transit speed (35 km/h)
const SERVICE_TIME_PER_STOP_MINS = 5; // Standard 5 minutes per delivery handover

/**
 * Format a Date object into human-friendly 12-hour time string (e.g. "02:45 PM").
 */
function formatTime(date) {
  const d = new Date(date);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 hour is 12 AM
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr} ${ampm}`;
}

/**
 * Calculate overall route ETA and duration.
 *
 * @param {object} params
 * @param {number} params.distanceKm - Route distance in km
 * @param {number} params.stopsCount - Number of deliveries
 * @param {string} [params.trafficCondition='medium'] - 'low' | 'medium' | 'high'
 * @param {Date|string|number} [params.startTime] - Start time (defaults to now)
 * @returns {object} Calculated ETA metrics
 */
function calculateRouteETA({ distanceKm, stopsCount = 1, trafficCondition = 'medium', startTime = new Date() }) {
  const safeDistance = Math.max(0, Number(distanceKm) || 0);
  const safeStops = Math.max(0, Number(stopsCount) || 0);
  const condition = (trafficCondition || 'medium').toLowerCase();
  const factor = TRAFFIC_FACTORS[condition] || TRAFFIC_FACTORS.medium;

  // Effective travel speed adjusted for traffic
  const effectiveSpeedKmh = BASE_SPEED_KMH / factor;

  // Travel time in minutes
  const drivingMinutes = Math.round((safeDistance / effectiveSpeedKmh) * 60);

  // Total service time at customer doorsteps
  const serviceMinutes = safeStops * SERVICE_TIME_PER_STOP_MINS;

  // Total trip duration
  const totalMinutes = drivingMinutes + serviceMinutes;

  // Calculate projected clock arrival time
  const startDate = new Date(startTime);
  const etaDate = new Date(startDate.getTime() + totalMinutes * 60 * 1000);

  // Formatted duration e.g. "45 mins" or "1 hr 15 mins"
  let formattedDuration = '';
  if (totalMinutes < 60) {
    formattedDuration = `${totalMinutes} mins`;
  } else {
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    formattedDuration = mins > 0 ? `${hrs} hr ${mins} mins` : `${hrs} hr`;
  }

  return {
    trafficCondition: condition,
    trafficFactor: factor,
    baseSpeedKmh: BASE_SPEED_KMH,
    effectiveSpeedKmh: Math.round(effectiveSpeedKmh * 10) / 10,
    drivingMinutes,
    serviceMinutes,
    totalMinutes,
    formattedDuration,
    startTime: formatTime(startDate),
    estimatedETA: formatTime(etaDate),
    isSimulated: true
  };
}

/**
 * Calculate stop-by-stop cumulative ETAs for an ordered sequence of stops.
 *
 * @param {Array} orderedStops - Stops with distanceFromPrevious
 * @param {string} trafficCondition - 'low', 'medium', or 'high'
 * @param {Date} startTime - Departure time
 * @returns {Array} Stops updated with cumulative arrival times and travel segments
 */
function calculateStopETAs(orderedStops, trafficCondition = 'medium', startTime = new Date()) {
  const factor = TRAFFIC_FACTORS[(trafficCondition || 'medium').toLowerCase()] || 1.2;
  const effectiveSpeed = BASE_SPEED_KMH / factor;

  let currentTime = new Date(startTime);

  return orderedStops.map((stop, index) => {
    const segmentDistance = Number(stop.distanceFromPrevious) || 0;
    const segmentTravelMinutes = Math.round((segmentDistance / effectiveSpeed) * 60);

    // Arrive at stop after travel
    const arrivalTime = new Date(currentTime.getTime() + segmentTravelMinutes * 60 * 1000);

    // Depart stop after 5-minute service
    const departureTime = new Date(arrivalTime.getTime() + SERVICE_TIME_PER_STOP_MINS * 60 * 1000);
    currentTime = departureTime;

    return {
      ...stop,
      segmentDistance,
      segmentTravelMinutes,
      estimatedArrival: formatTime(arrivalTime),
      estimatedDeparture: formatTime(departureTime)
    };
  });
}

module.exports = {
  TRAFFIC_FACTORS,
  calculateRouteETA,
  calculateStopETAs,
  formatTime
};
