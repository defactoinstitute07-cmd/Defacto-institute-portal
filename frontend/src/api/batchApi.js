import apiClient from './apiConfig';

export const getAllBatches = () => apiClient.get('/batches');
export const getBatchById = (id) => apiClient.get(`/batches/${id}`);
export const createBatch = (data) => apiClient.post('/batches', data);
export const updateBatch = (id, data) => apiClient.put(`/batches/${id}`, data);
export const deleteBatch = (id, data) => apiClient.delete(`/batches/${id}`, { data });
export const toggleBatchStatus = (id) => apiClient.patch(`/batches/${id}/toggle`);

// New specific endpoint for assigning subjects without password
export const updateBatchSubjects = (id, subjectIds, subjects) =>
    apiClient.patch(`/batches/${id}/subjects`, { subjectIds, subjects });

export const getBatchSubjectDetails = (batchId, subjectName) =>
    apiClient.get(`/batches/${batchId}/subjects/${encodeURIComponent(subjectName)}/details`);

export const updateBatchSubjectTotalChapters = (batchId, subjectName, totalChapters) =>
    apiClient.patch(`/batches/${batchId}/subjects/${encodeURIComponent(subjectName)}/chapters`, { totalChapters });
