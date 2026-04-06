import apiClient from './apiConfig';

export const getSubjects = (params) => apiClient.get('/subjects', { params });
export const getMyStudentSubjects = (params) => apiClient.get('/subjects/student/my', { params });
export const createSubject = (data) => apiClient.post('/subjects', data);
export const deleteSubject = (id) => apiClient.delete(`/subjects/${id}`);
export const getSubjectById = (id) => apiClient.get(`/subjects/${id}`);
export const assignSubjectTeacher = (id, teacherId) =>
	apiClient.patch(`/subjects/${id}/teacher`, { teacherId });
export const assignSubjectBatches = (id, batchIds) =>
	apiClient.patch(`/subjects/${id}/batches`, { batchIds });
export const uploadSubjectSyllabus = (id, file) => {
	const formData = new FormData();
	formData.append('syllabus', file);
	return apiClient.post(`/subjects/${id}/syllabus`, formData, {
		headers: { 'Content-Type': 'multipart/form-data' }
	});
};
export const addSubjectChapter = (id, data) => apiClient.post(`/subjects/${id}/chapters`, data);
export const updateSubjectChapter = (id, chapterId, data) =>
	apiClient.patch(`/subjects/${id}/chapters/${chapterId}`, data);
export const updateSubjectChapterStatus = (id, chapterId, status) =>
	apiClient.patch(`/subjects/${id}/chapters/${chapterId}/status`, { status });
