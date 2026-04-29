import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2, RefreshCw, Save, Users, AlertCircle, CheckCircle2, X } from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import ToastContainer, { useToast } from '../components/Toast';
import {
    getAdminAttendanceSetup,
    getAdminAttendanceRoster,
    markAdminAttendance,
    getAdminAttendanceReport,
    getAdminAttendanceOverview
} from '../api/attendanceApi';

const STATUS_OPTIONS = [
    { label: 'Present', value: 'Present', color: '#10b981', bg: '#f0fdf4', activeBg: '#10b981', activeText: '#fff' },
    { label: 'Absent', value: 'Absent', color: '#ef4444', bg: '#fef2f2', activeBg: '#ef4444', activeText: '#fff' },
    { label: 'Late', value: 'Late', color: '#f59e0b', bg: '#fffbeb', activeBg: '#f59e0b', activeText: '#fff' },
];

const toLocalDateInputValue = (date = new Date()) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const todayString = () => toLocalDateInputValue(new Date());

const daysAgoString = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return toLocalDateInputValue(date);
};

const formatReadableDate = (value) => {
    if (!value) return '--';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return '--';
    return parsed.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
};

const AttendancePage = () => {
    const { toasts, toast, removeToast } = useToast();
    const [setup, setSetup] = useState({ batches: [], teachers: [], subjects: [] });
    const [roster, setRoster] = useState([]);
    const [history, setHistory] = useState({
        records: [],
        summary: { total: 0, present: 0, absent: 0, late: 0 },
        pagination: { page: 1, pages: 0, total: 0 }
    });
    const [isMarked, setIsMarked] = useState(false);
    const [activeTab, setActiveTab] = useState('mark');
    const [loading, setLoading] = useState({ setup: true, roster: false, save: false, history: false });

    const [filters, setFilters] = useState({
        classLevel: '',
        subjectId: '',
        date: todayString()
    });
    
    const [overviewOpen, setOverviewOpen] = useState(false);
    const [overviewData, setOverviewData] = useState([]);
    const [loadingOverview, setLoadingOverview] = useState(false);

    const [historyFilters, setHistoryFilters] = useState({
        dateFrom: daysAgoString(30),
        dateTo: todayString()
    });

    const classLevels = useMemo(
        () => Array.from(new Set((setup.subjects || []).map((subject) => String(subject.classLevel || 'General').trim() || 'General')))
            .sort((a, b) => a.localeCompare(b)),
        [setup.subjects]
    );

    const availableSubjects = useMemo(() => {
        if (!filters.classLevel) return [];
        return setup.subjects.filter((subject) => (String(subject.classLevel || 'General').trim() || 'General') === filters.classLevel);
    }, [filters.classLevel, setup.subjects]);

    const selectedSubject = useMemo(
        () => setup.subjects.find((subject) => subject._id === filters.subjectId) || null,
        [setup.subjects, filters.subjectId]
    );

    const studentWiseHistory = useMemo(() => {
        const summaryMap = new Map();

        (history.records || []).forEach((record) => {
            const student = record.studentId || {};
            const studentKey = String(student._id || record.studentId || 'unknown');

            if (!summaryMap.has(studentKey)) {
                summaryMap.set(studentKey, {
                    studentId: studentKey,
                    studentName: student.name || 'Unknown Student',
                    rollNo: student.rollNo || '--',
                    batchName: record.batchId?.name || '--',
                    present: 0,
                    absent: 0,
                    late: 0,
                    total: 0,
                    lastMarkedAt: null
                });
            }

            const current = summaryMap.get(studentKey);
            const status = record.status;
            if (status === 'Present') current.present += 1;
            if (status === 'Absent') current.absent += 1;
            if (status === 'Late') current.late += 1;
            current.total += 1;

            const markedAt = new Date(record.attendanceDate || record.date || record.createdAt || 0);
            if (!Number.isNaN(markedAt.getTime()) && (!current.lastMarkedAt || markedAt > current.lastMarkedAt)) {
                current.lastMarkedAt = markedAt;
            }
        });

        return Array.from(summaryMap.values()).sort((a, b) => a.studentName.localeCompare(b.studentName));
    }, [history.records]);

    const loadSetup = async () => {
        try {
            setLoading(l => ({ ...l, setup: true }));
            const response = await getAdminAttendanceSetup();
            setSetup(response.data);
        } catch (error) {
            toast.error('Failed to load attendance setup.');
        } finally {
            setLoading(l => ({ ...l, setup: false }));
        }
    };

    const loadRoster = async () => {
        if (!filters.subjectId) return;

        try {
            setLoading(l => ({ ...l, roster: true }));
            const response = await getAdminAttendanceRoster({
                classLevel: filters.classLevel,
                subjectId: filters.subjectId,
                date: filters.date
            });
            setRoster(response.data.students || []);
            setIsMarked(response.data.isMarked || false);
        } catch (error) {
            toast.error('Failed to load student roster.');
        } finally {
            setLoading(l => ({ ...l, roster: false }));
        }
    };

    const loadHistory = async (nextFilters = historyFilters) => {
        if (!filters.subjectId) return;

        try {
            setLoading(l => ({ ...l, history: true }));
            const response = await getAdminAttendanceReport({
                subjectId: filters.subjectId,
                dateFrom: nextFilters.dateFrom || undefined,
                dateTo: nextFilters.dateTo || undefined,
                limit: 300
            });

            setHistory({
                records: response.data?.records || [],
                summary: response.data?.summary || { total: 0, present: 0, absent: 0, late: 0 },
                pagination: response.data?.pagination || { page: 1, pages: 0, total: 0 }
            });
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to load attendance history.');
        } finally {
            setLoading(l => ({ ...l, history: false }));
        }
    };

    useEffect(() => {
        loadSetup();
    }, []);

    // Automatic loading when filters change
    useEffect(() => {
        if (filters.subjectId) {
            loadRoster();
            if (activeTab === 'history') {
                loadHistory();
            }
        } else {
            setRoster([]);
            setIsMarked(false);
            setHistory({
                records: [],
                summary: { total: 0, present: 0, absent: 0, late: 0 },
                pagination: { page: 1, pages: 0, total: 0 }
            });
        }
    }, [filters.classLevel, filters.subjectId, filters.date]);

    useEffect(() => {
        if (activeTab === 'history' && filters.subjectId) {
            loadHistory();
        }
    }, [activeTab]);

    const handleStatusChange = (studentId, status) => {
        setRoster(prev => prev.map(s => s._id === studentId ? { ...s, attendanceStatus: status } : s));
    };

    const saveAttendance = async () => {
        if (!roster.length) return;

        try {
            setLoading(l => ({ ...l, save: true }));
            await markAdminAttendance({
                subjectId: filters.subjectId,
                date: filters.date,
                entries: roster.map(s => ({
                    studentId: s._id,
                    status: s.attendanceStatus || 'Present'
                }))
            });
            toast.success('Attendance successfully saved.');
            setIsMarked(true);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save attendance.');
        } finally {
            setLoading(l => ({ ...l, save: false }));
        }
    };

    const bulkMark = (status) => {
        setRoster(prev => prev.map(s => ({ ...s, attendanceStatus: status })));
    };

    const loadOverview = async () => {
        try {
            setLoadingOverview(true);
            setOverviewOpen(true);
            const response = await getAdminAttendanceOverview({ date: filters.date });
            setOverviewData(response.data?.markedBatches || []);
        } catch (error) {
            toast.error('Failed to load overview.');
        } finally {
            setLoadingOverview(false);
        }
    };

    return (
        <ERPLayout title="Attendance Management">
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* Added horizontal padding for mobile devices (px-4 sm:px-6 lg:px-8) */}
            <div className="max-w-[1240px] mx-auto space-y-6 pb-20 px-4 sm:px-6 lg:px-8 pt-6">

                {/* Header Section */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Attendance Record</h1>
                        <p className="text-sm sm:text-base text-slate-500 font-medium mt-1">Manage daily attendance for your students efficiently.</p>
                    </div>
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white/50 backdrop-blur-md p-1.5 rounded-xl border border-slate-200/60 shadow-sm w-full sm:w-auto">
                        <div className="flex items-center gap-2 px-3 py-1.5 text-slate-600 font-semibold text-sm border-r border-slate-300 w-full sm:w-auto justify-center sm:justify-start">
                            <CalendarDays size={16} />
                            Date
                        </div>
                        <input
                            type="date"
                            className="w-full sm:w-auto bg-transparent border-none outline-none text-slate-800 font-bold px-3 py-1.5 text-sm"
                            value={filters.date}
                            onChange={(e) => setFilters(f => ({ ...f, date: e.target.value }))}
                        />
                        <button
                            type="button"
                            onClick={loadOverview}
                            className="ml-1 sm:ml-2 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition active:scale-95 flex items-center justify-center whitespace-nowrap w-full sm:w-auto"
                        >
                            View Overview
                        </button>
                    </div>
                </div>

                {/* Selection Box */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-6 shadow-xl shadow-slate-200/40 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-3xl"></div>

                    <div className="space-y-2 relative">
                        <label className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            1. Select Class Level
                        </label>
                        <select
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-slate-700 font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer"
                            value={filters.classLevel}
                            onChange={(e) => {
                                setActiveTab('mark');
                                setFilters(f => ({ ...f, classLevel: e.target.value, subjectId: '' }));
                            }}
                        >
                            <option value="">Choose a Class Level...</option>
                            {classLevels.map(level => <option key={level} value={level}>{level}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2 relative">
                        <label className="text-xs sm:text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                            2. Select Subject
                        </label>
                        <select
                            className={`w-full bg-slate-50 border-2 border-slate-100 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-slate-700 font-bold focus:border-indigo-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer ${!filters.classLevel && 'opacity-50 cursor-not-allowed'}`}
                            value={filters.subjectId}
                            onChange={(e) => {
                                setActiveTab('mark');
                                setFilters(f => ({ ...f, subjectId: e.target.value }));
                            }}
                            disabled={!filters.classLevel}
                        >
                            <option value="">{filters.classLevel ? 'Choose a Subject...' : 'Please select class level first'}</option>
                            {availableSubjects.map(s => <option key={s._id} value={s._id}>{s.name} ({s.code})</option>)}
                        </select>
                    </div>
                </div>

                {/* Main Content Area */}
                {(filters.classLevel && filters.subjectId) && (
                    <div className="bg-white rounded-2xl border border-slate-200/80 p-2 sm:p-3 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setActiveTab('mark')}
                                className={`px-4 py-2.5 rounded-xl text-sm font-black tracking-wide transition ${activeTab === 'mark' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                Mark Attendance
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveTab('history')}
                                className={`px-4 py-2.5 rounded-xl text-sm font-black tracking-wide transition ${activeTab === 'history' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                            >
                                History
                            </button>
                        </div>
                        <p className="mt-2 text-xs sm:text-sm text-slate-500 font-semibold">
                            {filters.classLevel || 'Selected class'} - {selectedSubject?.name || 'Selected subject'}
                        </p>
                    </div>
                )}

                {activeTab === 'mark' && loading.roster ? (
                    <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                        <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-xs">Fetching Roster...</p>
                    </div>
                ) : activeTab === 'mark' && roster.length > 0 ? (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">

                        {/* Status Warning */}
                        {isMarked && (
                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 bg-amber-50 border border-amber-200 p-4 rounded-2xl shadow-sm">
                                <div className="p-2 bg-amber-100 rounded-full shrink-0 w-fit">
                                    <AlertCircle className="text-amber-600" size={20} />
                                </div>
                                <div>
                                    <p className="text-amber-900 font-bold text-sm">Attendance Already Marked</p>
                                    <p className="text-amber-700 text-xs font-medium mt-0.5">Today's attendance for this subject has been recorded. You can still make changes to update it.</p>
                                </div>
                            </div>
                        )}

                        {/* Roster Controls (Cleaned up from dark mode to soft premium card) */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                                    <Users size={24} className="text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Students</p>
                                    <p className="text-2xl font-black text-slate-800 leading-none mt-1">{roster.length}</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto pt-4 border-t border-slate-100 md:pt-0 md:border-none">
                                <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">Mark All As</span>
                                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                                    {STATUS_OPTIONS.map(opt => (
                                        <button
                                            key={opt.value}
                                            onClick={() => bulkMark(opt.value)}
                                            className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all hover:shadow-md active:scale-95 border border-transparent hover:border-slate-200"
                                            style={{ background: opt.bg, color: opt.activeBg }}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Student Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                            {roster.map(student => (
                                <div
                                    key={student._id}
                                    className="bg-white rounded-2xl border border-slate-200/60 p-5 flex flex-col gap-5 hover:shadow-xl hover:shadow-indigo-500/5 hover:border-indigo-200 transition-all duration-300"
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Circular Avatar */}
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-200">
                                            {student.profileImage ? (
                                                <img
                                                    src={student.profileImage}
                                                    alt={student.name}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        e.target.onerror = null;
                                                        e.target.src = '';
                                                        e.target.parentElement.innerHTML = `<span class="text-base sm:text-lg font-black text-slate-400">${student.rollNo || student.name.charAt(0)}</span>`;
                                                    }}
                                                />
                                            ) : (
                                                <span className="text-base sm:text-lg font-black text-slate-400">{student.rollNo || student.name.charAt(0)}</span>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-bold text-slate-800 leading-tight truncate text-base">{student.name}</h3>
                                            <p className="text-xs font-semibold text-slate-400 truncate mt-0.5">Roll: {student.rollNo || 'N/A'}</p>
                                            <p className="text-[11px] font-semibold text-indigo-600 truncate mt-1">Batch: {student.batchName || '--'}</p>
                                        </div>
                                    </div>

                                    {/* Segmented Control Style Buttons */}
                                    <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
                                        {STATUS_OPTIONS.map(opt => {
                                            const isActive = student.attendanceStatus === opt.value;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    onClick={() => handleStatusChange(student._id, opt.value)}
                                                    className={`flex-1 py-2 px-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all truncate ${isActive
                                                        ? 'shadow-sm border border-black/5'
                                                        : 'text-slate-400 hover:bg-slate-200/40 hover:text-slate-600'
                                                        }`}
                                                    style={{
                                                        background: isActive ? opt.activeBg : 'transparent',
                                                        color: isActive ? opt.activeText : ''
                                                    }}
                                                >
                                                    {opt.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Save Trigger - NORMAL layout, no sticky float */}
                        <div className="flex justify-center pt-6 pb-12 w-full">
                            <button
                                onClick={saveAttendance}
                                disabled={loading.save}
                                className=" sm:w-auto justify-center group bg-slate-900  text-white px-8 py-4 rounded-2xl font-bold text-base shadow-lg hover:shadow-xl hover:shadow-indigo-500/25 flex items-center gap-3 transition-all enabled:active:scale-95 disabled:opacity-50"
                            >
                                {loading.save ? (
                                    <Loader2 className="animate-spin shrink-0" size={20} />
                                ) : (
                                    <CheckCircle2 className="shrink-0" size={20} />
                                )}
                                {isMarked ? 'Update Attendance Record' : 'Save Attendance Record'}
                            </button>
                        </div>
                    </div>
                ) : activeTab === 'mark' && (filters.classLevel && filters.subjectId) ? (
                    <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 sm:p-20 flex flex-col items-center justify-center text-center mx-4 sm:mx-0">
                        <div className="p-4 bg-slate-50 rounded-full mb-4">
                            <Users size={32} className="text-slate-300 sm:w-10 sm:h-10" />
                        </div>
                        <h3 className="text-lg sm:text-xl font-black text-slate-800">No Students Found</h3>
                        <p className="text-sm sm:text-base text-slate-500 font-medium max-w-[300px] mt-2">There are no active students matched with this subject selection.</p>
                    </div>
                ) : activeTab === 'history' && (filters.classLevel && filters.subjectId) ? (
                    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-black uppercase tracking-wider text-slate-500">From</label>
                                    <input
                                        type="date"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500"
                                        value={historyFilters.dateFrom}
                                        onChange={(e) => setHistoryFilters((current) => ({ ...current, dateFrom: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black uppercase tracking-wider text-slate-500">To</label>
                                    <input
                                        type="date"
                                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700 outline-none focus:border-indigo-500"
                                        value={historyFilters.dateTo}
                                        onChange={(e) => setHistoryFilters((current) => ({ ...current, dateTo: e.target.value }))}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => loadHistory()}
                                    disabled={loading.history}
                                    className="h-[43px] mt-auto rounded-xl bg-slate-900 text-white font-black text-sm px-4 hover:bg-slate-800 transition disabled:opacity-60"
                                >
                                    {loading.history ? 'Loading...' : 'Load History'}
                                </button>
                                <div className="mt-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-700">
                                    Total Records: {history.summary?.total || 0}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-3">
                                    <p className="text-xs font-black uppercase tracking-wider text-emerald-700">Present</p>
                                    <p className="text-xl font-black text-emerald-800 mt-1">{history.summary?.present || 0}</p>
                                </div>
                                <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-3">
                                    <p className="text-xs font-black uppercase tracking-wider text-rose-700">Absent</p>
                                    <p className="text-xl font-black text-rose-800 mt-1">{history.summary?.absent || 0}</p>
                                </div>
                                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-3">
                                    <p className="text-xs font-black uppercase tracking-wider text-amber-700">Late</p>
                                    <p className="text-xl font-black text-amber-800 mt-1">{history.summary?.late || 0}</p>
                                </div>
                                <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-3">
                                    <p className="text-xs font-black uppercase tracking-wider text-slate-600">Students</p>
                                    <p className="text-xl font-black text-slate-800 mt-1">{studentWiseHistory.length}</p>
                                </div>
                            </div>
                        </div>

                        {loading.history ? (
                            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                                <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-indigo-500/20 border-t-indigo-600 rounded-full animate-spin"></div>
                                <p className="mt-4 text-slate-500 font-bold uppercase tracking-widest text-xs">Fetching History...</p>
                            </div>
                        ) : (history.records || []).length === 0 ? (
                            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 sm:p-20 flex flex-col items-center justify-center text-center mx-4 sm:mx-0">
                                <div className="p-4 bg-slate-50 rounded-full mb-4">
                                    <Users size={32} className="text-slate-300 sm:w-10 sm:h-10" />
                                </div>
                                <h3 className="text-lg sm:text-xl font-black text-slate-800">No History Available</h3>
                                <p className="text-sm sm:text-base text-slate-500 font-medium max-w-[320px] mt-2">No attendance records found for the selected filters.</p>
                            </div>
                        ) : (
                            <>
                                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm">
                                    <h3 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-wider">Student-wise Attendance Summary</h3>
                                    <div className="overflow-x-auto mt-4">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs">
                                                    <th className="text-left py-3 pr-3">Student</th>
                                                    <th className="text-left py-3 pr-3">Roll</th>
                                                    <th className="text-left py-3 pr-3">Batch</th>
                                                    <th className="text-left py-3 pr-3">Present</th>
                                                    <th className="text-left py-3 pr-3">Absent</th>
                                                    <th className="text-left py-3 pr-3">Late</th>
                                                    <th className="text-left py-3 pr-3">Total</th>
                                                    <th className="text-left py-3 pr-3">Present %</th>
                                                    <th className="text-left py-3 pr-3">Last Marked</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {studentWiseHistory.map((student) => {
                                                    const presentRate = student.total > 0 ? Math.round((student.present / student.total) * 100) : 0;
                                                    return (
                                                        <tr key={student.studentId} className="border-b border-slate-100 last:border-b-0">
                                                            <td className="py-3 pr-3 font-bold text-slate-800">{student.studentName}</td>
                                                            <td className="py-3 pr-3 text-slate-600 font-semibold">{student.rollNo}</td>
                                                            <td className="py-3 pr-3 text-slate-600 font-semibold">{student.batchName || '--'}</td>
                                                            <td className="py-3 pr-3 text-emerald-700 font-black">{student.present}</td>
                                                            <td className="py-3 pr-3 text-rose-700 font-black">{student.absent}</td>
                                                            <td className="py-3 pr-3 text-amber-700 font-black">{student.late}</td>
                                                            <td className="py-3 pr-3 text-slate-800 font-black">{student.total}</td>
                                                            <td className="py-3 pr-3 text-slate-700 font-bold">{presentRate}%</td>
                                                            <td className="py-3 pr-3 text-slate-600 font-semibold">{formatReadableDate(student.lastMarkedAt)}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm">
                                    <h3 className="text-sm sm:text-base font-black text-slate-800 uppercase tracking-wider">Past Attendance Records</h3>
                                    <div className="overflow-x-auto mt-4">
                                        <table className="min-w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-slate-200 text-slate-500 uppercase tracking-wider text-xs">
                                                    <th className="text-left py-3 pr-3">Date</th>
                                                    <th className="text-left py-3 pr-3">Student</th>
                                                    <th className="text-left py-3 pr-3">Roll</th>
                                                    <th className="text-left py-3 pr-3">Batch</th>
                                                    <th className="text-left py-3 pr-3">Status</th>
                                                    <th className="text-left py-3 pr-3">Notes</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(history.records || []).map((record) => {
                                                    const statusClass = record.status === 'Present'
                                                        ? 'text-emerald-700'
                                                        : record.status === 'Absent'
                                                            ? 'text-rose-700'
                                                            : 'text-amber-700';
                                                    return (
                                                        <tr key={record._id} className="border-b border-slate-100 last:border-b-0">
                                                            <td className="py-3 pr-3 font-semibold text-slate-700">{formatReadableDate(record.attendanceDate || record.date)}</td>
                                                            <td className="py-3 pr-3 font-bold text-slate-800">{record.studentId?.name || '--'}</td>
                                                            <td className="py-3 pr-3 text-slate-600 font-semibold">{record.studentId?.rollNo || '--'}</td>
                                                            <td className="py-3 pr-3 text-slate-600 font-semibold">{record.batchId?.name || '--'}</td>
                                                            <td className={`py-3 pr-3 font-black ${statusClass}`}>{record.status || '--'}</td>
                                                            <td className="py-3 pr-3 text-slate-600 font-medium">{record.notes || '--'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="bg-slate-50 rounded-3xl p-10 sm:p-16 flex flex-col items-center justify-center text-center opacity-80 border-2 border-slate-100 mx-4 sm:mx-0">
                        <div className="p-4 sm:p-5 bg-white rounded-2xl shadow-sm mb-4 sm:mb-6">
                            <RefreshCw size={24} className="text-indigo-400 animate-pulse sm:w-8 sm:h-8" />
                        </div>
                        <h3 className="text-base sm:text-lg font-black text-slate-900">Waiting for Selection</h3>
                        <p className="text-sm sm:text-base text-slate-500 font-medium max-w-sm mt-2 italic">Choose class level and subject to load all linked students and start marking attendance.</p>
                    </div>
                )}
            </div>

            <style>{`
                ::-webkit-calendar-picker-indicator {
                    filter: invert(0.3);
                    cursor: pointer;
                }
            `}</style>

            {/* Overview Modal */}
            {overviewOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Attendance Overview</h2>
                                <p className="text-sm font-semibold text-slate-500 mt-0.5">Date: {formatReadableDate(filters.date)}</p>
                            </div>
                            <button
                                onClick={() => setOverviewOpen(false)}
                                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 rounded-xl transition"
                            >
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>
                        
                        <div className="p-5 overflow-y-auto bg-slate-50 flex-1">
                            {loadingOverview ? (
                                <div className="flex flex-col items-center justify-center py-12">
                                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                                    <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Loading Overview...</p>
                                </div>
                            ) : overviewData.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="w-16 h-16 bg-white border-2 border-dashed border-slate-200 rounded-full flex items-center justify-center mb-4">
                                        <CalendarDays className="text-slate-300" size={24} />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-800">No Attendance Marked</h3>
                                    <p className="text-slate-500 font-medium text-sm mt-1 max-w-xs">There are no attendance records for any batch on this selected date.</p>
                                </div>
                            ) : (
                                <div className="grid gap-3">
                                    {overviewData.map((item, idx) => (
                                        <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                                    <CheckCircle2 className="text-indigo-500" size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-slate-800">{item.batchName || 'Unknown Batch'}</h4>
                                                    <p className="text-xs font-bold text-slate-500 mt-0.5">{item.subjectName || 'Unknown Subject'} <span className="text-slate-300 px-1">•</span> {item.classLevel || 'General'}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Present/Marked</p>
                                                <p className="text-lg font-black text-emerald-600 mt-0.5">{item.totalMarked}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-white">
                            <button
                                onClick={() => setOverviewOpen(false)}
                                className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition active:scale-[0.98]"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ERPLayout>
    );
};

export default AttendancePage;
