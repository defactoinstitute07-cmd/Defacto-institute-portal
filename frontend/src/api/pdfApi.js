import apiClient from './apiConfig';

export const getAllPdfs = () => apiClient.get('/pdfs');

export const createPdf = (formData) => apiClient.post('/pdfs', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});

export const deletePdf = (id) => apiClient.delete(`/pdfs/${id}`);

export default {
    getAllPdfs,
    createPdf,
    deletePdf
};
