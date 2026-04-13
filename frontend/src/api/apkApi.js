import apiClient from './apiConfig';

export const getAllApks = () => apiClient.get('/apks');

export const createApk = (formData) => apiClient.post('/apks', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

export const updateApk = (id, formData) => apiClient.patch(`/apks/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

export const deleteApk = (id) => apiClient.delete(`/apks/${id}`);

export default {
    getAllApks,
    createApk,
    updateApk,
    deleteApk
};
