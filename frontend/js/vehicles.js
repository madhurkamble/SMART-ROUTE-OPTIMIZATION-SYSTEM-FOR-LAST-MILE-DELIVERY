/**
 * Vehicles Module
 * Handles: load vehicles, add vehicle, assign driver, delete vehicle.
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
      // Populate driver dropdown in Assign Driver modal
      const driverSelect = document.getElementById('assignDriverSelect');
      if (driverSelect) {
        driverSelect.innerHTML = '<option value="">-- Select Driver --</option>' +
          allDriversData.map(d => `<option value="${d._id}">${d.name} (${d.availability})</option>`).join('');
      }
    }
  } catch (err) { console.error('Error loading drivers:', err); }
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
  const availClass = { available: 'completed', in_use: 'active', maintenance: 'urgent' };
  const availLabel = { available: 'Available', in_use: 'In Use', maintenance: 'Maintenance' };

  tbody.innerHTML = allVehiclesData.map(v => `
    <tr>
      <td><strong>${v.vehicleNumber}</strong></td>
      <td>${typeIcon[v.vehicleType] || ''} ${v.vehicleType}</td>
      <td>${fuelBadge[v.fuelType] || v.fuelType}</td>
      <td>${v.mileage} km/L</td>
      <td>${v.loadCapacity} kg</td>
      <td>${v.assignedDriver ? v.assignedDriver.name : '<span style="color:var(--text-muted)">None</span>'}</td>
      <td><span class="badge badge-${availClass[v.availability]}">${availLabel[v.availability]}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="openAssignModal('${v._id}', '${v.vehicleNumber}')">👤 Assign</button>
        <button class="btn btn-outline btn-sm" style="margin-left:4px" onclick="deleteVehicle('${v._id}')">🗑</button>
      </td>
    </tr>
  `).join('');
}

async function handleAddVehicle(e) {
  e.preventDefault();
  const btn = document.getElementById('submitVehicleBtn');
  btn.disabled = true;
  btn.textContent = 'Adding...';

  const data = {
    vehicleNumber: document.getElementById('vehNumber').value.trim(),
    vehicleType: document.getElementById('vehType').value,
    fuelType: document.getElementById('vehFuel').value,
    mileage: document.getElementById('vehMileage').value,
    fuelTankCapacity: document.getElementById('vehTankCap').value,
    loadCapacity: document.getElementById('vehLoadCap').value
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
  const driverId = document.getElementById('assignDriverSelect').value;
  if (!driverId || !currentVehicleId) {
    showToast('Please select a driver', 'error');
    return;
  }

  try {
    const res = await fetch(`/api/vehicles/${currentVehicleId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
      body: JSON.stringify({ assignedDriver: driverId })
    });
    const result = await res.json();
    if (result.success) {
      // Also update the driver's assignedVehicle
      await fetch(`/api/drivers/${driverId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ assignedVehicle: currentVehicleId })
      });
      showToast('Driver assigned to vehicle ✅', 'success');
      closeModal('assignDriverModal');
      await Promise.all([loadVehicles(), loadDriversForAssign()]);
    } else {
      showToast(result.message || 'Assignment failed', 'error');
    }
  } catch (err) {
    showToast('Network error', 'error');
  }
}

async function deleteVehicle(id) {
  if (!confirm('Remove this vehicle from the fleet?')) return;
  try {
    const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getAuthToken()}` } });
    const result = await res.json();
    if (result.success) {
      showToast('Vehicle removed.', 'success');
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
