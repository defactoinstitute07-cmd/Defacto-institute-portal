import apiClient from './apiConfig';

export const getAdminAttendanceSetup = () => apiClient.get('/attendance/setup/admin');
export const getSubjects = (params = {}) => apiClient.get('/subjects', { params });
export const createSubject = (payload) => apiClient.post('/subjects', payload);
export const getAdminAttendanceRoster = (params) => apiClient.get('/attendance/roster', { params });
export const markAdminAttendance = (payload) => apiClient.post('/attendance/mark', payload);
export const updateAdminAttendance = (attendanceId, payload) => apiClient.put(`/attendance/${attendanceId}`, payload);
export const getAdminAttendanceReport = (params) => apiClient.get('/attendance/report', { params });
export const getStudentAttendanceReport = (params) => apiClient.get('/attendance/student/report', { params });
