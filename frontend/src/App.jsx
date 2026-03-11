import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminProfilePage from './pages/AdminProfilePage';
import StudentsPage from './pages/StudentsPage';
import FeesPage from './pages/FeesPage';
import BatchesPage from './pages/BatchesPage';
import TeachersPage from './pages/TeachersPage';
import ExpensesPage from './pages/ExpensesPage';
import TeacherDashboard from './pages/TeacherDashboard';
import StudentDashboard from './pages/StudentDashboard';
import TeacherPayrollDashboard from './pages/TeacherPayrollDashboard';
import { API_BASE_URL } from './api/apiConfig';
import AnalyticsPage from './pages/AnalyticsPage';
import BatchDetailsPage from './pages/BatchDetailsPage';
import StudentProfilePage from './pages/StudentProfilePage';
import SettingsPage from './pages/SettingsPage';
import ExamsPage from './pages/ExamsPage';
import NotificationsPage from './pages/NotificationsPage';
import AttendancePage from './pages/AttendancePage';

import ProtectedRoute from './components/ProtectedRoute';
import { Analytics } from '@vercel/analytics/react';

function App() {
    useEffect(() => {
        // Default to the dashboard accent until institute-specific settings are loaded.
        document.documentElement.style.setProperty('--erp-primary', '#5b57d9');
        document.documentElement.style.setProperty('--erp-secondary', '#8d85ff');

        // Fetch baseline institute settings (Publicly accessible)
        axios.get(`${API_BASE_URL}/api/settings`)
            .then(res => {
                const settings = res.data;
                localStorage.setItem('instituteSettings', JSON.stringify(settings));

                // Set universal CSS variables immediately
                if (settings.themeColors && settings.themeColors.length >= 2) {
                    document.documentElement.style.setProperty('--erp-primary', settings.themeColors[0]);
                    document.documentElement.style.setProperty('--erp-secondary', settings.themeColors[1]);
                }
            })
            .catch(err => console.error("Failed to load institute config:", err));
    }, []);

    return (
        <Router>
            <Routes>
                {/* Admin Login Only Route */}
                <Route path="/login" element={<AdminLoginPage />} />
                <Route path="/admin-login" element={<Navigate to="/login" replace />} />
                <Route path="/signup" element={<Navigate to="/login" replace />} />

                {/* Admin Routes */}
                <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute allowedRoles={['admin']}><AdminProfilePage /></ProtectedRoute>} />
                <Route path="/students" element={<ProtectedRoute allowedRoles={['admin']}><StudentsPage /></ProtectedRoute>} />
                <Route path="/students/:id" element={<ProtectedRoute allowedRoles={['admin']}><StudentProfilePage /></ProtectedRoute>} />
                <Route path="/fees" element={<ProtectedRoute allowedRoles={['admin']}><FeesPage /></ProtectedRoute>} />
                <Route path="/batches" element={<ProtectedRoute allowedRoles={['admin']}><BatchesPage /></ProtectedRoute>} />
                <Route path="/batches/:id" element={<ProtectedRoute allowedRoles={['admin']}><BatchDetailsPage /></ProtectedRoute>} />
                <Route path="/teachers" element={<ProtectedRoute allowedRoles={['admin']}><TeachersPage /></ProtectedRoute>} />
                <Route path="/payroll" element={<ProtectedRoute allowedRoles={['admin']}><TeacherPayrollDashboard /></ProtectedRoute>} />
                <Route path="/expenses" element={<ProtectedRoute allowedRoles={['admin']}><ExpensesPage /></ProtectedRoute>} />
                <Route path="/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AnalyticsPage /></ProtectedRoute>} />
                <Route path="/notifications" element={<ProtectedRoute allowedRoles={['admin']}><NotificationsPage /></ProtectedRoute>} />
                <Route path="/attendance" element={<ProtectedRoute allowedRoles={['admin']}><AttendancePage /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><SettingsPage /></ProtectedRoute>} />
                <Route path="/exams" element={<ProtectedRoute allowedRoles={['admin']}><ExamsPage /></ProtectedRoute>} />

                {/* Teacher Routes */}
                <Route path="/teacher-dashboard" element={<ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />

                {/* Student Routes */}
                <Route path="/student-dashboard" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />

                {/* Fallback */}
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
            <Analytics />
        </Router>
    );
}

export default App;
