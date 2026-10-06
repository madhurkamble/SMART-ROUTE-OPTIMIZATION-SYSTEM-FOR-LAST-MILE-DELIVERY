/**
 * Vehicles Module
 * Handles: load vehicles, add vehicle, assign driver, status toggle, delete vehicle.
 */

let allVehiclesData = [];
let allDriversData = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;

  setUserInfo(user);
  await Promise.all([loadVehicles(), loadDriversForAssign()]);

  const form = document.getElementById('vehicleForm');
  if (form) form.addEventListener('submit', handleAddVehicle);

  const assignForm = document.getElementById('assignDriverForm');
  if (assignForm) assignForm.addEventListener('submit', handleAssignDriver);
});

function setUserInfo(user) {
  const el = id => document.getElementById(id);
  if (el('userName')) el('userName').textContent = user.name;
  if (el('userRole')) el('userRole').textContent = user.role === 'admin' ? 'Fleet Manager' : 'Driver';
  if (el('userAvatar')) el('userAvatar').textContent = user.name.charAt(0).toUpperCase();
  const logoutBtn = el('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', e => { e.preventDefault(); logout(); });
}

async function loadVehicles() {
  try {
    const res = await fetch('/api/vehicles', { headers: { 'Authorization': `Bearer ${getAuthToken()}` } });
    const result = await res.json();
    if (result.success) {
      allVehiclesData = result.data;
      renderVehiclesTable();
      updateVehiclesStatBar();
    }
  } catch (err) {
    showToast('Could not load vehicles', 'error');
  }
}

async function loadDriversForAssign() {
  try {
    const res = await fetch('/api/drivers', { headers: { 'Authorization': `Bearer ${getAuthToken()}` } });
    const result = await res.json();
    if (result.success) {
      allDriversData = result.data;
      const driverSelect = document.getElementById('assignDriverSelect');
      if (driverSelect) {
        driverSelect.innerHTML = '<option value="">-- Select Driver --</option>' +
          allDriversData.map(d => `<option value="${d._id}">${d.name} (${d.availability.replace('_', ' ')})</option>`).join('');
      }
    }
  } catch (err) {
    console.error('Error loading drivers:', err);
  }
}

function updateVehiclesStatBar() {
  const statBar = document.getElementById('vehicleStatBar');
  if (!statBar) return;
  const total = allVehiclesData.length;
  const available = allVehiclesData.filter(v => v.availability === 'available').length;
  const inUse = allVehiclesData.filter(v => v.availability === 'in_use').length;
  const maintenance = allVehiclesData.filter(v => v.availability === 'maintenance').length;

  statBar.innerHTML = `
    <div class="stat-bar-item"><span>🚐</span><span>Total Fleet: <strong>${total}</strong></span></div>
    <div class="stat-bar-item"><span>✅</span><span>Available: <strong style="color:var(--success)">${available}</strong></span></div>
    <div class="stat-bar-item"><span>⚡</span><span>In Use: <strong style="color:var(--primary)">${inUse}</strong></span></div>
    <div class="stat-bar-item" style="border-color:${maintenance > 0 ? '#fca5a5' : 'var(--border-color)'}; background:${maintenance > 0 ? '#fef2f2' : 'var(--bg-surface)'};">
      <span>🔧</span><span>Maintenance: <strong style="color:${maintenance > 0 ? 'var(--danger)' : 'inherit'}">${maintenance}</strong></span>
    </div>
  `;
}

function renderVehiclesTable() {
  const tbody = document.getElementById('vehiclesTableBody');
  if (!tbody) return;

  document.getElementById('vehicleCount').textContent = `(${allVehiclesData.length})`;

  if (allVehiclesData.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding:2rem;">No vehicles in fleet.</td></tr>`;
    return;
  }

  const typeIcon = { bike: '🏍️', van: '🚐', truck: '🚛' };
  const fuelBadge = { petrol: '⛽ Petrol', diesel: '🛢️ Diesel', electric: '⚡ Electric' };

  tbody.innerHTML = allVehiclesData.map(v => `
    <tr>
      <td><strong>${v.vehicleNumber}</strong></td>
      <td>${typeIcon[v.vehicleType] || ''} ${v.vehicleType.toUpperCase()}</td>
      <td>${fuelBadge[v.fuelType] || v.fuelType}</td>
      <td>${v.mileage} km/L</td>
      <td>${v.loadCapacity} kg</td>
      <td>${v.assignedDriver ? v.assignedDriver.name : '<span style="color:var(--text-muted)">Unassigned</span>'}</td>
      <td>
        <select class="form-control" style="width:auto; padding:0.25rem 0.5rem; font-size:0.8rem; font-weight:600; cursor:pointer;" onchange="handleStatusChange('${v._id}', this.value)">
          <option value="available" ${v.availability === 'available' ? 'selected' : ''}>✅ Available</option>
          <option value="in_use" ${v.availability === 'in_use' ? 'selected' : ''}>⚡ In Use</option>
          <option value="maintenance" ${v.availability === 'maintenance' ? 'selected' : ''}>🔧 Maintenance</option>
        </select>
      </td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="openAssignModal('${v._id}', '${v.vehicleNumber}')">👤 Assign</button>
        <button class="btn btn-outline btn-sm" style="margin-left:4px" onclick="deleteVehicle('${v._id}')">🗑</button>
      </td>
    </tr>
  `).join('');
}

async function handleStatusChange(vehicleId, newAvailability) {
  try {
    const res = await fetch(`/api/vehicles/${vehicleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ availability: newAvailability })
    });
    const result = await res.json();
    if (result.success) {
      showToast(`Vehicle status updated to ${newAvailability.toUpperCase()}! ✅`, 'success');
      // Update local array and refresh stat bar
      const target = allVehiclesData.find(v => v._id === vehicleId);
      if (target) target.availability = newAvailability;
      updateVehiclesStatBar();
    } else {
      showToast(result.message || 'Failed to update status', 'error');
    }
  } catch (err) {
    showToast('Network error updating vehicle status', 'error');
  }
}

async function handleAddVehicle(e) {
  e.preventDefault();
  const btn = document.getElementById('submitVehicleBtn');
  btn.disabled = true;
  btn.textContent = 'Adding...';

  const data = {
    vehicleNumber: document.getElementById('vehNumber').value.trim().toUpperCase(),
    vehicleType: document.getElementById('vehType').value,
    fuelType: document.getElementById('vehFuel').value,
    mileage: parseFloat(document.getElementById('vehMileage').value),
    fuelTankCapacity: parseFloat(document.getElementById('vehTankCap').value) || 0,
    loadCapacity: parseFloat(document.getElementById('vehLoadCap').value),
    availability: document.getElementById('vehAvailability') ? document.getElementById('vehAvailability').value : 'available'
  };

  try {
    const res = await fetch('/api/vehicles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Vehicle added to fleet ✅', 'success');
      document.getElementById('vehicleForm').reset();
      closeModal('addVehicleModal');
      await loadVehicles();
    } else {
      showToast(result.message || 'Failed to add vehicle', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Add Vehicle';
  }
}

let currentVehicleId = null;
function openAssignModal(vehicleId, vehicleNumber) {
  currentVehicleId = vehicleId;
  document.getElementById('assignVehicleLabel').textContent = vehicleNumber;
  openModal('assignDriverModal');
}

async function handleAssignDriver(e) {
  e.preventDefault();
  if (!currentVehicleId) return;

  const driverId = document.getElementById('assignDriverSelect').value;
  if (!driverId) {
    showToast('Please select a driver', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/vehicles/${currentVehicleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ assignedDriver: driverId, availability: 'in_use' })
    });
    const result = await res.json();

    if (result.success) {
      // Also link vehicle in Driver document
      await fetch(`/api/drivers/${driverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ assignedVehicle: currentVehicleId, availability: 'on_duty' })
      });

      showToast('Driver assigned successfully ✅', 'success');
      closeModal('assignDriverModal');
      await loadVehicles();
    } else {
      showToast(result.message || 'Assignment failed', 'error');
    }
  } catch (err) {
    showToast('Network error during assignment', 'error');
  }
}

async function deleteVehicle(vehicleId) {
  if (!confirm('Are you sure you want to remove this vehicle from the fleet?')) return;

  try {
    const res = await fetch(`/api/vehicles/${vehicleId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    const result = await res.json();
    if (result.success) {
      showToast('Vehicle removed from fleet', 'success');
      await loadVehicles();
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
