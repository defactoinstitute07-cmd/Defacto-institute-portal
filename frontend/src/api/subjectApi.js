import apiClient from './apiConfig';

export const getSubjects = (params) => apiClient.get('/subjects', { params });
export const createSubject = (data) => apiClient.post('/subjects', data);
export const getSubjectById = (id) => apiClient.get(`/subjects/${id}`);
export const assignSubjectTeacher = (id, teacherId) =>
	apiClient.patch(`/subjects/${id}/teacher`, { teacherId });
export const addSubjectChapter = (id, data) => apiClient.post(`/subjects/${id}/chapters`, data);
export const updateSubjectChapter = (id, chapterId, data) =>
	apiClient.patch(`/subjects/${id}/chapters/${chapterId}`, data);
export const updateSubjectChapterStatus = (id, chapterId, status) =>
	apiClient.patch(`/subjects/${id}/chapters/${chapterId}/status`, { status });
