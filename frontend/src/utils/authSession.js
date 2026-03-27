const SESSION_ACTIVE_KEY = 'sessionActive';
const TOKEN_KEY = 'authToken';

export const setClientSession = ({ role, admin, teacher, student, token }) => {
    localStorage.setItem(SESSION_ACTIVE_KEY, 'true');
    localStorage.setItem('role', role);

    if (token) {
        localStorage.setItem(TOKEN_KEY, token);
    }

    if (admin) {
        localStorage.setItem('admin', JSON.stringify(admin));
    }

    if (teacher) {
        localStorage.setItem('teacher', JSON.stringify(teacher));
    }

    if (student) {
        localStorage.setItem('student', JSON.stringify(student));
    }
};

export const hasClientSession = (allowedRoles = []) => {
    const role = localStorage.getItem('role');
    const isActive = localStorage.getItem(SESSION_ACTIVE_KEY) === 'true';

    if (!isActive || !role) return false;
    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) return false;
    return true;
};

export const clearClientSession = () => {
    const instituteSettings = localStorage.getItem('instituteSettings');

    localStorage.removeItem(SESSION_ACTIVE_KEY);
    localStorage.removeItem('role');
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('admin');
    localStorage.removeItem('teacher');
    localStorage.removeItem('student');

    if (instituteSettings) {
        localStorage.setItem('instituteSettings', instituteSettings);
    }
};
