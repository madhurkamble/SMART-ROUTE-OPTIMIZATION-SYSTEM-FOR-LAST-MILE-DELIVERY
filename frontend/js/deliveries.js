/**
 * Deliveries Module
 * Handles: load all deliveries, add new delivery, delete delivery.
 */

let allDeliveries = [];
let allDrivers = [];
let allVehicles = [];

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireAuth();
  if (!user) return;

  // Render user info in top nav
  setUserInfo(user);

  // Load data
  await Promise.all([loadDeliveries(), loadDriversForForm(), loadVehiclesForForm()]);
  
  // Bind form submit
  const form = document.getElementById('deliveryForm');
  if (form) form.addEventListener('submit', handleAddDelivery);

  // Bind filter
  const filterSelect = document.getElementById('statusFilter');
  if (filterSelect) filterSelect.addEventListener('change', renderDeliveriesTable);
});

function setUserInfo(user) {
  const el = id => document.getElementById(id);
  if (el('userName')) el('userName').textContent = user.name;
  if (el('userRole')) el('userRole').textContent = user.role === 'admin' ? 'Fleet Manager' : 'Driver';
  if (el('userAvatar')) el('userAvatar').textContent = user.name.charAt(0).toUpperCase();
  const logoutBtn = el('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', e => { e.preventDefault(); logout(); });
}

async function loadDeliveries() {
  try {
    const res = await fetch('/api/deliveries', { headers: { 'Authorization': `Bearer ${getAuthToken()}` } });
    const result = await res.json();
    if (result.success) {
      allDeliveries = result.data;
      renderDeliveriesTable();
    }
  } catch (err) {
    console.error('Error loading deliveries:', err);
    showToast('Could not load deliveries', 'error');
  }
}

async function loadDriversForForm() {
  try {
    const res = await fetch('/api/drivers', { headers: { 'Authorization': `Bearer ${getAuthToken()}` } });
    const result = await res.json();
    if (result.success) {
      allDrivers = result.data;
    }
  } catch (err) { console.error('Error loading drivers for form:', err); }
}

async function loadVehiclesForForm() {
  try {
    const res = await fetch('/api/vehicles', { headers: { 'Authorization': `Bearer ${getAuthToken()}` } });
    const result = await res.json();
    if (result.success) {
      allVehicles = result.data;
    }
  } catch (err) { console.error('Error loading vehicles for form:', err); }
}

function renderDeliveriesTable() {
  const tbody = document.getElementById('deliveriesTableBody');
  if (!tbody) return;

  const filterStatus = document.getElementById('statusFilter')?.value || 'all';

  let filtered = allDeliveries;
  if (filterStatus !== 'all') {
    filtered = allDeliveries.filter(d => d.status === filterStatus);
  }

  document.getElementById('deliveryCount').textContent = `(${filtered.length})`;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color: var(--text-muted); padding: 2rem;">No deliveries found.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(d => `
    <tr>
      <td><strong>${d.orderId}</strong></td>
      <td>
        <div>${d.customerName}</div>
        <small style="color:var(--text-muted)">${d.customerPhone}</small>
      </td>
      <td style="max-width:200px; font-size:0.82rem">${d.deliveryAddress}</td>
      <td><span class="badge badge-${d.priority}">${d.priority}</span></td>
      <td>${d.assignedDriver ? d.assignedDriver.name : '<span style="color:var(--text-muted)">Unassigned</span>'}</td>
      <td>${d.assignedVehicle ? d.assignedVehicle.vehicleNumber : '<span style="color:var(--text-muted)">Unassigned</span>'}</td>
      <td><span class="badge badge-${statusClass(d.status)}">${statusLabel(d.status)}</span></td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="deleteDelivery('${d._id}')">🗑 Delete</button>
      </td>
    </tr>
  `).join('');
}

function statusClass(status) {
  const map = { pending: 'pending', assigned: 'assigned', out_for_delivery: 'active', completed: 'completed', failed: 'urgent' };
  return map[status] || 'standard';
}

function statusLabel(status) {
  const map = { pending: 'Pending', assigned: 'Assigned', out_for_delivery: 'Out for Delivery', completed: 'Completed', failed: 'Failed' };
  return map[status] || status;
}

async function handleAddDelivery(e) {
  e.preventDefault();
  const submitBtn = document.getElementById('submitDeliveryBtn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Adding...';

  const data = {
    customerName: document.getElementById('custName').value.trim(),
    customerPhone: document.getElementById('custPhone').value.trim(),
    deliveryAddress: document.getElementById('deliveryAddr').value.trim(),
    latitude: document.getElementById('deliveryLat').value,
    longitude: document.getElementById('deliveryLng').value,
    priority: document.getElementById('priority').value,
    timeWindowStart: document.getElementById('timeStart').value,
    timeWindowEnd: document.getElementById('timeEnd').value,
    packageWeight: document.getElementById('pkgWeight').value,
    packageSize: document.getElementById('pkgSize').value,
    notes: document.getElementById('notes').value.trim()
  };

  try {
    const res = await fetch('/api/deliveries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Delivery order created successfully! ✅', 'success');
      document.getElementById('deliveryForm').reset();
      closeModal('addDeliveryModal');
      await loadDeliveries();
    } else {
      showToast(result.message || 'Failed to create delivery', 'error');
    }
  } catch (err) {
    showToast('Network error. Check server.', 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Add Delivery';
  }
}

async function deleteDelivery(id) {
  if (!confirm('Are you sure you want to delete this delivery order?')) return;
  try {
    const res = await fetch(`/api/deliveries/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    const result = await res.json();
    if (result.success) {
      showToast('Delivery deleted.', 'success');
      await loadDeliveries();
    } else {
      showToast(result.message || 'Delete failed', 'error');
    }
  } catch (err) {
    showToast('Network error.', 'error');
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
