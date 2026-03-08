import axios from 'axios';
import { API_BASE_URL } from './apiConfig';


const API = axios.create({ baseURL: `${API_BASE_URL}/api/admin` });

export const checkAdminExists = () => API.get('/check-admin');
export const adminSignup = (data) => API.post('/signup', data);
export const adminLogin = (data) => API.post('/login', data);

// Dashboard API (requires JWT)
const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const getAdminProfile = () => API.get('/profile', authHeader());
export const updateAdminProfile = (data) => API.put('/profile', data, authHeader());
export const updateAdminSettings = (data) => API.put('/settings', data, authHeader());

// Settings page extra metrics
export const getDatabaseStats = () => axios.get(`${API_BASE_URL}/api/settings/db-stats`, authHeader());

// Email Notification Settings
export const fetchEmailTemplates = () => axios.get(`${API_BASE_URL}/api/settings/email-templates`, authHeader());
export const updateEmailTemplate = (id, data) => axios.put(`${API_BASE_URL}/api/settings/email-templates/${id}`, data, authHeader());

// The dashboard work routes are also under this base
export const fetchDashboard = () => API.get('/', authHeader());

export default API;
