/**
 * Route.js — Route Planner Frontend Module
 * 
 * Responsibilities:
 * 1. Load drivers, vehicles, pending deliveries into dropdown/checkboxes
 * 2. Let user select driver + vehicle + multiple deliveries
 * 3. Call POST /api/routes/preview to get ordered route
 * 4. Render Leaflet map with markers and route polyline
 * 5. Show route summary (total distance, stop sequence)
 */

// Leaflet map instance (initialized once)
let map = null;
let mapLayers = []; // Track all added layers so we can clear them

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;

  setUserInfo(user);

  // Initialize Leaflet map — wrapped in try/catch so a CDN load failure
  // doesn't block the rest of the page (dropdowns, form, etc.)
  try {
    if (typeof L !== 'undefined') {
      initMap();
    } else {
      console.warn('Leaflet (L) not loaded yet — map will be skipped.');
      document.getElementById('routeMap').innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-muted);font-size:0.875rem;">⚠️ Map could not load. Check your internet connection (OpenStreetMap CDN required).</div>';
    }
  } catch (mapErr) {
    console.error('Map init error:', mapErr);
  }

  // Load dropdown/checkbox data — always runs even if map failed
  await loadPlannerData();

  // Bind the "Generate Route" button
  const btn = document.getElementById('generateRouteBtn');
  if (btn) btn.addEventListener('click', handleGenerateRoute);
});


// ── User info helpers ─────────────────────────────────────────────────────────
function setUserInfo(user) {
  const el = id => document.getElementById(id);
  if (el('userName')) el('userName').textContent = user.name;
  if (el('userRole')) el('userRole').textContent = user.role === 'admin' ? 'Fleet Manager' : 'Driver';
  if (el('userAvatar')) el('userAvatar').textContent = user.name.charAt(0).toUpperCase();
  const logoutBtn = el('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', e => { e.preventDefault(); logout(); });
}

// ── Map Initialization ────────────────────────────────────────────────────────
function initMap() {
  // Create Leaflet map centered on Pune, India
  map = L.map('routeMap').setView([18.5204, 73.8567], 12);

  // Add OpenStreetMap tile layer (free, no API key needed)
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19
  }).addTo(map);
}

// ── Clear all map layers except the base tile layer ──────────────────────────
function clearMapLayers() {
  mapLayers.forEach(layer => map.removeLayer(layer));
  mapLayers = [];
}

// ── Load data for form dropdowns and delivery checkboxes ──────────────────────
async function loadPlannerData() {
  try {
    const res = await fetch('/api/routes/data', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    const result = await res.json();

    if (!result.success) {
      showStatus('Could not load planning data. Make sure the server is running.', 'error');
      return;
    }

    const { drivers, vehicles, deliveries } = result.data;

    // Populate Driver dropdown
    const driverSelect = document.getElementById('selectDriver');
    driverSelect.innerHTML = '<option value="">-- Select Driver --</option>' +
      drivers.map(d => `<option value="${d._id}">${d.name} (${d.availability})</option>`).join('');

    // Populate Vehicle dropdown
    const vehicleSelect = document.getElementById('selectVehicle');
    vehicleSelect.innerHTML = '<option value="">-- Select Vehicle --</option>' +
      vehicles.map(v => `<option value="${v._id}">${v.vehicleNumber} — ${v.vehicleType} | ${v.fuelType} | ${v.mileage} km/L</option>`).join('');

    // Populate Delivery checkboxes
    const deliveryList = document.getElementById('deliveryList');
    if (deliveries.length === 0) {
      deliveryList.innerHTML = '<p style="color:var(--text-muted);font-size:0.875rem;padding:0.5rem 0;">No pending deliveries found. Add some from the Deliveries page.</p>';
      return;
    }

    deliveryList.innerHTML = deliveries.map(d => `
      <label class="delivery-checkbox-item" style="
        display:flex; align-items:flex-start; gap:0.6rem;
        padding:0.65rem 0.75rem; border:1px solid var(--border-color);
        border-radius:var(--radius-sm); margin-bottom:0.5rem; cursor:pointer;
        transition: background 0.15s;
      ">
        <input type="checkbox" value="${d._id}" 
               data-lat="${d.latitude}" data-lng="${d.longitude}"
               data-name="${d.customerName}" data-address="${d.deliveryAddress}"
               data-priority="${d.priority}" data-order="${d.orderId}"
               style="margin-top:3px; cursor:pointer;">
        <div>
          <div style="font-weight:600; font-size:0.875rem;">
            ${d.orderId}
            <span class="badge badge-${d.priority}" style="margin-left:4px">${d.priority}</span>
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted);">${d.customerName} — ${d.deliveryAddress}</div>
          <div style="font-size:0.75rem; color:var(--text-muted);">⏰ ${d.timeWindowStart} – ${d.timeWindowEnd} | 📦 ${d.packageWeight}kg</div>
        </div>
      </label>
    `).join('');

    // Show all pending deliveries as dots on map even before route is generated
    deliveries.forEach(d => {
      const marker = L.circleMarker([d.latitude, d.longitude], {
        radius: 6, color: '#94a3b8', fillColor: '#cbd5e1', fillOpacity: 0.8, weight: 1
      }).addTo(map);
      marker.bindTooltip(`${d.orderId}: ${d.customerName}`, { permanent: false });
      mapLayers.push(marker);
    });

  } catch (err) {
    console.error('Error loading planner data:', err);
    showStatus('Network error loading form data.', 'error');
  }
}

// ── Handle "Generate Route" click ─────────────────────────────────────────────
async function handleGenerateRoute() {
  const driverId = document.getElementById('selectDriver').value;
  const vehicleId = document.getElementById('selectVehicle').value;
  const checkedBoxes = document.querySelectorAll('#deliveryList input[type="checkbox"]:checked');
  const deliveryIds = Array.from(checkedBoxes).map(cb => cb.value);

  // --- Validation ---
  if (!driverId) { showStatus('Please select a driver.', 'error'); return; }
  if (!vehicleId) { showStatus('Please select a vehicle.', 'error'); return; }
  if (deliveryIds.length === 0) { showStatus('Please select at least one delivery.', 'error'); return; }

  // --- Show loading state ---
  const btn = document.getElementById('generateRouteBtn');
  btn.disabled = true;
  btn.textContent = '⏳ Calculating...';
  showStatus('Calculating optimized route...', 'info');

  try {
    const res = await fetch('/api/routes/preview', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ driverId, vehicleId, deliveryIds })
    });

    const result = await res.json();

    if (!result.success) {
      showStatus(result.message || 'Route generation failed.', 'error');
      return;
    }

    // --- Render results ---
    renderRouteOnMap(result.data);
    renderRouteSummary(result.data);
    showStatus('✅ Route generated successfully using Nearest Neighbor algorithm!', 'success');

    // Scroll to results
    document.getElementById('routeResults').scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    console.error('Route generation error:', err);
    showStatus('Network error. Make sure the server is running.', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🗺️ Generate Route';
  }
}

// ── Render route markers and polyline on the Leaflet map ─────────────────────
function renderRouteOnMap(routeData) {
  clearMapLayers();

  const { startPoint, orderedStops, mapMarkers } = routeData;
  const polylinePoints = [];

  // Custom icons
  const driverIcon = L.divIcon({
    html: '🚚',
    className: 'map-emoji-icon',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });

  // Add driver start marker
  const driverMarker = L.marker([startPoint.latitude, startPoint.longitude], { icon: driverIcon })
    .addTo(map)
    .bindPopup(`<strong>🚚 Start Point</strong><br>${mapMarkers[0].label}`);
  mapLayers.push(driverMarker);
  polylinePoints.push([startPoint.latitude, startPoint.longitude]);

  // Add delivery stop markers
  orderedStops.forEach((stop, index) => {
    const stopNumber = index + 1;
    const color = stop.priority === 'urgent' ? '#dc2626' : '#2563eb';

    const stopIcon = L.divIcon({
      html: `<div style="
        background:${color}; color:#fff; border-radius:50%;
        width:26px; height:26px; display:flex; align-items:center;
        justify-content:center; font-weight:700; font-size:13px;
        border:2px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.3);">
        ${stopNumber}
      </div>`,
      className: '',
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    const marker = L.marker([stop.latitude, stop.longitude], { icon: stopIcon })
      .addTo(map)
      .bindPopup(`
        <strong>Stop #${stopNumber}</strong><br>
        <b>${stop.orderId}</b> — ${stop.customerName}<br>
        📍 ${stop.deliveryAddress}<br>
        Priority: <b>${stop.priority}</b><br>
        From previous: <b>${stop.distanceFromPrevious} km</b>
      `);

    mapLayers.push(marker);
    polylinePoints.push([stop.latitude, stop.longitude]);
  });

  // Draw route polyline (dashed line connecting all stops in order)
  const routeLine = L.polyline(polylinePoints, {
    color: '#2563eb',
    weight: 3,
    opacity: 0.75,
    dashArray: '8, 6'
  }).addTo(map);
  mapLayers.push(routeLine);

  // Fit map to show all markers
  map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });
}

// ── Render text summary of the route ─────────────────────────────────────────
function renderRouteSummary(routeData) {
  const { driver, vehicle, orderedStops, totalDistance, startPoint } = routeData;

  const resultsDiv = document.getElementById('routeResults');
  resultsDiv.style.display = 'block';

  // Build each stop card
  const stopsSequenceHtml = orderedStops.map((stop, i) => `
    <div style="text-align:center; color:var(--text-muted); font-size:0.9rem; margin:3px 0;">
      ↓ <small style="color:var(--text-muted);">${stop.distanceFromPrevious} km</small>
    </div>
    <div style="display:flex; align-items:flex-start; gap:0.75rem; padding:0.75rem;
      background:#f8fafc; border-radius:var(--radius-sm); border:1px solid var(--border-color);">
      <div style="
        background:${stop.priority === 'urgent' ? '#dc2626' : '#2563eb'};
        color:#fff; border-radius:50%; width:28px; height:28px; min-width:28px;
        display:flex; align-items:center; justify-content:center;
        font-weight:700; font-size:0.85rem;">${i + 1}</div>
      <div style="flex:1;">
        <div style="font-weight:700; font-size:0.875rem;">
          ${stop.orderId} — ${stop.customerName}
          <span class="badge badge-${stop.priority}">${stop.priority}</span>
        </div>
        <div style="font-size:0.8rem; color:var(--text-muted);">📍 ${stop.deliveryAddress}</div>
        <div style="font-size:0.78rem; color:var(--text-muted); margin-top:2px;">
          📏 ${stop.distanceFromPrevious} km from previous stop
        </div>
      </div>
    </div>
  `).join('');

  document.getElementById('routeSummaryContent').innerHTML = `
    <!-- KPI cards row -->
    <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem; margin-bottom:1.25rem;">
      <div class="kpi-card">
        <div class="kpi-info">
          <h4>Total Distance</h4>
          <div class="kpi-value">${totalDistance} km</div>
          <div class="kpi-subtext">Haversine calculation</div>
        </div>
        <div class="kpi-icon-wrap icon-blue">📍</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-info">
          <h4>Total Stops</h4>
          <div class="kpi-value">${orderedStops.length}</div>
          <div class="kpi-subtext">Deliveries assigned</div>
        </div>
        <div class="kpi-icon-wrap icon-emerald">📦</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-info">
          <h4>Vehicle</h4>
          <div class="kpi-value" style="font-size:1rem;">${vehicle.vehicleNumber}</div>
          <div class="kpi-subtext">${vehicle.vehicleType} | ${vehicle.fuelType} | ${vehicle.mileage} km/L</div>
        </div>
        <div class="kpi-icon-wrap icon-amber">🚐</div>
      </div>
    </div>

    <!-- Sequence header -->
    <h4 style="margin-bottom:0.75rem; font-size:0.95rem;">📋 Optimized Stop Sequence</h4>

    <!-- Driver start point -->
    <div style="display:flex; align-items:center; gap:0.75rem; padding:0.65rem 0.75rem;
      background:#ecfdf5; border-radius:var(--radius-sm); border:1px solid #bbf7d0;">
      <span style="font-size:1.3rem;">🚚</span>
      <div>
        <div style="font-weight:700; font-size:0.875rem;">START — Driver: ${driver.name}</div>
        <div style="font-size:0.78rem; color:var(--text-muted);">
          📍 ${startPoint.latitude.toFixed(4)}, ${startPoint.longitude.toFixed(4)}
        </div>
      </div>
    </div>

    <!-- Ordered stops -->
    ${stopsSequenceHtml}

    <!-- End marker -->
    <div style="text-align:center; color:var(--text-muted); font-size:0.9rem; margin:3px 0;">↓</div>
    <div style="display:flex; align-items:center; gap:0.75rem; padding:0.65rem 0.75rem;
      background:#faf5ff; border-radius:var(--radius-sm); border:1px solid #e9d5ff; margin-top:4px;">
      <span style="font-size:1.3rem;">🏁</span>
      <div style="font-weight:700; font-size:0.875rem;">END — All ${orderedStops.length} deliveries complete</div>
    </div>

    <!-- Day 4 notice -->
    <div style="margin-top:1rem; padding:0.75rem; background:#fffbeb; border:1px solid #fde68a;
      border-radius:var(--radius-sm); font-size:0.8rem; color:#92400e;">
      ⚠️ <strong>Day 3 Note:</strong> This uses basic Nearest Neighbor distance ordering.
      Traffic impact, fuel cost, delivery priority scoring, and ETA will be added in <strong>Day 4</strong>.
    </div>
  `;
}


// ── Status message helper ─────────────────────────────────────────────────────
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
