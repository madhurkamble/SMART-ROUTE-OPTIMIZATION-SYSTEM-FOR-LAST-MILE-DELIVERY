const API_BASE_URL = 'https://smart-route-optimization-backend.vercel.app';

const originalFetch = window.fetch.bind(window);

window.fetch = function (url, options) {
    if (typeof url === 'string' && url.startsWith('/api/')) {
        url = API_BASE_URL + url;
    }

    return originalFetch(url, options);
};