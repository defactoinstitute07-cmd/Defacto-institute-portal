import axios from 'axios';
import { clearClientSession } from '../utils/authSession';

const getBaseUrl = () => {
    if (import.meta.env.VITE_API_BASE_URL !== undefined) {
        return String(import.meta.env.VITE_API_BASE_URL).trim();
    }
    // Fallback for local development
    if (import.meta.env.DEV) {
        return 'http://localhost:5000';
    }
    // Production fallback (same domain)
    return '';
};

export const API_BASE_URL = getBaseUrl().replace(/\/$/, '');
export const TEACHER_API_BASE_URL = String(import.meta.env.VITE_TEACHER_API_BASE_URL || API_BASE_URL).trim().replace(/\/$/, '');

export const attachAuthToken = (instance) => {
    instance.interceptors.request.use((config) => {
        if (typeof window !== 'undefined') {
            const token = window.localStorage.getItem('authToken');
            if (token) {
                config.headers = config.headers || {};
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    });
    return instance;
};


// Configured axios instance for generic API calls
const apiClient = attachAuthToken(axios.create({
    baseURL: `${API_BASE_URL}/api`,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json'
    }
}));

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const url = String(error.config?.url || '');
        const isAuthRequest = /\/(login|signup|logout)$/.test(url);

        // Only auto-logout on 401 if it's a real JWT/token failure.
        // Do NOT logout if it's just an admin password verification failure
        // (verifyAdminPassword middleware also returns 401 with "Incorrect admin password").
        const errorMessage = String(error.response?.data?.message || '');
        const isAdminPasswordFailure =
            errorMessage.toLowerCase().includes('incorrect admin password') ||
            errorMessage.toLowerCase().includes('admin password is required') ||
            errorMessage.toLowerCase().includes('password verification failed');

        if (status === 401 && !isAuthRequest && !isAdminPasswordFailure && typeof window !== 'undefined') {
            const currentPath = window.location.pathname;
            clearClientSession();

            if (currentPath !== '/login' && currentPath !== '/signup') {
                window.location.assign('/login');
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
