import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User } from 'lucide-react';

const StudentDashboard = () => {
    const navigate = useNavigate();

    // Get student from local storage
    const studentData = localStorage.getItem('student');
    const student = studentData ? JSON.parse(studentData) : { name: 'Student', email: '' };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    return (
        <div className="erp-shell">
            <div className="erp-main" style={{ marginLeft: 0 }}>
                <div className="topbar">
                    <h2 className="tb-title">Student Portal</h2>
                    <div className="tb-right">
                        <div className="tb-avatar"><User size={18} /></div>
                        <span className="tb-name">{student.name}</span>
                        <button onClick={handleLogout} className="btn-tb-logout">
                            <LogOut size={16} style={{ display: 'inline', marginRight: 4 }} /> Logout
                        </button>
                    </div>
                </div>

                <div className="page-content">
                    <div className="page-hdr">
                        <div>
                            <h1>Welcome, {student.name}!</h1>
                            <p>Here is your student overview.</p>
                        </div>
                    </div>

                    <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                        <div style={{ fontSize: 40, marginBottom: 16 }}>🎓</div>
                        <h3 className="text-xl font-bold mb-2">Student Dashboard Area</h3>
                        <p className="text-muted text-sm max-w-lg mx-auto">
                            This is a placeholder for your upcoming Student Dashboard. You will soon be able
                            to view your enrolled batch, fee payment status, announcements, and more!
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
