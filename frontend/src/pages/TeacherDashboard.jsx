import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Bell, BookOpen, Building2, Calendar, CheckCircle2, ChevronRight, Clock, FileText, IndianRupee, LayoutDashboard,
    LogOut, Mail, MapPin, Phone, Search, Settings, User, Wallet, Trophy, TrendingUp, Target, Loader2, BrainCircuit,
    ClipboardList, ClipboardCheck, Menu, X
} from 'lucide-react';
import { API_BASE_URL, TEACHER_API_BASE_URL } from '../api/apiConfig';

import TeacherSalaryProfile from '../components/teachers/TeacherSalaryProfile';
import TeacherAttendancePanel from '../components/teachers/TeacherAttendancePanel';

const TeacherDashboard = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('overview');
    const [teacher, setTeacher] = useState(JSON.parse(localStorage.getItem('teacher') || '{}'));
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedBatchAnalytics, setSelectedBatchAnalytics] = useState(null);
    const [batchImprovers, setBatchImprovers] = useState([]);
    const [batchScorers, setBatchScorers] = useState([]);
    const [performanceType, setPerformanceType] = useState('improvers');
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    const [mobileOpen, setMobileOpen] = useState(false);
    const [mini, setMini] = useState(false);

    useEffect(() => {

        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${TEACHER_API_BASE_URL}/api/teacher/profile`, {

                headers: { Authorization: `Bearer ${token}` }
            });
            setProfileData(res.data);
            setLoading(res === false);
        } catch (err) {
            console.error('Error fetching profile:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBatchPerformance = async (batchId) => {
        if (!batchId) return;
        setAnalyticsLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [anaRes, impRes, scoRes] = await Promise.all([
                axios.get(`${TEACHER_API_BASE_URL}/api/exams/batch/${batchId}/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${TEACHER_API_BASE_URL}/api/exams/batch/${batchId}/improvers`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`${TEACHER_API_BASE_URL}/api/exams/batch/${batchId}/top-scorers`, { headers: { Authorization: `Bearer ${token}` } })

            ]);
            setSelectedBatchAnalytics(anaRes.data);
            setBatchImprovers(impRes.data.improvers || []);
            setBatchScorers(scoRes.data.scorers || []);
        } catch (err) {
            console.error('Error fetching batch performance:', err);
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
        { id: 'performance', label: 'Performance', icon: Target },
        { id: 'salary', label: 'Salary & Bank', icon: Wallet },
    ];

    return (
        <div className="erp-shell">
            {mobileOpen && (
                <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} style={{ display: 'block' }} />
            )}

            <nav className={`sidebar ${mini ? 'mini' : ''} ${mobileOpen ? 'open' : ''}`}>
                <div className="sb-brand">
                    <div className="sb-logo">T</div>
                    {!mini && <div className="sb-name">Teacher Portal</div>}
                </div>

                <div className="sb-nav">
                    <div className="sb-section-label">Main Navigation</div>
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`sb-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => { setActiveTab(tab.id); setMobileOpen(false); }}
                        >
                            <span className="sb-item-icon"><tab.icon size={18} /></span>
                            {!mini && <span className="sb-item-label">{tab.label}</span>}
                        </button>
                    ))}
                </div>

                <div className="sb-footer">
                    <button className="sb-item" onClick={handleLogout}>
                        <span className="sb-item-icon"><LogOut size={18} /></span>
                        {!mini && <span className="sb-item-label">Log Out</span>}
                    </button>
                </div>
            </nav>

            <div className="erp-body">
                <header className="topbar">
                    <button
                        className="tb-hamburger"
                        onClick={() => {
                            if (window.innerWidth <= 768) setMobileOpen(o => !o);
                            else setMini(m => !m);
                        }}
                    >
                        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
                    </button>
                    <div className="tb-title">Teacher Dashboard</div>
                    <div className="tb-right">
                        <div className="tb-search hide-mobile">
                            <Search size={18} />
                            <input type="text" placeholder="Search data..." />
                        </div>
                        <button className="tb-btn"><Bell size={18} /></button>
                        <div className="tb-divider" />
                        <div className="tb-user">
                            <div className="tb-avatar">T</div>
                            <div className="tb-info hide-mobile">
                                <span className="tb-name">{teacher.name}</span>
                                <span className="tb-role">{teacher.regNo}</span>
                            </div>
                        </div>
                    </div>
                </header>

                <main className="erp-main">
                    <div className="page-content">
                        {activeTab === 'overview' && (
                            <div className="animate-in">
                                <div className="page-hdr">
                                    <div>
                                        <h1>Hi, {teacher.name}! 👋</h1>
                                        <p>Welcome to your dashboard. Here's what's happening today.</p>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="badge badge-active">ID: {teacher.regNo}</div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Assigned Batches Card */}
                                    <div className="card lg:col-span-2">
                                        <div className="p-5 border-b flex items-center justify-between">
                                            <h3 className="font-bold flex items-center gap-2">
                                                <BookOpen size={18} className="text-emerald-500" />
                                                My Assignments
                                            </h3>
                                            <span className="badge">{profileData?.teacher?.assignments?.length || 0} Batches</span>
                                        </div>
                                        <div className="erp-table-wrap">
                                            <table className="erp-table stackable">
                                                <thead>
                                                    <tr>
                                                        <th>Batch Name</th>
                                                        <th>Subjects</th>
                                                        <th>Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {profileData?.teacher?.assignments?.length > 0 ? (
                                                        profileData.teacher.assignments.map((asgn, idx) => (
                                                            <tr key={idx}>
                                                                <td data-label="Batch Name" className="td-bold">{asgn.batchId?.name || asgn.batchName}</td>
                                                                <td data-label="Subjects">
                                                                    <div className="flex flex-wrap gap-1">
                                                                        {asgn.subjects.map((s, si) => (
                                                                            <span key={si} className="chip">{s}</span>
                                                                        ))}
                                                                    </div>
                                                                </td>
                                                                <td data-label="Action">
                                                                    <button className="btn-icon"><ChevronRight size={16} /></button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="3" className="text-center py-8">No batches assigned yet.</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* Payout Quick View */}
                                    <div className="card">
                                        <div className="p-5 border-b">
                                            <h3 className="font-bold flex items-center gap-2">
                                                <Wallet size={18} className="text-emerald-500" />
                                                Payout Profile
                                            </h3>
                                        </div>
                                        <div className="p-6">
                                            <div className="flex flex-col items-center text-center">
                                                <div className="stat-icon ic-green mb-4">
                                                    <IndianRupee size={32} />
                                                </div>
                                                <h4 className="stat-value">₹ {profileData?.teacher?.salary?.toLocaleString() || '0'}</h4>
                                                <p className="stat-sub">Gross Base Salary</p>
                                            </div>

                                            <div className="mt-6 space-y-3">
                                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                                    <span className="text-sm font-medium text-slate-600 flex items-center gap-2">
                                                        <CheckCircle2 size={14} className="text-emerald-500" />
                                                        Bank Linked
                                                    </span>
                                                    <span className="badge badge-active">
                                                        {profileData?.bankDetails?.bankName ? 'Active' : 'Missing'}
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => setActiveTab('salary')}
                                                    className="btn btn-primary w-full"
                                                >
                                                    Manage Payout
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'performance' && (
                            <div className="animate-in">
                                <div className="page-hdr mb-6">
                                    <div>
                                        <h1>Batch Performance Intelligence</h1>
                                        <p>Analyze class progress, top improvers and subject proficiency.</p>
                                    </div>
                                    <div className="flex gap-4">
                                        <select
                                            className="tb-select"
                                            onChange={e => fetchBatchPerformance(e.target.value)}
                                        >
                                            <option value="">Select Assigned Batch...</option>
                                            {profileData?.teacher?.assignments?.map(asgn => (
                                                <option key={asgn.batchId?._id} value={asgn.batchId?._id}>{asgn.batchId?.name || asgn.batchName}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {analyticsLoading ? (
                                    <div className="loader-wrap">
                                        <div className="spinner"></div>
                                        <p>Synthesizing batch performance data...</p>
                                    </div>
                                ) : !selectedBatchAnalytics ? (
                                    <div className="empty">
                                        <Target size={48} className="empty-icon mx-auto" />
                                        <h3>Choose a batch to view intelligence insights</h3>
                                        <p>You can view average scores, top improvers and chapter gaps.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div className="stats-grid">
                                            {[
                                                { label: 'Avg. Class Score', value: `${selectedBatchAnalytics.avgScore}%`, icon: Target, cls: 'ic-indigo' },
                                                { label: 'Highest Achieved', value: `${selectedBatchAnalytics.highestScore}%`, icon: Trophy, cls: 'ic-green' },
                                                { label: 'Lowest Score', value: `${selectedBatchAnalytics.lowestScore}%`, icon: TrendingUp, cls: 'ic-red' },
                                                { label: 'Total Apperance', value: selectedBatchAnalytics.appeared, icon: ClipboardList, cls: 'ic-blue' },
                                            ].map(s => (
                                                <div key={s.label} className="stat-card">
                                                    <div className={`stat-icon ${s.cls}`}>
                                                        <s.icon size={20} />
                                                    </div>
                                                    <div>
                                                        <div className="stat-label">{s.label}</div>
                                                        <div className="stat-value">{s.value}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                            <div className="card">
                                                <div className="p-5 border-b flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <Trophy size={18} className="text-amber-500" />
                                                        <h3 className="font-bold">Batch Leaderboard</h3>
                                                    </div>
                                                    <div className="tabs">
                                                        <button
                                                            onClick={() => setPerformanceType('improvers')}
                                                            className={`tab ${performanceType === 'improvers' ? 'active' : ''}`}
                                                        >
                                                            GROWTH
                                                        </button>
                                                        <button
                                                            onClick={() => setPerformanceType('scorers')}
                                                            className={`tab ${performanceType === 'scorers' ? 'active' : ''}`}
                                                        >
                                                            MERIT
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="erp-table-wrap">
                                                    <table className="erp-table stackable">
                                                        <thead>
                                                            <tr>
                                                                <th>Rank</th>
                                                                <th>Student</th>
                                                                <th>{performanceType === 'improvers' ? 'Growth' : 'Avg Score'}</th>
                                                                <th>{performanceType === 'improvers' ? 'Current' : 'Tests'}</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {performanceType === 'improvers' ? (
                                                                batchImprovers.length > 0 ? batchImprovers.map((imp, i) => (
                                                                    <tr key={i}>
                                                                        <td data-label="Rank" style={{ fontWeight: 800 }}>#{i + 1}</td>
                                                                        <td data-label="Student"><div className="td-bold">{imp.name}</div></td>
                                                                        <td data-label="Growth"><span className="badge badge-active">+{imp.improvement}%</span></td>
                                                                        <td data-label="Current" className="td-bold">{imp.current}%</td>
                                                                    </tr>
                                                                )) : (
                                                                    <tr><td colSpan="4" className="text-center py-10">No growth data available.</td></tr>
                                                                )
                                                            ) : (
                                                                batchScorers.length > 0 ? batchScorers.map((s, i) => (
                                                                    <tr key={i}>
                                                                        <td data-label="Rank" style={{ fontWeight: 800 }}>
                                                                            {i === 0 ? '🏆' : i === 1 ? '⭐' : i === 2 ? '✨' : `#${i + 1}`}
                                                                        </td>
                                                                        <td data-label="Student"><div className="td-bold">{s.name}</div></td>
                                                                        <td data-label="Avg Score"><div className="td-bold text-indigo-600">{s.avgScore}%</div></td>
                                                                        <td data-label="Tests" className="td-sm">{s.testsTaken} Tests</td>
                                                                    </tr>
                                                                )) : (
                                                                    <tr><td colSpan="4" className="text-center py-10">No merit data available.</td></tr>
                                                                )
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <div className="card">
                                                <div className="p-5 border-b flex items-center gap-2">
                                                    <BrainCircuit size={18} className="text-indigo-500" />
                                                    <h3 className="font-bold">Pedagogical Insights</h3>
                                                </div>
                                                <div className="p-6 space-y-6">
                                                    <div className="p-4 bg-indigo-50 rounded-sm italic border-l-4 border-indigo-400">
                                                        <p className="text-sm font-medium text-indigo-900 leading-relaxed">
                                                            "The class average is currently at <strong>{selectedBatchAnalytics.avgScore}%</strong>. Focus
                                                            on the bottom 15% of students who are scoring below <strong>{selectedBatchAnalytics.lowestScore}%</strong> to
                                                            bring up the overall proficiency."
                                                        </p>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div className="flex justify-between items-center text-xs font-black uppercase tracking-widest text-slate-400">
                                                            <span>Class Proficiency</span>
                                                            <span>{selectedBatchAnalytics.avgScore}%</span>
                                                        </div>
                                                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-500" style={{ width: `${selectedBatchAnalytics.avgScore}%` }}></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'attendance' && (
                            <div className="animate-in">
                                <TeacherAttendancePanel />
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default TeacherDashboard;
