import axios from 'axios';

// In production: set VITE_API_BASE_URL to your backend URL on Vercel (e.g., https://tutution-erp-api.vercel.app)
// In development: falls back to localhost
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Configured axios instance for generic API calls
const apiClient = axios.create({
    baseURL: `${API_BASE_URL}/api`,
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
