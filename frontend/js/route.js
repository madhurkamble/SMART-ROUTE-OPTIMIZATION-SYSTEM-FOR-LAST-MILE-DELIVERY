/**
 * Route.js — Smart Route Optimization Frontend Module (Day 4)
 *
 * Handles:
 * 1. Loading drivers, vehicles, and pending deliveries
 * 2. Traffic level selection (Low 1.0x, Medium 1.2x, High 1.5x)
 * 3. User configurable fuel prices
 * 4. Priority-aware Nearest Neighbor Route Optimization API calls
 * 5. Dynamic Route Recalculation under changing traffic conditions
 * 6. Saving & Dispatching routes to MongoDB
 * 7. Leaflet map visualization with color-coded traffic route lines & stop markers
 */

let map = null;
let mapLayers = [];
let currentActiveRouteId = null; // Stored when route is persisted or recalculated

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;

  setUserInfo(user);

  // Initialize Leaflet map safely
  try {
    if (typeof L !== 'undefined') {
      initMap();
    } else {
      console.warn('Leaflet library not ready');
      document.getElementById('routeMap').innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.875rem;">⚠️ Map unavailable offline. Route calculations will still function.</div>';
    }
  } catch (err) {
    console.error('Map init error:', err);
  }

  // Load dropdowns and delivery list
  await loadPlannerData();

  // Attach event handlers
  setupEventListeners();
});

function setUserInfo(user) {
  const el = id => document.getElementById(id);
  if (el('userName')) el('userName').textContent = user.name;
  if (el('userRole')) el('userRole').textContent = user.role === 'admin' ? 'Fleet Manager' : 'Driver';
  if (el('userAvatar')) el('userAvatar').textContent = user.name.charAt(0).toUpperCase();
  const logoutBtn = el('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', e => { e.preventDefault(); logout(); });
}

function initMap() {
  map = L.map('routeMap', {
    zoomControl: true,
    attributionControl: true
  }).setView([18.5204, 73.8567], 12);

  // Reliable OpenStreetMap tile layer with subdomains & buffer
  const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
    keepBuffer: 6,
    updateWhenIdle: false,
    updateWhenZooming: true
  }).addTo(map);

  // Automatically retry failed/dropped tiles so grey boxes never remain
  tileLayer.on('tileerror', function(error) {
    if (error && error.tile) {
      setTimeout(() => {
        const src = error.tile.src;
        if (!src.includes('&retry=1')) {
          error.tile.src = src + (src.includes('?') ? '&' : '?') + 'retry=1';
        }
      }, 800);
    }
  });

  // Re-calculate size after initial layout render
  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 200);

  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 600);

  window.addEventListener('resize', () => {
    if (map) map.invalidateSize();
  });
}

function clearMapLayers() {
  if (!map) return;
  mapLayers.forEach(l => map.removeLayer(l));
  mapLayers = [];
}

function setupEventListeners() {
  // Traffic radio button styling
  const trafficRadios = document.querySelectorAll('input[name="trafficLevel"]');
  trafficRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      document.getElementById('labelTrafficLow').className = 'traffic-radio-btn' + (e.target.value === 'low' ? ' selected-low' : '');
      document.getElementById('labelTrafficMedium').className = 'traffic-radio-btn' + (e.target.value === 'medium' ? ' selected-medium' : '');
      document.getElementById('labelTrafficHigh').className = 'traffic-radio-btn' + (e.target.value === 'high' ? ' selected-high' : '');
    });
  });

  // Select all deliveries toggle
  const selectAllBtn = document.getElementById('selectAllBtn');
  if (selectAllBtn) {
    let allSelected = false;
    selectAllBtn.addEventListener('click', () => {
      const boxes = document.querySelectorAll('#deliveryList input[type="checkbox"]');
      allSelected = !allSelected;
      boxes.forEach(cb => cb.checked = allSelected);
      selectAllBtn.textContent = allSelected ? 'Deselect All' : 'Select All';
    });
  }

  // Optimize & Preview Button
  const optimizeBtn = document.getElementById('optimizeRouteBtn');
  if (optimizeBtn) {
    optimizeBtn.addEventListener('click', () => runRouteAction(false));
  }

  // Save & Dispatch Button
  const saveBtn = document.getElementById('saveDispatchBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => runRouteAction(true));
  }

  // Recalculate Route Button
  const recalcBtn = document.getElementById('recalculateBtn');
  if (recalcBtn) {
    recalcBtn.addEventListener('click', handleRecalculateRoute);
  }
}

async function loadPlannerData() {
  try {
    const res = await fetch('/api/routes/data', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    const result = await res.json();

    if (!result.success) {
      showStatus('Could not load planning data from backend.', 'error');
      return;
    }

    const { drivers, vehicles, deliveries } = result.data;

    // Driver dropdown
    const driverSelect = document.getElementById('selectDriver');
    driverSelect.innerHTML = '<option value="">-- Select Driver --</option>' +
      drivers.map(d => `<option value="${d._id}">${d.name} (${d.availability.replace('_', ' ')})</option>`).join('');

    // Vehicle dropdown
    const vehicleSelect = document.getElementById('selectVehicle');
    vehicleSelect.innerHTML = '<option value="">-- Select Vehicle --</option>' +
      vehicles.map(v => `<option value="${v._id}">${v.vehicleNumber} (${v.vehicleType.toUpperCase()} - ${v.mileage} km/L, ${v.fuelType})</option>`).join('');

    // Delivery checkboxes
    const deliveryList = document.getElementById('deliveryList');
    if (deliveries.length === 0) {
      deliveryList.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem;padding:0.5rem 0;">No pending deliveries found.</p>';
      return;
    }

    deliveryList.innerHTML = deliveries.map(d => `
      <label class="delivery-checkbox-item" style="
        display:flex; align-items:flex-start; gap:0.6rem;
        padding:0.6rem 0.75rem; border:1px solid var(--border-color);
        border-radius:var(--radius-sm); margin-bottom:0.45rem; cursor:pointer;
        background: #fff;
      ">
        <input type="checkbox" value="${d._id}" checked
               data-lat="${d.latitude}" data-lng="${d.longitude}"
               data-priority="${d.priority}" data-order="${d.orderId}"
               style="margin-top:3px; cursor:pointer;">
        <div style="flex:1;">
          <div style="font-weight:600; font-size:0.85rem; display:flex; justify-content:space-between;">
            <span>${d.orderId}</span>
            <span class="badge badge-${d.priority}">${d.priority}</span>
          </div>
          <div style="font-size:0.78rem; color:var(--text-muted);">${d.customerName} — ${d.deliveryAddress}</div>
        </div>
      </label>
    `).join('');

    // Pre-mark delivery pins on map if map exists
    if (map) {
      clearMapLayers();
      deliveries.forEach(d => {
        const marker = L.circleMarker([d.latitude, d.longitude], {
          radius: 6,
          color: d.priority === 'urgent' ? '#dc2626' : '#2563eb',
          fillColor: d.priority === 'urgent' ? '#fee2e2' : '#dbeafe',
          fillOpacity: 0.9,
          weight: 2
        }).addTo(map);
        marker.bindTooltip(`${d.orderId}: ${d.customerName} (${d.priority})`);
        mapLayers.push(marker);
      });
    }

  } catch (err) {
    console.error('Error loading planner data:', err);
    showStatus('Failed to connect to backend server.', 'error');
  }
}

function getSelectedFuelPrices() {
  return {
    petrol: parseFloat(document.getElementById('fuelPricePetrol')?.value) || 104.0,
    diesel: parseFloat(document.getElementById('fuelPriceDiesel')?.value) || 91.0,
    electric: parseFloat(document.getElementById('fuelPriceEV')?.value) || 8.5
  };
}

function getSelectedTrafficCondition() {
  const selected = document.querySelector('input[name="trafficLevel"]:checked');
  return selected ? selected.value : 'medium';
}

/**
 * Run Route Optimization — either as Preview or Persisted Save & Dispatch
 */
async function runRouteAction(shouldSave = false) {
  const driverId = document.getElementById('selectDriver').value;
  const vehicleId = document.getElementById('selectVehicle').value;
  const checkedBoxes = document.querySelectorAll('#deliveryList input[type="checkbox"]:checked');
  const deliveryIds = Array.from(checkedBoxes).map(cb => cb.value);
  const trafficCondition = getSelectedTrafficCondition();
  const customFuelPrices = getSelectedFuelPrices();

  if (!driverId) { showStatus('Please select a driver from the list.', 'error'); return; }
  if (!vehicleId) { showStatus('Please select a vehicle from the fleet.', 'error'); return; }
  if (deliveryIds.length === 0) { showStatus('Please select at least one delivery order.', 'error'); return; }

  const endpoint = shouldSave ? '/api/routes/optimize' : '/api/routes/preview';
  const actionBtn = document.getElementById(shouldSave ? 'saveDispatchBtn' : 'optimizeRouteBtn');
  const originalText = actionBtn.textContent;

  actionBtn.disabled = true;
  actionBtn.textContent = '⏳ Optimizing...';
  showStatus(`Computing priority-aware route under ${trafficCondition.toUpperCase()} traffic...`, 'info');

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        driverId,
        vehicleId,
        deliveryIds,
        trafficCondition,
        customFuelPrices
      })
    });

    const result = await res.json();

    if (!result.success) {
      showStatus(result.message || 'Route optimization failed.', 'error');
      return;
    }

    currentActiveRouteId = result.routeDatabaseId || result.routeId || null;

    renderRouteOnMap(result.data, trafficCondition);
    renderRouteSummary(result.data, shouldSave);

    showStatus(
      shouldSave
        ? `✅ Route #${result.routeId} saved & dispatched to driver! Deliveries updated.`
        : `✅ Route optimized! Score: ${result.data.scoringBreakdown.routeScore}. Ready for dispatch.`,
      'success'
    );

    document.getElementById('routeResults').scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error('Optimization error:', err);
    showStatus('Network error while running route optimization.', 'error');
  } finally {
    actionBtn.disabled = false;
    actionBtn.textContent = originalText;
  }
}

/**
 * Handle Dynamic Recalculation under updated traffic condition
 */
async function handleRecalculateRoute() {
  const newTraffic = document.getElementById('recalculateTrafficSelect').value;
  const customFuelPrices = getSelectedFuelPrices();

  if (!currentActiveRouteId) {
    // If user hasn't saved yet, just re-run preview with the new traffic condition
    document.querySelector(`input[name="trafficLevel"][value="${newTraffic}"]`).checked = true;
    document.querySelector(`input[name="trafficLevel"][value="${newTraffic}"]`).dispatchEvent(new Event('change'));
    await runRouteAction(false);
    return;
  }

  const recalcBtn = document.getElementById('recalculateBtn');
  recalcBtn.disabled = true;
  recalcBtn.textContent = '⏳ Recalculating...';
  showStatus(`Recalculating route metrics for ${newTraffic.toUpperCase()} traffic...`, 'info');

  try {
    const res = await fetch(`/api/routes/${currentActiveRouteId}/recalculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({
        trafficCondition: newTraffic,
        customFuelPrices
      })
    });

    const result = await res.json();

    if (!result.success) {
      showStatus(result.message || 'Recalculation failed.', 'error');
      return;
    }

    renderRouteOnMap(result.data, newTraffic);
    renderRouteSummary(result.data, false, true);

    showStatus(`⚡ Route dynamically recalculated for ${newTraffic.toUpperCase()} traffic! ETA and fuel costs adjusted.`, 'success');

  } catch (err) {
    console.error('Recalculation error:', err);
    showStatus('Network error during route recalculation.', 'error');
  } finally {
    recalcBtn.disabled = false;
    recalcBtn.textContent = '⚡ Recalculate Route';
  }
}

/**
 * Draw ordered route markers and traffic-colored polyline on the Leaflet map
 */
function renderRouteOnMap(routeData, trafficCondition = 'medium') {
  if (!map) return;
  clearMapLayers();

  const { startPoint, orderedStops } = routeData;
  const polylinePoints = [];

  // 1. Driver Start Marker
  if (startPoint) {
    const driverIcon = L.divIcon({
      html: '<div style="background:#0f172a;color:#fff;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;font-size:18px;border:2px solid #fff;box-shadow:0 3px 6px rgba(0,0,0,0.35);">🚚</div>',
      className: 'map-emoji-icon',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const driverMarker = L.marker([startPoint.latitude, startPoint.longitude], { icon: driverIcon })
      .addTo(map)
      .bindPopup(`<strong>🚚 Route Origin (Driver Location)</strong><br>${startPoint.label || 'Origin'}`);
    mapLayers.push(driverMarker);
    polylinePoints.push([startPoint.latitude, startPoint.longitude]);
  }

  // 2. Delivery Stops Markers
  orderedStops.forEach((stop, index) => {
    const isUrgent = stop.priority === 'urgent';
    const markerColor = isUrgent ? '#dc2626' : '#2563eb';
    const badgeIcon = isUrgent ? '🔥' : '';

    const stopIcon = L.divIcon({
      html: `<div style="
        background:${markerColor}; color:#fff; border-radius:50%;
        width:28px; height:28px; display:flex; align-items:center;
        justify-content:center; font-weight:700; font-size:12px;
        border:2px solid #fff; box-shadow:0 2px 5px rgba(0,0,0,0.3);">
        ${stop.stopNumber || index + 1}
      </div>`,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon })
      .addTo(map)
      .bindPopup(`
        <strong>Stop #${stop.stopNumber || index + 1} ${badgeIcon}</strong><br>
        <b>Order:</b> ${stop.orderId} (${stop.customerName})<br>
        <b>Address:</b> ${stop.deliveryAddress}<br>
        <b>Priority:</b> <span class="badge badge-${stop.priority}">${stop.priority}</span><br>
        <b>Distance:</b> ${stop.distanceFromPrevious || 0} km<br>
        <b>Est. Arrival:</b> ⏰ <strong>${stop.estimatedArrival || 'TBD'}</strong>
      `);

    mapLayers.push(marker);
    polylinePoints.push([stop.latitude, stop.longitude]);
  });

  // 3. Traffic-Aware Polyline Color
  const trafficColors = {
    low: '#16a34a',     // Green for free flow
    medium: '#2563eb',  // Blue for normal
    high: '#dc2626'     // Red for congested
  };
  const lineColor = trafficColors[trafficCondition] || '#2563eb';

  const routeLine = L.polyline(polylinePoints, {
    color: lineColor,
    weight: 4,
    opacity: 0.85,
    dashArray: trafficCondition === 'high' ? '6, 6' : '10, 5'
  }).addTo(map);
  mapLayers.push(routeLine);

  map.fitBounds(routeLine.getBounds(), { padding: [45, 45] });
}

/**
 * Render complete route analysis and sequencing cards
 */
function renderRouteSummary(routeData, wasDispatched = false, wasRecalculated = false) {
  const {
    driver,
    vehicle,
    orderedStops,
    totalDistanceKm,
    etaSummary,
    fuelSummary,
    scoringBreakdown,
    startPoint
  } = routeData;

  const resultsDiv = document.getElementById('routeResults');
  resultsDiv.style.display = 'block';

  const routeBadge = document.getElementById('routeBadge');
  if (routeBadge) {
    if (wasDispatched) {
      routeBadge.className = 'badge badge-completed';
      routeBadge.textContent = 'Dispatched to Fleet';
    } else if (wasRecalculated) {
      routeBadge.className = 'badge badge-active';
      routeBadge.textContent = 'Dynamic Recalculation Applied';
    } else {
      routeBadge.className = 'badge badge-assigned';
      routeBadge.textContent = 'Optimized Preview';
    }
  }

  // Stop sequence cards
  const stopsHtml = orderedStops.map((stop, i) => {
    const isUrgent = stop.priority === 'urgent';
    return `
      <div style="text-align:center; color:var(--text-muted); font-size:0.85rem; margin:2px 0;">
        ↓ <small style="color:var(--text-muted); font-weight:600;">+${stop.distanceFromPrevious || 0} km | drive ~${stop.segmentTravelMinutes || 5} min</small>
      </div>
      <div style="display:flex; align-items:flex-start; gap:0.75rem; padding:0.75rem 1rem;
        background:${isUrgent ? '#fef2f2' : '#f8fafc'};
        border-radius:var(--radius-sm);
        border:1px solid ${isUrgent ? '#fecaca' : 'var(--border-color)'};">
        <div style="
          background:${isUrgent ? '#dc2626' : '#2563eb'};
          color:#fff; border-radius:50%; width:28px; height:28px; min-width:28px;
          display:flex; align-items:center; justify-content:center;
          font-weight:700; font-size:0.85rem;">
          ${stop.stopNumber || i + 1}
        </div>
        <div style="flex:1;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.25rem;">
            <span style="font-weight:700; font-size:0.9rem;">
              ${stop.orderId} — ${stop.customerName}
            </span>
            <span class="badge badge-${stop.priority}">${stop.priority.toUpperCase()}</span>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">
            📍 ${stop.deliveryAddress}
          </div>
          <div style="display:flex; gap:1.25rem; font-size:0.78rem; color:var(--text-muted); margin-top:4px; flex-wrap:wrap;">
            <span>⏰ Est. Arrival: <strong style="color:var(--text-main);">${stop.estimatedArrival || 'TBD'}</strong></span>
            <span>🏁 Departure: <strong style="color:var(--text-main);">${stop.estimatedDeparture || 'TBD'}</strong></span>
            <span>📦 Service Time: <strong>5 mins</strong></span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const trafficLabel = etaSummary.trafficCondition.toUpperCase();
  const trafficFactorText = `${etaSummary.trafficFactor}x`;

  document.getElementById('routeSummaryContent').innerHTML = `
    <!-- Top KPI metrics grid -->
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:1rem; margin-bottom:1.5rem;">
      <div class="kpi-card">
        <div class="kpi-info">
          <h4>Total Distance</h4>
          <div class="kpi-value">${totalDistanceKm} km</div>
          <div class="kpi-subtext">Haversine optimized</div>
        </div>
        <div class="kpi-icon-wrap icon-blue">📍</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-info">
          <h4>Est. Duration</h4>
          <div class="kpi-value">${etaSummary.formattedDuration}</div>
          <div class="kpi-subtext">${etaSummary.drivingMinutes}m drive + ${etaSummary.serviceMinutes}m service</div>
        </div>
        <div class="kpi-icon-wrap icon-amber">⏱️</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-info">
          <h4>Final Stop ETA</h4>
          <div class="kpi-value">${etaSummary.estimatedETA}</div>
          <div class="kpi-subtext">Departure from ${etaSummary.startTime}</div>
        </div>
        <div class="kpi-icon-wrap icon-emerald">🕒</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-info">
          <h4>Fuel Expense</h4>
          <div class="kpi-value">₹${fuelSummary.totalCost.toFixed(2)}</div>
          <div class="kpi-subtext">${fuelSummary.fuelConsumed} ${fuelSummary.unitLabel} (₹${fuelSummary.costPerDelivery}/stop)</div>
        </div>
        <div class="kpi-icon-wrap icon-amber">⛽</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-info">
          <h4>Traffic Factor</h4>
          <div class="kpi-value">${trafficLabel}</div>
          <div class="kpi-subtext">${trafficFactorText} delay multiplier</div>
        </div>
        <div class="kpi-icon-wrap icon-purple">🚦</div>
      </div>

      <div class="kpi-card">
        <div class="kpi-info">
          <h4>Route Score</h4>
          <div class="kpi-value">${scoringBreakdown.routeScore}</div>
          <div class="kpi-subtext">Lower = more efficient</div>
        </div>
        <div class="kpi-icon-wrap icon-emerald">🏆</div>
      </div>
    </div>

    <!-- Scoring Formula Breakdown Alert -->
    <div style="background:#f1f5f9; border-left:4px solid var(--primary); padding:0.75rem 1rem; border-radius:0 var(--radius-sm) var(--radius-sm) 0; margin-bottom:1.5rem; font-size:0.82rem;">
      <strong>📊 Route Scoring Formula:</strong><br>
      <code>Route Score = (Dist * 1.5) + Traffic Penalty + Fuel Cost - Urgent Priority Bonus</code><br>
      = <span>(${totalDistanceKm} * 1.5 = ${scoringBreakdown.distanceCost})</span>
      + <span>(Traffic = ${scoringBreakdown.trafficCost})</span>
      + <span>(Fuel = ₹${scoringBreakdown.fuelCost})</span>
      - <span>(Priority Bonus = ${scoringBreakdown.priorityBenefit})</span>
      = <strong>${scoringBreakdown.routeScore}</strong>
    </div>

    <!-- Stop Sequence -->
    <h4 style="margin-bottom:0.75rem; font-size:0.95rem;">
      📋 Optimized Stop-by-Stop Dispatch Sequence (${orderedStops.length} stops)
    </h4>

    <!-- Driver Origin -->
    <div style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1rem;
      background:#ecfdf5; border-radius:var(--radius-sm); border:1px solid #bbf7d0;">
      <span style="font-size:1.4rem;">🚚</span>
      <div>
        <div style="font-weight:700; font-size:0.88rem;">START: Driver Departure Location</div>
        <div style="font-size:0.78rem; color:var(--text-muted);">
          Driver: ${driver.name || 'Rahul Sharma'} | Departure: <strong>${etaSummary.startTime}</strong>
        </div>
      </div>
    </div>

    <!-- Stop items -->
    ${stopsHtml}

    <!-- Route Completion -->
    <div style="text-align:center; color:var(--text-muted); font-size:0.85rem; margin:2px 0;">↓</div>
    <div style="display:flex; align-items:center; gap:0.75rem; padding:0.75rem 1rem;
      background:#faf5ff; border-radius:var(--radius-sm); border:1px solid #e9d5ff;">
      <span style="font-size:1.4rem;">🏁</span>
      <div>
        <div style="font-weight:700; font-size:0.88rem;">FINISH: All ${orderedStops.length} Deliveries Completed</div>
        <div style="font-size:0.78rem; color:var(--text-muted);">
          Total Distance: <strong>${totalDistanceKm} km</strong> | Final ETA: <strong>${etaSummary.estimatedETA}</strong>
        </div>
      </div>
    </div>
  `;
}

function showStatus(msg, type = 'info') {
  const el = document.getElementById('plannerStatus');
  if (!el) return;
  const colors = {
    info: { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af' },
    success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#15803d' },
    error: { bg: '#fef2f2', border: '#fecaca', color: '#b91c1c' }
  };
  const c = colors[type] || colors.info;
  el.style.cssText = `display:block; padding:0.75rem 1rem; border-radius:var(--radius-sm); margin-bottom:1rem; background:${c.bg}; border:1px solid ${c.border}; color:${c.color}; font-size:0.875rem;`;
  el.textContent = msg;
}
