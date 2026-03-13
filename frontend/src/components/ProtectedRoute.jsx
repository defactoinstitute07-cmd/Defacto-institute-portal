import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const location = useLocation();

    if (!token) {
        // Redirect to login but save the current location they were trying to go to
        if (allowedRoles.includes('student') || allowedRoles.includes('teacher')) {
            return <Navigate to="/portal" state={{ from: location }} replace />;
        }
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
        // Redirect to their respective dashboards if they have the wrong role
        if (role === 'teacher') return <Navigate to="/teacher-dashboard" replace />;
        if (role === 'student') return <Navigate to="/student-dashboard" replace />;
        return <Navigate to="/login" replace />;
    }

    if (role === 'student' && allowedRoles.includes('student')) {
        let student = {};
        try {
            student = JSON.parse(localStorage.getItem('student') || '{}');
        } catch {
            student = {};
        }
        const needsSetup = student.needsSetup !== undefined
            ? student.needsSetup
            : ((student.portalAccess?.signupStatus || 'no') !== 'yes' || !student.profileImage);

        if (needsSetup && location.pathname !== '/student-setup') {
            return <Navigate to="/student-setup" replace />;
        }
        if (!needsSetup && location.pathname === '/student-setup') {
            return <Navigate to="/student-dashboard" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
