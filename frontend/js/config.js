/**
 * Environment & API Base Configuration
 * Automatically detects whether running locally or on live HTTPS deployment.
 */
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE_URL = isLocalhost ? '' : 'https://smart-route-optimization-backend.vercel.app';

const originalFetch = window.fetch.bind(window);

window.fetch = function (url, options) {
    if (typeof url === 'string' && url.startsWith('/api/')) {
        url = (API_BASE_URL ? API_BASE_URL : '') + url;
    }

    return originalFetch(url, options);
};