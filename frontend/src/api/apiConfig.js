import axios from 'axios';

// On Vercel, frontend and backend share the same domain.
// So we use an empty string (relative URL) unless VITE_API_BASE_URL is set.
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Configured axios instance for generic API calls
const apiClient = axios.create({
    baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

// Configure interceptor for JWT token
apiClient.interceptors.request.use(config => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, error => {
    return Promise.reject(error);
});

export default apiClient;
