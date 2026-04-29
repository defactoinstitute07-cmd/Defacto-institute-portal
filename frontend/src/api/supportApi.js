import axios from 'axios';
import { API_BASE_URL, attachAuthToken } from './apiConfig';

const API = attachAuthToken(axios.create({
    baseURL: `${API_BASE_URL}/api/support`,
    withCredentials: true
}));

export const getSupportUsers = () => API.get('/');
export const createSupportUser = (userData) => API.post('/', userData);
export const updateSupportUserStatus = (id, status) => API.patch(`/${id}/status`, { status });
export const deleteSupportUser = (id) => API.delete(`/${id}`);
