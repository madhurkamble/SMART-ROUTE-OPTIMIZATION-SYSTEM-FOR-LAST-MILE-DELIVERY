/**
 * Dashboard Module
 * Handles loading dashboard statistics, active user context, and UI bindings.
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Protect route
  const user = requireAuth();
  if (!user) return;

  // Render user information in header
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

  // Load KPI stats from backend
  await loadDashboardMetrics();
});

async function loadDashboardMetrics() {
  try {
    const token = getAuthToken();
    const response = await fetch('/api/dashboard/summary', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      console.warn('Could not retrieve live dashboard stats, using fallback defaults.');
      return;
    }

    const result = await response.json();
    if (result.success && result.data) {
      const stats = result.data;

      // Update KPI card DOM elements
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
