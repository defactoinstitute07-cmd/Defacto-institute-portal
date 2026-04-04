import React from 'react';
import { Users, UserCheck, UserX } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, sub, cls }) => (
    <div className="stat-card">
        <div className={`stat-icon ${cls}`}><Icon size={20} /></div>
        <div>
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
            {sub && <div className="stat-sub">{sub}</div>}
        </div>
    </div>
);

const TeacherStats = ({ summary }) => {
    if (!summary) return null;

    return (
        <div className="stats-grid" style={{ marginBottom: 20 }}>
            <StatCard icon={Users} label="Total Faculty" value={summary.totalFaculty || 0} sub="registered" cls="ic-green" />
            <StatCard icon={UserCheck} label="Active Faculty" value={summary.activeFaculty || 0} sub="currently available" cls="ic-green" />
            <StatCard icon={UserX} label="Inactive Faculty" value={summary.inactiveFaculty || 0} sub="needs review" cls="ic-red" />
        </div>
    );
};

export default TeacherStats;
export { StatCard };
