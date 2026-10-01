/**
 * Authentication Module
 * Handles login, session persistence, role validation, and logout.
 */

const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? '' 
  : ''; // Same origin API calls

// Store auth session
function setSession(token, user) {
  localStorage.setItem('smart_route_token', token);
  localStorage.setItem('smart_route_user', JSON.stringify(user));
}

// Get logged-in user
function getCurrentUser() {
  const user = localStorage.getItem('smart_route_user');
  return user ? JSON.parse(user) : null;
}

// Get auth token
function getAuthToken() {
  return localStorage.getItem('smart_route_token');
}

// Logout user
function logout() {
  localStorage.removeItem('smart_route_token');
  localStorage.removeItem('smart_route_user');
  window.location.href = 'login.html';
}

// Guard protected pages
function requireAuth(allowedRoles = []) {
  const token = getAuthToken();
  const user = getCurrentUser();

  if (!token || !user) {
    window.location.href = 'login.html';
    return null;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    alert(`Access denied. This page requires ${allowedRoles.join(' or ')} privileges.`);
    window.location.href = 'dashboard.html';
    return null;
  }

  return user;
}

// Perform login request
async function loginUser(email, password) {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed. Please check credentials.');
    }

    // Save session
    setSession(data.token, data.user);
    return data;
  } catch (error) {
    throw error;
  }
}
