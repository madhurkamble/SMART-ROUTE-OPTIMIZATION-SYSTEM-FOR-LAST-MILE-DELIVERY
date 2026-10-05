/**
 * Driver.js — Driver Execution Panel & Roster Management (Day 5)
 *
 * Handles:
 * 1. Active driver route loading and live status monitoring
 * 2. Updating delivery status (Pending -> Out for Delivery -> Completed / Failed)
 * 3. Reporting delivery issues (traffic, vehicle breakdown, customer unavailable)
 * 4. Interactive Leaflet map rendering driver position and stop statuses
 * 5. Driver roster management (inherited and preserved from Day 2)
 */

let driverMap = null;
let driverMapLayers = [];
let currentActiveRoute = null;
let currentSelectedDriverId = null;
let allDriversList = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;

  setUserInfo(user);

  // Tab switching setup
  setupTabSwitching();

  // Initialize Leaflet map safely
  try {
    if (typeof L !== 'undefined') {
      initDriverMap();
    }
  } catch (err) {
    console.warn('Map initialization failed:', err);
  }

  // Load drivers list first
  await loadDriversList();

  // Determine which driver to display:
  // If user is 'driver' role, match their email/name, otherwise default to first driver (Rahul Sharma)
  if (user.role === 'driver') {
    const matched = allDriversList.find(d =>
      d.email.toLowerCase() === user.email.toLowerCase() ||
      d.name.toLowerCase().includes(user.name.toLowerCase())
    );
    currentSelectedDriverId = matched ? matched._id : (allDriversList[0] ? allDriversList[0]._id : null);
  } else {
    currentSelectedDriverId = allDriversList[0] ? allDriversList[0]._id : null;
  }

  // Populate driver switcher dropdown
  populateDriverSwitcher();

  // Load active route for the selected driver
  if (currentSelectedDriverId) {
    await loadDriverActiveRoute(currentSelectedDriverId);
  }

  // Setup form listeners
  const driverForm = document.getElementById('driverForm');
  if (driverForm) driverForm.addEventListener('submit', handleAddDriver);

  const issueForm = document.getElementById('reportIssueForm');
  if (issueForm) issueForm.addEventListener('submit', handleReportIssue);
});

function setUserInfo(user) {
  const el = id => document.getElementById(id);
  if (el('userName')) el('userName').textContent = user.name;
  if (el('userRole')) el('userRole').textContent = user.role === 'admin' ? 'Fleet Manager' : 'Driver';
  if (el('userAvatar')) el('userAvatar').textContent = user.name.charAt(0).toUpperCase();
  const logoutBtn = el('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', e => { e.preventDefault(); logout(); });
}

function setupTabSwitching() {
  const tabExecution = document.getElementById('tabExecution');
  const tabRoster = document.getElementById('tabRoster');
  const viewExecution = document.getElementById('viewExecution');
  const viewRoster = document.getElementById('viewRoster');

  if (tabExecution && tabRoster) {
    tabExecution.addEventListener('click', () => {
      tabExecution.className = 'btn btn-primary btn-sm';
      tabRoster.className = 'btn btn-outline btn-sm';
      viewExecution.style.display = 'block';
      viewRoster.style.display = 'none';
      if (driverMap) {
        setTimeout(() => driverMap.invalidateSize(), 200);
      }
    });

    tabRoster.addEventListener('click', () => {
      tabRoster.className = 'btn btn-primary btn-sm';
      tabExecution.className = 'btn btn-outline btn-sm';
      viewExecution.style.display = 'none';
      viewRoster.style.display = 'block';
    });
  }
}

function initDriverMap() {
  const mapElem = document.getElementById('driverRouteMap');
  if (!mapElem) return;
  driverMap = L.map('driverRouteMap', {
    zoomControl: true
  }).setView([18.5204, 73.8567], 12);

  const tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
    subdomains: ['a', 'b', 'c'],
    keepBuffer: 6,
    updateWhenIdle: false,
    updateWhenZooming: true
  }).addTo(driverMap);

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

  setTimeout(() => {
    if (driverMap) driverMap.invalidateSize();
  }, 200);

  setTimeout(() => {
    if (driverMap) driverMap.invalidateSize();
  }, 600);

  window.addEventListener('resize', () => {
    if (driverMap) driverMap.invalidateSize();
  });
}

function clearDriverMapLayers() {
  if (!driverMap) return;
  driverMapLayers.forEach(l => driverMap.removeLayer(l));
  driverMapLayers = [];
}

async function loadDriversList() {
  try {
    const res = await fetch('/api/drivers', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    const result = await res.json();
    if (result.success) {
      allDriversList = result.data;
      renderDriversTable();
      updateDriverRosterStatBar();
    }
  } catch (err) {
    console.error('Error loading drivers:', err);
  }
}

function populateDriverSwitcher() {
  const switcher = document.getElementById('driverSwitcherSelect');
  if (!switcher) return;

  switcher.innerHTML = allDriversList.map(d =>
    `<option value="${d._id}" ${d._id === currentSelectedDriverId ? 'selected' : ''}>
      ${d.name} (${d.availability.replace('_', ' ')})
    </option>`
  ).join('');

  switcher.addEventListener('change', async (e) => {
    currentSelectedDriverId = e.target.value;
    await loadDriverActiveRoute(currentSelectedDriverId);
  });
}

/**
 * Fetch and render the active route and delivery stops for a driver
 */
async function loadDriverActiveRoute(driverId) {
  const emptyView = document.getElementById('driverEmptyRoute');
  const detailsView = document.getElementById('driverActiveRouteDetails');

  try {
    const res = await fetch(`/api/routes/driver/${driverId}`, {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    const result = await res.json();

    if (!result.success || !result.data) {
      if (emptyView) emptyView.style.display = 'block';
      if (detailsView) detailsView.style.display = 'none';
      clearDriverMapLayers();
      return;
    }

    currentActiveRoute = result.data;
    if (emptyView) emptyView.style.display = 'none';
    if (detailsView) detailsView.style.display = 'block';

    renderDriverRouteHeader(currentActiveRoute);
    renderDriverStopsList(currentActiveRoute.stops || []);
    renderDriverMap(currentActiveRoute);

  } catch (err) {
    console.error('Error loading driver route:', err);
    if (emptyView) emptyView.style.display = 'block';
    if (detailsView) detailsView.style.display = 'none';
  }
}

function renderDriverRouteHeader(route) {
  const update = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  update('activeDriverName', route.driver?.name || 'Driver');
  update('activeDriverVehicle', route.vehicle?.vehicleNumber ? `${route.vehicle.vehicleNumber} (${route.vehicle.vehicleType})` : 'Assigned Van');
  update('activeRouteId', route.routeId || 'ACTIVE-DISPATCH');
  update('activeRouteDistance', `${route.totalDistanceKm || 15} km`);
  update('activeRouteETA', route.estimatedETA || 'TBD');

  const stops = route.stops || [];
  const completedCount = stops.filter(s => s.status === 'completed').length;
  update('activeRouteStopsProgress', `${completedCount} / ${stops.length} Completed`);
}

function renderDriverStopsList(stops) {
  const container = document.getElementById('driverStopsContainer');
  if (!container) return;

  if (stops.length === 0) {
    container.innerHTML = '<div style="padding:1.5rem; text-align:center; color:var(--text-muted)">No stops found in this route.</div>';
    return;
  }

  container.innerHTML = stops.map((stop, idx) => {
    const isUrgent = stop.priority === 'urgent';
    const isCompleted = stop.status === 'completed';
    const isOut = stop.status === 'out_for_delivery';
    const isFailed = stop.status === 'failed';

    let badgeClass = 'badge-standard';
    let statusText = 'Pending';
    if (isCompleted) { badgeClass = 'badge-completed'; statusText = 'Completed'; }
    else if (isOut) { badgeClass = 'badge-active'; statusText = 'Out for Delivery'; }
    else if (isFailed) { badgeClass = 'badge-urgent'; statusText = 'Failed'; }

    return `
      <div class="card" style="padding:1rem; margin-bottom:0.85rem; border:1.5px solid ${isCompleted ? '#bbf7d0' : (isUrgent ? '#fecaca' : 'var(--border-color)')}; background:${isCompleted ? '#f0fdf4' : '#fff'}; border-radius:var(--radius-md);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.5rem; flex-wrap:wrap; gap:0.5rem;">
          <div style="display:flex; align-items:center; gap:0.5rem;">
            <span style="background:${isCompleted ? '#16a34a' : (isUrgent ? '#dc2626' : '#2563eb')}; color:#fff; border-radius:50%; width:24px; height:24px; display:inline-flex; align-items:center; justify-content:center; font-weight:700; font-size:0.75rem;">
              ${idx + 1}
            </span>
            <strong>${stop.orderId}</strong>
            <span class="badge ${badgeClass}">${statusText}</span>
            ${isUrgent ? '<span class="badge badge-urgent">URGENT</span>' : ''}
          </div>
          <div style="font-size:0.8rem; color:var(--text-muted);">
            ⏰ Planned ETA: <strong>${stop.estimatedArrival || 'TBD'}</strong>
          </div>
        </div>

        <div style="margin-bottom:0.75rem; font-size:0.88rem;">
          <div><strong>${stop.customerName}</strong> &bull; <a href="tel:${stop.customerPhone || ''}" style="color:var(--primary); text-decoration:none;">📞 ${stop.customerPhone || 'N/A'}</a></div>
          <div style="color:var(--text-muted); font-size:0.82rem; margin-top:2px;">📍 ${stop.deliveryAddress}</div>
        </div>

        <!-- ACTION BUTTONS -->
        <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
          ${!isCompleted && !isFailed ? `
            ${!isOut ? `
              <button class="btn btn-outline btn-sm" onclick="updateDeliveryStatus('${stop.delivery}', 'out_for_delivery')">
                🚀 Out for Delivery
              </button>
            ` : ''}
            <button class="btn btn-primary btn-sm" onclick="updateDeliveryStatus('${stop.delivery}', 'completed')">
              ✅ Mark Completed
            </button>
            <button class="btn btn-outline btn-sm" style="color:var(--danger); border-color:#fecaca;" onclick="openIssueModal('${stop.delivery}', '${stop.orderId}')">
              ⚠️ Report Issue
            </button>
          ` : `
            <span style="font-size:0.8rem; color:${isCompleted ? 'var(--success)' : 'var(--danger)'}; font-weight:600;">
              ${isCompleted ? '🎉 Package successfully delivered' : '❌ Delivery marked failed'}
            </span>
          `}
        </div>
      </div>
    `;
  }).join('');
}

function renderDriverMap(route) {
  if (!driverMap) return;
  clearDriverMapLayers();

  const stops = route.stops || [];
  if (stops.length === 0) return;

  const points = [];

  stops.forEach((stop, idx) => {
    const isCompleted = stop.status === 'completed';
    const isUrgent = stop.priority === 'urgent';
    const color = isCompleted ? '#16a34a' : (isUrgent ? '#dc2626' : '#2563eb');

    const icon = L.divIcon({
      html: `<div style="background:${color}; color:#fff; border-radius:50%; width:26px; height:26px; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:12px; border:2px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.3);">${idx + 1}</div>`,
      className: '',
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    const marker = L.marker([stop.latitude, stop.longitude], { icon })
      .addTo(driverMap)
      .bindPopup(`
        <strong>Stop #${idx + 1}: ${stop.orderId}</strong><br>
        Customer: ${stop.customerName}<br>
        Status: <b>${stop.status.replace('_', ' ')}</b><br>
        ETA: <b>${stop.estimatedArrival || 'TBD'}</b>
      `);

    driverMapLayers.push(marker);
    points.push([stop.latitude, stop.longitude]);
  });

  if (points.length > 1) {
    const line = L.polyline(points, {
      color: '#2563eb',
      weight: 3,
      opacity: 0.8,
      dashArray: '6, 6'
    }).addTo(driverMap);
    driverMapLayers.push(line);
    driverMap.fitBounds(line.getBounds(), { padding: [35, 35] });
  } else if (points.length === 1) {
    driverMap.setView(points[0], 14);
  }
}

/**
 * Driver status update action (out_for_delivery, completed, failed)
 */
async function updateDeliveryStatus(deliveryId, newStatus) {
  try {
    const res = await fetch(`/api/deliveries/${deliveryId}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ status: newStatus })
    });

    const result = await res.json();
    if (result.success) {
      showToast(`Status updated to ${newStatus.replace('_', ' ')}! ✅`, 'success');
      // Reload route details to refresh stops and map
      await loadDriverActiveRoute(currentSelectedDriverId);
      await loadDriversList();
    } else {
      showToast(result.message || 'Status update failed', 'error');
    }
  } catch (err) {
    showToast('Network error while updating status', 'error');
  }
}

/**
 * Issue Reporting Modal & Flow
 */
let targetIssueDeliveryId = null;

function openIssueModal(deliveryId, orderId) {
  targetIssueDeliveryId = deliveryId;
  const label = document.getElementById('issueOrderIdLabel');
  if (label) label.textContent = orderId;
  openModal('reportIssueModal');
}

async function handleReportIssue(e) {
  e.preventDefault();
  if (!targetIssueDeliveryId) return;

  const issueType = document.getElementById('issueTypeSelect').value;
  const description = document.getElementById('issueDescriptionText').value.trim();

  try {
    const res = await fetch(`/api/deliveries/${targetIssueDeliveryId}/issue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ issueType, description })
    });

    const result = await res.json();
    if (result.success) {
      showToast('Issue logged and reported to dispatch ✅', 'success');
      closeModal('reportIssueModal');
      document.getElementById('reportIssueForm').reset();
      await loadDriverActiveRoute(currentSelectedDriverId);
    } else {
      showToast(result.message || 'Failed to log issue', 'error');
    }
  } catch (err) {
    showToast('Network error reporting issue', 'error');
  }
}

/**
 * Inherited Roster Management Logic (Preserved from Day 2)
 */
function renderDriversTable() {
  const tbody = document.getElementById('driversTableBody');
  if (!tbody) return;
  document.getElementById('driverCount').textContent = `(${allDriversList.length})`;

  if (allDriversList.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:2rem">No drivers in roster.</td></tr>';
    return;
  }

  const availClass = { available: 'completed', on_duty: 'active', off_duty: 'urgent' };
  const availLabel = { available: '✅ Available', on_duty: '⚡ On Duty', off_duty: '🔴 Off Duty' };

  tbody.innerHTML = allDriversList.map(d => `
    <tr>
      <td><strong>${d.name}</strong><br><small style="color:var(--text-muted)">${d.email}</small></td>
      <td>${d.phone}</td>
      <td>${d.licenseNumber}</td>
      <td>${d.assignedVehicle ? d.assignedVehicle.vehicleNumber + ' (' + d.assignedVehicle.vehicleType + ')' : '<span style="color:var(--text-muted)">None</span>'}</td>
      <td><span class="badge badge-${availClass[d.availability]}">${availLabel[d.availability]}</span></td>
      <td>${d.completedDeliveries}</td>
      <td>${d.onTimeDeliveries} <small style="color:var(--text-muted)">(${d.completedDeliveries > 0 ? Math.round(d.onTimeDeliveries/d.completedDeliveries*100) : 0}%)</small></td>
      <td><button class="btn btn-outline btn-sm" onclick="deleteDriver('${d._id}')">🗑 Remove</button></td>
    </tr>
  `).join('');
}

function updateDriverRosterStatBar() {
  const statBar = document.getElementById('driverStatBar');
  if (!statBar || !allDriversList) return;
  const available = allDriversList.filter(d => d.availability === 'available').length;
  const onDuty = allDriversList.filter(d => d.availability === 'on_duty').length;
  const offDuty = allDriversList.filter(d => d.availability === 'off_duty').length;
  statBar.innerHTML = `
    <div class="stat-bar-item"><span>👤</span><span>Total: ${allDriversList.length}</span></div>
    <div class="stat-bar-item"><span>✅</span><span>Available: ${available}</span></div>
    <div class="stat-bar-item"><span>⚡</span><span>On Duty: ${onDuty}</span></div>
    <div class="stat-bar-item"><span>🔴</span><span>Off Duty: ${offDuty}</span></div>
  `;
}

async function handleAddDriver(e) {
  e.preventDefault();
  const btn = document.getElementById('submitDriverBtn');
  btn.disabled = true; btn.textContent = 'Adding...';

  const data = {
    name: document.getElementById('drvName').value.trim(),
    phone: document.getElementById('drvPhone').value.trim(),
    email: document.getElementById('drvEmail').value.trim(),
    licenseNumber: document.getElementById('drvLicense').value.trim(),
    availability: document.getElementById('drvAvailability').value
  };

  try {
    const res = await fetch('/api/drivers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Driver added successfully ✅', 'success');
      document.getElementById('driverForm').reset();
      closeModal('addDriverModal');
      await loadDriversList();
      populateDriverSwitcher();
    } else {
      showToast(result.message || 'Failed to add driver', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Add Driver';
  }
}

async function deleteDriver(id) {
  if (!confirm('Remove this driver from the roster?')) return;
  try {
    const res = await fetch(`/api/drivers/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getAuthToken()}` } });
    const result = await res.json();
    if (result.success) {
      showToast('Driver removed.', 'success');
      await loadDriversList();
      populateDriverSwitcher();
    } else {
      showToast(result.message || 'Delete failed', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = `toast toast-${type} show`;
  setTimeout(() => { toast.className = 'toast'; }, 3500);
}
