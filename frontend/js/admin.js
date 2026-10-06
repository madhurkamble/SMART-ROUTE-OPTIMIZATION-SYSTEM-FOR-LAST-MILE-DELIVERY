/**
 * Admin.js — Fleet Central Administration Module (Day 6)
 *
 * Handles:
 * 1. Admin authentication check (role: 'admin' required)
 * 2. System user accounts management
 * 3. Global fleet parameters & fuel configuration
 * 4. Route dispatch audit log
 * 5. One-click demo dataset reset & database maintenance
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Guard: Only Admin role can access
  const user = requireAuth(['admin']);
  if (!user) return;

  setUserInfo(user);

  // Load Admin Data
  await Promise.all([
    loadSystemUsers(),
    loadDispatchAuditLogs(),
    loadGlobalConfig()
  ]);

  // Form bindings
  const addUserForm = document.getElementById('addUserForm');
  if (addUserForm) addUserForm.addEventListener('submit', handleAddUser);

  const configForm = document.getElementById('globalConfigForm');
  if (configForm) configForm.addEventListener('submit', handleSaveConfig);

  const resetBtn = document.getElementById('resetDemoDataBtn');
  if (resetBtn) resetBtn.addEventListener('click', handleResetDemoData);
});

function setUserInfo(user) {
  const el = id => document.getElementById(id);
  if (el('userName')) el('userName').textContent = user.name;
  if (el('userRole')) el('userRole').textContent = 'System Administrator';
  if (el('userAvatar')) el('userAvatar').textContent = user.name.charAt(0).toUpperCase();
  const logoutBtn = el('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', e => { e.preventDefault(); logout(); });
}

/**
 * Load System Users
 */
async function loadSystemUsers() {
  const tbody = document.getElementById('usersTableBody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/auth/users', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    const result = await res.json();

    if (!result.success || !result.data) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--text-muted)">Failed to load users</td></tr>';
      return;
    }

    const users = result.data;
    document.getElementById('statTotalUsers').textContent = users.length;

    tbody.innerHTML = users.map(u => `
      <tr>
        <td><strong>${u.name}</strong></td>
        <td>${u.email}</td>
        <td><span class="badge ${u.role === 'admin' ? 'badge-urgent' : 'badge-completed'}">${u.role.toUpperCase()}</span></td>
        <td>${u.phone || 'N/A'}</td>
        <td><small style="color:var(--text-muted);">${new Date(u.createdAt).toLocaleDateString()}</small></td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Error loading users:', err);
  }
}

/**
 * Handle Add User
 */
async function handleAddUser(e) {
  e.preventDefault();
  const btn = document.getElementById('submitUserBtn');
  btn.disabled = true;
  btn.textContent = 'Creating...';

  const data = {
    name: document.getElementById('newUserName').value.trim(),
    email: document.getElementById('newUserEmail').value.trim(),
    password: document.getElementById('newUserPassword').value,
    role: document.getElementById('newUserRole').value,
    phone: document.getElementById('newUserPhone').value.trim()
  };

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();

    if (result.success) {
      showToast('User created successfully! ✅', 'success');
      document.getElementById('addUserForm').reset();
      closeModal('addUserModal');
      await loadSystemUsers();
    } else {
      showToast(result.message || 'Failed to create user', 'error');
    }
  } catch (err) {
    showToast('Network error creating user', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create User';
  }
}

/**
 * Load Dispatch Audit Logs (all saved routes)
 */
async function loadDispatchAuditLogs() {
  const tbody = document.getElementById('auditRoutesTableBody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/routes', {
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    const result = await res.json();

    if (!result.success || !result.data || result.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:var(--text-muted)">No dispatched route logs found.</td></tr>';
      document.getElementById('statTotalRoutes').textContent = '0';
      return;
    }

    const routes = result.data;
    document.getElementById('statTotalRoutes').textContent = routes.length;

    tbody.innerHTML = routes.map(r => `
      <tr>
        <td><strong>${r.routeId}</strong></td>
        <td>${r.driver ? r.driver.name : 'Unassigned'}</td>
        <td>${r.vehicle ? r.vehicle.vehicleNumber : 'Unassigned'}</td>
        <td>${r.totalDistanceKm} km</td>
        <td>${r.stops ? r.stops.length : 0} stops</td>
        <td><span class="badge badge-completed">Score: ${r.routeScore || '--'}</span></td>
        <td><small style="color:var(--text-muted);">${new Date(r.createdAt).toLocaleString()}</small></td>
      </tr>
    `).join('');

  } catch (err) {
    console.error('Error loading route logs:', err);
  }
}

/**
 * Global Configuration Settings (stored in localStorage)
 */
function loadGlobalConfig() {
  const cfg = JSON.parse(localStorage.getItem('smart_route_fleet_config') || '{}');
  if (cfg.petrolPrice) document.getElementById('cfgPetrol').value = cfg.petrolPrice;
  if (cfg.dieselPrice) document.getElementById('cfgDiesel').value = cfg.dieselPrice;
  if (cfg.evPrice) document.getElementById('cfgEV').value = cfg.evPrice;
  if (cfg.baseSpeed) document.getElementById('cfgBaseSpeed').value = cfg.baseSpeed;
  if (cfg.serviceTime) document.getElementById('cfgServiceTime').value = cfg.serviceTime;
}

function handleSaveConfig(e) {
  e.preventDefault();
  const cfg = {
    petrolPrice: document.getElementById('cfgPetrol').value,
    dieselPrice: document.getElementById('cfgDiesel').value,
    evPrice: document.getElementById('cfgEV').value,
    baseSpeed: document.getElementById('cfgBaseSpeed').value,
    serviceTime: document.getElementById('cfgServiceTime').value
  };

  localStorage.setItem('smart_route_fleet_config', JSON.stringify(cfg));
  showToast('Fleet configuration parameters updated! ⚙️', 'success');
}

/**
 * One-Click Demo Dataset Reset
 */
async function handleResetDemoData() {
  if (!confirm('Are you sure you want to restore the default sample dataset? This will reset all active delivery orders to their baseline sample states.')) {
    return;
  }

  const btn = document.getElementById('resetDemoDataBtn');
  btn.disabled = true;
  btn.textContent = 'Restoring...';

  try {
    const res = await fetch('/api/auth/seed-reset', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${getAuthToken()}` }
    });
    const result = await res.json();

    if (result.success) {
      showToast('Default dataset successfully restored! ✅', 'success');
      setTimeout(() => window.location.reload(), 1200);
    } else {
      showToast(result.message || 'Reset failed', 'error');
    }
  } catch (err) {
    showToast('Network error during dataset reset', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '🔄 Restore Default Dataset';
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
