import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchDashboard } from '../api/adminApi';
import ERPLayout from '../components/ERPLayout';
import {
    GraduationCap,
    BookOpen,
    Users,
    IndianRupee,
    TrendingUp,
    UserPlus,
    AlertCircle,
    Loader2,
    Calendar,
    BarChart3
} from 'lucide-react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const fmt = (n) => n?.toLocaleString('en-IN') ?? '—';
const fmtDay = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' });
const fmtDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' });

const AdminDashboard = () => {
    const navigate = useNavigate();
    const admin = JSON.parse(localStorage.getItem('admin') || '{}');
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!localStorage.getItem('token')) { navigate('/login'); return; }
        fetchDashboard()
            .then(({ data: d }) => setData(d))
            .catch(err => {
                if (err.response?.status === 401) navigate('/login');
                else setError('Failed to load dashboard data.');
            })
            .finally(() => setLoading(false));
    }, [navigate]);

    const stats = data ? [
        { label: 'Total Students', value: fmt(data.totalStudents), sub: 'enrolled', icon: GraduationCap, cls: 'ic-indigo' },
        { label: 'Active Batches', value: fmt(data.activeBatches), sub: 'currently running', icon: BookOpen, cls: 'ic-blue' },
        { label: 'Total Teachers', value: fmt(data.totalTeachers), sub: 'across batches', icon: Users, cls: 'ic-orange' },
        { label: 'Fees Collected', value: `₹${fmt(data.totalFeesPaid)}`, sub: 'collected so far', icon: IndianRupee, cls: 'ic-green' },
    ] : [];

    if (loading) return (
        <ERPLayout title="Dashboard">
            <div className="loader-wrap">
                <Loader2 className="spinner" size={40} />
                <p>Loading dashboard…</p>
            </div>
        </ERPLayout>
    );

    return (
        <ERPLayout title="Dashboard">
            <div className="page-hdr" style={{ marginBottom: 32, marginTop: 8 }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--erp-primary)' }}>Institute Insights</h1>
                    <p style={{ fontSize: '0.95rem', color: '#64748b' }}>Welcome back, <b>{admin.adminName || 'Admin'}</b>. Here's your daily institute overview.</p>
                </div>
            </div>

            {error && (
                <div className="alert alert-error" style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <AlertCircle size={20} /> {error}
                </div>
            )}

            {/* Stats Grid */}
            <div className="stats-grid">
                {stats.map(s => {
                    const Icon = s.icon;
                    return (
                        <div className="stat-card" key={s.label}>
                            <div className={`stat-icon ${s.cls}`}>
                                <Icon size={24} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <div className="stat-label">{s.label}</div>
                                <div className="stat-value">{s.value}</div>
                                <div className="stat-sub">{s.sub}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>

                {/* Attendance Chart */}
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ fontWeight: 800, color: 'var(--erp-primary)', marginBottom: 24, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <TrendingUp size={20} style={{ color: 'var(--erp-accent)' }} /> Attendance Analytics — Last 7 Days
                    </div>
                    {data?.attendanceTrend?.length ? (
                        <ResponsiveContainer width="100%" height={240}>
                            <AreaChart data={data.attendanceTrend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gP" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#1b3a7a" stopOpacity={0.2} />
                                        <stop offset="95%" stopColor="#1b3a7a" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#e53e3e" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#e53e3e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} axisLine={false} tickLine={false} dy={8} />
                                <YAxis tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }} allowDecimals={false} axisLine={false} tickLine={false} dx={-8} />
                                <Tooltip labelFormatter={fmtDay} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: 12 }} />
                                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 16 }} />
                                <Area type="monotone" dataKey="present" name="Present" stroke="#1b3a7a" fill="url(#gP)" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} />
                                <Area type="monotone" dataKey="absent" name="Absent" stroke="#e53e3e" fill="url(#gA)" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="empty" style={{ height: 240 }}>
                            <BarChart3 size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
                            <p>No attendance data yet.</p>
                        </div>
                    )}
                </div>

                {/* Recent Admissions */}
                <div className="card" style={{ padding: 24 }}>
                    <div style={{ fontWeight: 800, color: 'var(--erp-primary)', marginBottom: 24, fontSize: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <UserPlus size={20} style={{ color: 'var(--erp-accent)' }} /> Recent Admissions
                    </div>
                    {data?.recentAdmissions?.length ? (
                        <table className="erp-table">
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ borderRadius: '10px 0 0 10px' }}>Student</th>
                                    <th>Joined</th>
                                    <th style={{ borderRadius: '0 10px 10px 0' }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.recentAdmissions.map(s => (
                                    <tr key={s._id}>
                                        <td>
                                            <div className="td-bold" style={{ fontSize: '0.85rem' }}>{s.name}</div>
                                            <div className="td-sm">{s.rollNo || '—'}</div>
                                        </td>
                                        <td className="td-sm">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                                <Calendar size={12} style={{ color: '#64748b' }} /> {fmtDate(s.joinedAt)}
                                            </div>
                                        </td>
                                        <td>
                                            {s.feesPaid >= s.fees && s.fees > 0
                                                ? <span className="badge badge-paid">Fully Paid</span>
                                                : <span className="badge badge-unpaid">Pending</span>
                                            }
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="empty" style={{ height: 240 }}>
                            <GraduationCap size={48} style={{ opacity: 0.2, marginBottom: 12 }} />
                            <p>No admissions yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </ERPLayout>
    );
};

export default AdminDashboard;