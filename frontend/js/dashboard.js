/**
 * Dashboard Module (Day 5 - Live Monitoring & KPIs)
 *
 * Handles:
 * 1. Loading real-time dashboard KPIs from /api/dashboard/summary
 * 2. Real-time active delivery monitoring feed from /api/deliveries
 * 3. Driver and vehicle operational status tracking
 * 4. User context rendering and logout
 */

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;

  // Header user info
  const userNameElem = document.getElementById('userName');
  const userRoleElem = document.getElementById('userRole');
  const userAvatarElem = document.getElementById('userAvatar');
  const logoutBtn = document.getElementById('logoutBtn');

  if (userNameElem) userNameElem.textContent = user.name || 'User';
  if (userRoleElem) userRoleElem.textContent = (user.role === 'admin' ? 'Fleet Manager' : 'Driver');
  if (userAvatarElem) userAvatarElem.textContent = (user.name ? user.name.charAt(0).toUpperCase() : 'U');

  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }

  // Load live data in parallel
  await Promise.all([
    loadDashboardMetrics(),
    loadRecentDeliveriesStream(),
    loadFleetMonitoringStatus()
  ]);
});

async function loadDashboardMetrics() {
  try {
    const token = getAuthToken();
    const response = await fetch('/api/dashboard/summary', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) return;

    const result = await response.json();
    if (result.success && result.data) {
      const stats = result.data;
      const updateElem = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
      };

      updateElem('statTotalDeliveries', stats.totalDeliveries);
      updateElem('statActiveDeliveries', stats.activeDeliveries);
      updateElem('statPendingDeliveries', stats.pendingDeliveries);
      updateElem('statCompletedDeliveries', stats.completedDeliveries);
      updateElem('statTotalVehicles', stats.totalVehicles);
      updateElem('statAvailableVehicles', stats.availableVehicles);
      updateElem('statTotalDistance', `${stats.totalDistanceKm} km`);
      updateElem('statFuelCost', `₹${stats.estimatedFuelCost.toFixed(2)}`);
    }
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
  }
}

/**
 * Active Delivery Stream Feed
 */
async function loadRecentDeliveriesStream() {
  const tbody = document.getElementById('dashboardDeliveriesTable');
  if (!tbody) return;

  try {
    const res = await fetch('/api/deliveries', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    const result = await res.json();

    if (!result.success || !result.data || result.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--text-muted);">No deliveries found.</td></tr>';
      return;
    }

    const statusBadgeClass = (status) => {
      const map = {
        pending: 'badge-pending',
        assigned: 'badge-assigned',
        out_for_delivery: 'badge-active',
        completed: 'badge-completed',
        failed: 'badge-urgent'
      };
      return map[status] || 'badge-standard';
    };

    const statusLabel = (status) => {
      const map = {
        pending: 'Pending',
        assigned: 'Assigned',
        out_for_delivery: 'Out for Delivery',
        completed: 'Completed',
        failed: 'Failed'
      };
      return map[status] || status;
    };

    tbody.innerHTML = result.data.slice(0, 6).map(d => `
      <tr>
        <td><strong>${d.orderId}</strong></td>
        <td>
          <div style="font-weight:600;">${d.customerName}</div>
          <small style="color:var(--text-muted); font-size:0.75rem;">${d.deliveryAddress}</small>
        </td>
        <td><span class="badge badge-${d.priority}">${d.priority.toUpperCase()}</span></td>
        <td>${d.assignedDriver ? d.assignedDriver.name : '<span style="color:var(--text-muted)">Unassigned</span>'}</td>
        <td>${d.assignedVehicle ? d.assignedVehicle.vehicleNumber : '<span style="color:var(--text-muted)">Unassigned</span>'}</td>
        <td><span class="badge ${statusBadgeClass(d.status)}">${statusLabel(d.status)}</span></td>
      </tr>
    `).join('');
  } catch (err) {
    console.error('Error loading delivery stream:', err);
  }
}

/**
 * Driver & Vehicle Active Monitoring Status
 */
async function loadFleetMonitoringStatus() {
  const driversContainer = document.getElementById('monitoringDriversList');
  const vehiclesContainer = document.getElementById('monitoringVehiclesList');

  try {
    const [driversRes, vehiclesRes] = await Promise.all([
      fetch('/api/drivers', { headers: { 'Authorization': `Bearer ${getAuthToken()}` } }),
      fetch('/api/vehicles', { headers: { 'Authorization': `Bearer ${getAuthToken()}` } })
    ]);

    const driversData = await driversRes.json();
    const vehiclesData = await vehiclesRes.json();

    if (driversContainer && driversData.success) {
      const drivers = driversData.data || [];
      driversContainer.innerHTML = drivers.slice(0, 4).map(d => {
        const isDuty = d.availability === 'on_duty';
        const isAvail = d.availability === 'available';
        const badgeColor = isDuty ? '#2563eb' : (isAvail ? '#16a34a' : '#94a3b8');
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:0.55rem 0.75rem; background:#f8fafc; border-radius:var(--radius-sm); border:1px solid var(--border-color); margin-bottom:0.5rem; font-size:0.85rem;">
            <div>
              <strong>${d.name}</strong>
              <div style="font-size:0.75rem; color:var(--text-muted);">${d.assignedVehicle ? d.assignedVehicle.vehicleNumber : 'No vehicle'}</div>
            </div>
            <span style="font-size:0.75rem; font-weight:700; color:${badgeColor}; text-transform:capitalize;">
              ● ${d.availability.replace('_', ' ')}
            </span>
          </div>
        `;
      }).join('');
    }

    if (vehiclesContainer && vehiclesData.success) {
      const vehicles = vehiclesData.data || [];
      vehiclesContainer.innerHTML = vehicles.slice(0, 4).map(v => {
        const isUse = v.availability === 'in_use';
        const isAvail = v.availability === 'available';
        const badgeColor = isUse ? '#2563eb' : (isAvail ? '#16a34a' : '#dc2626');
        return `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:0.55rem 0.75rem; background:#f8fafc; border-radius:var(--radius-sm); border:1px solid var(--border-color); margin-bottom:0.5rem; font-size:0.85rem;">
            <div>
              <strong>${v.vehicleNumber}</strong>
              <div style="font-size:0.75rem; color:var(--text-muted);">${v.vehicleType} &bull; ${v.mileage} km/L (${v.fuelType})</div>
            </div>
            <span style="font-size:0.75rem; font-weight:700; color:${badgeColor}; text-transform:capitalize;">
              ● ${v.availability.replace('_', ' ')}
            </span>
          </div>
        `;
      }).join('');
    }
  } catch (err) {
    console.error('Error loading monitoring data:', err);
  }
}
