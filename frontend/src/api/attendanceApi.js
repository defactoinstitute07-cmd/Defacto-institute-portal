import apiClient from './apiConfig';

export const getAdminAttendanceSetup = () => apiClient.get('/attendance/setup/admin');
export const getAdminAttendanceRoster = (params) => apiClient.get('/attendance/roster', { params });
export const markAdminAttendance = (payload) => apiClient.post('/attendance/mark', payload);
export const updateAdminAttendance = (attendanceId, payload) => apiClient.put(`/attendance/${attendanceId}`, payload);
export const getAdminAttendanceReport = (params) => apiClient.get('/attendance/report', { params });
export const getAdminAttendanceOverview = (params) => apiClient.get('/attendance/overview', { params });
export const getStudentAttendanceReport = (params) => apiClient.get('/attendance/student/report', { params });
