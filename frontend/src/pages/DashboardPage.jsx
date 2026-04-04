import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, Users2, Zap, Wifi, WifiOff, Clock, BarChart3, Calendar } from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import apiClient from '../api/apiConfig';
import { hasClientSession } from '../utils/authSession';

const fmt = (value) => (Number(value) || 0).toLocaleString('en-IN');

const DashboardPage = () => {
    const navigate = useNavigate();
    const [overview, setOverview] = useState(null);
    const [weeklyAttendance, setWeeklyAttendance] = useState(null);
    const [attendanceTrend, setAttendanceTrend] = useState([]);
    const [recentCollections, setRecentCollections] = useState([]);
    const [upcomingExams, setUpcomingExams] = useState([]);
    const [loading, setLoading] = useState(true);

    const loadDashboard = useCallback(async () => {
        if (!hasClientSession(['admin'])) {
            navigate('/login');
            return;
        }

        setLoading(true);
        try {
            const [overviewData, attendanceWeekly, attendanceTrendData, collectionsData, examsData] = await Promise.all([
                apiClient.get('/dashboard/overview'),
                apiClient.get('/dashboard/attendance-weekly'),
                apiClient.get('/dashboard/attendance-trend'),
                apiClient.get('/dashboard/recent-collections'),
                apiClient.get('/dashboard/upcoming-exams')
            ]);

            setOverview(overviewData.data);
            setWeeklyAttendance(attendanceWeekly.data);
            setAttendanceTrend(attendanceTrendData.data || []);
            setRecentCollections(collectionsData.data || []);
            setUpcomingExams(examsData.data || []);
        } catch (error) {
            console.error('Error loading dashboard:', error);
            if (error.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    }, [navigate]);

    useEffect(() => {
        loadDashboard();
        const interval = setInterval(loadDashboard, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, [loadDashboard]);

    const StatCard = ({ icon: Icon, label, value, sub }) => (
        <div className="card" style={{ padding: 20, flex: '1 1 calc(25% - 12px)', minWidth: 180 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--erp-primary)' }}>
                    <Icon size={20} />
                </div>
                <div style={{ flex: 1 }}>
                    <div className="td-sm">{label}</div>
                    <div className="td-bold" style={{ fontSize: '1.5rem', color: 'var(--erp-primary)' }}>{value}</div>
                    <div className="td-sm" style={{ color: '#64748b', marginTop: 4 }}>{sub}</div>
                </div>
            </div>
        </div>
    );

    if (loading) {
        return (
            <ERPLayout title="Dashboard">
                <div className="flex items-center justify-center p-12 text-slate-400">
                    <p className="font-medium">Loading dashboard...</p>
                </div>
            </ERPLayout>
        );
    }

    return (
        <ERPLayout title="Dashboard">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--erp-primary)', margin: 0 }}>Dashboard</h1>
                    <p style={{ fontSize: '0.95rem', color: '#64748b', margin: '4px 0 0 0' }}>Real-time overview of your institute</p>
                </div>

                {/* Top Stats Row */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <StatCard icon={Users} label="Total Students" value={overview?.totalStudents || 0} sub="enrolled" />
                    <StatCard icon={BookOpen} label="Active Batches" value={overview?.activeBatches || 0} sub="currently running" />
                    <StatCard icon={Users2} label="Total Teachers" value={overview?.totalTeachers || 0} sub="across batches" />
                </div>

                {/* Student Status Row */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <StatCard icon={Zap} label="Students Online" value={overview?.studentsOnline || 0} sub="active in 5m" />
                    <StatCard icon={WifiOff} label="Students Offline" value={overview?.studentsOffline || 0} sub="seen in 7d" />
                    <StatCard icon={Clock} label="Students Inactive" value={overview?.studentsInactive || 0} sub="no open in 7d" />
                </div>

                {/* Attendance & Collections Row */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    {/* Weekly Attendance */}
                    <div className="card" style={{ padding: 20, flex: '1 1 calc(50% - 8px)', minWidth: 300, alignSelf: 'flex-start' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--erp-primary)' }}>Weekly Attendance</h3>
                            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>This week</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 16, alignItems: 'center' }}>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                               
                                    <div style={{ fontSize: '1.8rem', lineHeight: 1, fontWeight: 900, color: 'var(--erp-primary)' }}>{weeklyAttendance?.presentPercentage || 0}%</div>
                                    
                                
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', lineHeight: 1, fontWeight: 800, color: 'var(--erp-primary)' }}>{weeklyAttendance?.present || 0}</div>
                                <div style={{ fontSize: '0.8rem', letterSpacing: '0.08em', color: '#64748b', marginTop: 6 }}>PRESENT</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', lineHeight: 1, fontWeight: 800, color: '#ef4444' }}>{weeklyAttendance?.absent || 0}</div>
                                <div style={{ fontSize: '0.8rem', letterSpacing: '0.08em', color: '#64748b', marginTop: 6 }}>ABSENT</div>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '2rem', lineHeight: 1, fontWeight: 800, color: '#f59e0b' }}>{weeklyAttendance?.late || 0}</div>
                                <div style={{ fontSize: '0.8rem', letterSpacing: '0.08em', color: '#64748b', marginTop: 6 }}>LATE</div>
                            </div>
                        </div>
                    </div>

                    {/* Attendance Trend */}
                    <div className="card" style={{ padding: 20, flex: '1 1 calc(50% - 8px)', minWidth: 300, alignSelf: 'flex-start' }}>
                        <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 700, color: 'var(--erp-primary)' }}>Attendance Trend</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {attendanceTrend.map((item) => (
                                <div key={item.day} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 40, fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>{item.day}</div>
                                    <div style={{ flex: 1, height: 24, background: '#e2e8f0', borderRadius: 4, position: 'relative', overflow: 'hidden' }}>
                                        <div style={{
                                            height: '100%',
                                            width: `${item.percentage}%`,
                                            background: 'var(--erp-primary)',
                                            borderRadius: 4,
                                            transition: 'width 0.3s'
                                        }}></div>
                                    </div>
                                    <div style={{ width: 30, textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: 'var(--erp-primary)' }}>{item.percentage}%</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Collections & Exams Row */}
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    {/* Recent Collections */}
                    <div className="card" style={{ padding: 20, flex: '1 1 calc(50% - 8px)', minWidth: 300 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--erp-primary)' }}>Recent Collections</h3>
                            <a href="/fees" style={{ fontSize: '0.85rem', color: 'var(--erp-primary)', textDecoration: 'none', fontWeight: 600 }}>View all</a>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {recentCollections.length > 0 ? recentCollections.map((col) => (
                                <div key={col._id} style={{ padding: 12, background: '#f8fafc', borderRadius: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div className="td-bold">{col.studentName}</div>
                                        <div className="td-sm">{col.batchInfo}</div>
                                        <div className="td-sm" style={{ color: '#64748b', marginTop: 2 }}>Rs {fmt(col.amount)} - {new Date(col.date).toLocaleDateString('en-IN')}</div>
                                    </div>
                                    <span style={{ background: '#ecfdf5', color: '#047857', padding: '4px 12px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600 }}>
                                        {col.status}
                                    </span>
                                </div>
                            )) : (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                    No recent collections
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Upcoming Exams */}
                    <div className="card" style={{ padding: 20, flex: '1 1 calc(50% - 8px)', minWidth: 300 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--erp-primary)' }}>Upcoming Exams</h3>
                            <a href="/exams" style={{ fontSize: '0.85rem', color: 'var(--erp-primary)', textDecoration: 'none', fontWeight: 600 }}>Manage</a>
                        </div>
                        {upcomingExams.length > 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {upcomingExams.map((exam) => (
                                    <div key={exam._id} style={{ padding: 12, background: '#f8fafc', borderRadius: 6 }}>
                                        <div className="td-bold">{exam.examName || 'Exam'}</div>
                                        <div className="td-sm">{exam.batchId?.name}</div>
                                        <div className="td-sm" style={{ color: '#64748b', marginTop: 2 }}>
                                            {new Date(exam.examDate).toLocaleDateString('en-IN')}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
                                No upcoming or recent exams available.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ERPLayout>
    );
};

export default DashboardPage;
