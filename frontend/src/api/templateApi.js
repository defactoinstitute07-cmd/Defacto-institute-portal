import axios from 'axios';
import { API_BASE_URL } from './apiConfig';

const API = axios.create({ baseURL: `${API_BASE_URL}/api/templates` });

const authHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

export const fetchTemplates = () => API.get('/', authHeader());
export const updateTemplate = (id, data) => API.put(`/${id}`, data, authHeader());

export default API;
