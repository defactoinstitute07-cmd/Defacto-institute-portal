import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Plus, RefreshCw, Search, Pencil, Trash2, X, Lock,
    Loader2, AlertCircle, CheckCircle2, BookOpen, Users,
    IndianRupee, Calendar, ChevronDown, Eye, EyeOff, ShieldAlert, FileDown
} from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import ToastContainer, { useToast } from '../components/Toast';
import ActionModal from '../components/common/ActionModal';
import AlertMessage from '../components/common/AlertMessage';

// ── API helper ───────────────────────────────────────────────
import { API_BASE_URL } from '../api/apiConfig';

const API = () => axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

// Dynamically fallback from user's global config
const getDynamicClasses = () => {
    try {
        const settings = JSON.parse(localStorage.getItem('instituteSettings'));
        if (settings && settings.classesOffered && settings.classesOffered.length) {
            return settings.classesOffered;
        }
    } catch (e) { }
    // Global fallback
    return ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
};

const EMPTY_FORM = {
    name: '', course: '', capacity: 30, subjects: [],
    classroom: '', schedule: [], fees: '',
    startDate: '', endDate: ''
};

// ══════════════════════════════════════════════════════════════
// TimetableGrid Component
// ══════════════════════════════════════════════════════════════
const TimetableGrid = ({ days, timeSlots, classroom, occupancy, selected, onToggle }) => {
    const getOccupant = (day, time) => occupancy?.[classroom]?.[day]?.[time] || null;
    const isSelected = (day, time) => selected.some(s => s.day === day && s.time === time);

    return (
        <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', fontSize: '0.72rem', minWidth: 600 }}>
                <thead>
                    <tr>
                        <th style={{ padding: '6px 10px', background: 'var(--erp-bg2)', border: '1px solid var(--erp-border)', color: 'var(--erp-muted2)', width: 70, textAlign: 'left', fontSize: '0.7rem', fontWeight: 700 }}>
                            TIME
                        </th>
                        {days.map(day => (
                            <th key={day} style={{
                                padding: '6px 4px', background: 'var(--erp-bg2)', border: '1px solid var(--erp-border)',
                                color: 'var(--erp-primary)', fontWeight: 700, fontSize: '0.7rem', textAlign: 'center', minWidth: 68
                            }}>
                                {day.slice(0, 3).toUpperCase()}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {timeSlots.map(time => (
                        <tr key={time}>
                            <td style={{
                                padding: '4px 8px', border: '1px solid var(--erp-border)',
                                background: 'var(--erp-bg2)', color: 'var(--erp-muted2)',
                                fontWeight: 600, whiteSpace: 'nowrap', fontSize: '0.7rem'
                            }}>
                                {time}
                            </td>
                            {days.map(day => {
                                const occupant = getOccupant(day, time);
                                const selected_ = isSelected(day, time);
                                const locked = !!occupant;

                                return (
                                    <td key={day} style={{ border: '1px solid var(--erp-border)', padding: 0 }}>
                                        <div
                                            title={locked ? `Occupied by: ${occupant}` : selected_ ? 'Click to deselect' : 'Click to select'}
                                            onClick={() => !locked && onToggle(day, time)}
                                            style={{
                                                width: '100%', height: 32,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                cursor: locked ? 'not-allowed' : 'pointer',
                                                background: locked
                                                    ? '#f1f5f9'
                                                    : selected_
                                                        ? 'var(--erp-primary)'
                                                        : '#fff',
                                                transition: 'background 0.15s',
                                                position: 'relative'
                                            }}
                                        >
                                            {locked && <Lock size={11} color="#94a3b8" />}
                                            {!locked && selected_ && <CheckCircle2 size={12} color="#fff" />}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
            <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--erp-muted2)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 14, height: 14, background: 'var(--erp-primary)', borderRadius: 3, display: 'inline-block' }} />
                    Selected
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 14, height: 14, background: '#f1f5f9', border: '1px solid var(--erp-border)', borderRadius: 3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={8} color="#94a3b8" />
                    </span>
                    Occupied (hover for batch name)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ width: 14, height: 14, background: '#fff', border: '1px solid var(--erp-border)', borderRadius: 3 }} />
                    Available
                </span>
            </div>
        </div>
    );
};

// Inline PasswordModal and DeleteModal implementation removed in favor of reusable ActionModal

// ══════════════════════════════════════════════════════════════
// Batch Row
// ══════════════════════════════════════════════════════════════
const BatchRow = ({ batch, onEdit, onDelete }) => {
    const schedDays = [...new Set((batch.schedule || []).map(s => s.day.slice(0, 3)))].join(', ');

    return (
        <tr>
            <td>
                <div className="td-bold">{batch.name}</div>
                <div className="td-sm">{batch.course || '—'}</div>
            </td>
            <td>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {batch.subjects?.length
                        ? batch.subjects.map(s => (
                            <span key={s} className="chip" style={{ fontSize: '0.68rem' }}>{s}</span>
                        ))
                        : <span className="td-sm">—</span>
                    }
                </div>
            </td>
            <td>
                {batch.schedule?.length
                    ? <div>{schedDays || '—'}<div className="td-sm">{batch.schedule.length} slot{batch.schedule.length !== 1 ? 's' : ''}/week</div></div>
                    : <span className="td-sm">—</span>
                }
            </td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Users size={13} color="var(--erp-muted2)" />
                    <span className="td-bold">{batch.studentCount || 0}</span>
                    {batch.capacity && <span className="td-sm">/ {batch.capacity}</span>}
                </div>
            </td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <IndianRupee size={12} color="var(--erp-success)" />
                    <span className="td-bold" style={{ color: 'var(--erp-success)' }}>
                        {(batch.earnings || 0).toLocaleString('en-IN')}
                    </span>
                </div>
                {batch.fees > 0 && <div className="td-sm">₹{batch.fees.toLocaleString()}/student</div>}
            </td>
            <td>
                <span className={`badge ${batch.isActive ? 'badge-active' : 'badge-overdue'}`}>
                    {batch.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td>
                <div className="flex gap-2">
                    <button className="btn btn-outline btn-sm" onClick={() => onEdit(batch)} title="Edit batch">
                        <Pencil size={13} />
                    </button>
                    <button className="btn btn-outline btn-sm !text-red-600 border-red-600 hover:bg-red-600 hover:text-white" onClick={() => onDelete(batch)} title="Delete batch">
                        <Trash2 size={13} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

// ══════════════════════════════════════════════════════════════
// Main Page
// ══════════════════════════════════════════════════════════════
const BatchesPage = () => {
    const navigate = useNavigate();
    const { toasts, toast, removeToast } = useToast();

    // ── Data state ──────────────────────────────────────────
    const [batches, setBatches] = useState([]);
    const [config, setConfig] = useState({ days: [], timeSlots: [], classrooms: [] });
    const [subjects, setSubjects] = useState([]);
    const [occupancy, setOccupancy] = useState({});
    const [total, setTotal] = useState(0);

    // ── UI state ─────────────────────────────────────────────
    const [loading, setLoading] = useState(true);
    const [filterCourse, setFilterCourse] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // ── Modal state ──────────────────────────────────────────
    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [editingBatch, setEditingBatch] = useState(null);
    const [formSaving, setFormSaving] = useState(false);
    const [subjLoading, setSubjLoading] = useState(false);
    const [occLoading, setOccLoading] = useState(false);
    const [isAutoScheduling, setIsAutoScheduling] = useState(false);

    // ── Form state ───────────────────────────────────────────
    const [form, setForm] = useState(EMPTY_FORM);

    // ── Password modal (for updates) ─────────────────────────
    const [showPwdModal, setShowPwdModal] = useState(false);
    const [pwdLoading, setPwdLoading] = useState(false);
    const [pwdError, setPwdError] = useState('');
    const pendingFormRef = useRef(null);

    // ── Delete modal ─────────────────────────────────────────
    const [showDelModal, setShowDelModal] = useState(false);
    const [delBatch, setDelBatch] = useState(null);
    const [delLoading, setDelLoading] = useState(false);
    const [delError, setDelError] = useState('');

    // ── Load batches ─────────────────────────────────────────
    const loadBatches = useCallback(async () => {
        if (!localStorage.getItem('token')) { navigate('/login'); return; }

        const isAllRecords = filterCourse === 'all';
        const isDefaultLoad = !search && !filterCourse && !isAllRecords;

        setLoading(true);
        try {
            const limit = isDefaultLoad ? 5 : 10;
            const params = { page, limit };
            const apiCourse = filterCourse === 'all' ? '' : filterCourse;
            if (apiCourse) params.course = apiCourse;
            if (search) params.search = search;

            const { data } = await API().get('/batches', { params });

            if (page === 1) {
                setBatches(data.batches || []);
            } else {
                setBatches(prev => {
                    const existingIds = new Set(prev.map(b => b._id));
                    const newBs = (data.batches || []).filter(b => !existingIds.has(b._id));
                    return [...prev, ...newBs];
                });
            }

            setTotal(data.total || 0);
            setTotalPages(data.pages || 1);
        } catch (e) {
            if (e.response?.status === 401) navigate('/login');
            else toast.error('Failed to load batches');
        } finally { setLoading(false); }
    }, [filterCourse, search, page, navigate]);

    // ── Load scheduler config ────────────────────────────────
    useEffect(() => {
        API().get('/scheduler/config')
            .then(({ data }) => setConfig(data))
            .catch(() => toast.warning('Could not load scheduler config'));
    }, []);

    useEffect(() => { loadBatches(); }, [loadBatches]);
    useEffect(() => { const t = setTimeout(() => { setPage(1); loadBatches(); }, 400); return () => clearTimeout(t); }, [search]);
    useEffect(() => { setPage(1); }, [filterCourse]);

    // ── Load subjects by course ──────────────────────────────
    useEffect(() => {
        if (!form.course) { setSubjects([]); return; }
        setSubjLoading(true);
        API().get(`/batches/courses/${encodeURIComponent(form.course)}/subjects`)
            .then(({ data }) => setSubjects(data.subjects))
            .catch(() => setSubjects([]))
            .finally(() => setSubjLoading(false));
    }, [form.course]);

    // ── Load occupancy when classroom changes ────────────────
    useEffect(() => {
        if (!form.classroom) { setOccupancy({}); return; }
        setOccLoading(true);
        const params = editingBatch ? { excludeBatchId: editingBatch._id } : {};
        API().get('/batches/room-occupancy', { params })
            .then(({ data }) => setOccupancy(data.occupancy))
            .catch(() => setOccupancy({}))
            .finally(() => setOccLoading(false));
    }, [form.classroom, editingBatch]);

    // ── Open modals ───────────────────────────────────────────
    const openCreate = () => {
        setForm(EMPTY_FORM);
        setEditingBatch(null);
        setSubjects([]);
        setOccupancy({});
        setModalMode('create');
        setShowModal(true);
    };

    const openEdit = (batch) => {
        setForm({
            name: batch.name,
            course: batch.course || '',
            capacity: batch.capacity || 30,
            subjects: batch.subjects || [],
            classroom: batch.classroom || '',
            schedule: batch.schedule || [],
            fees: batch.fees || '',
            teacher: batch.teacher || '',
            startDate: batch.startDate ? new Date(batch.startDate).toISOString().split('T')[0] : '',
            endDate: batch.endDate ? new Date(batch.endDate).toISOString().split('T')[0] : ''
        });
        setEditingBatch(batch);
        setModalMode('edit');
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditingBatch(null); };

    // ── Subject toggle ────────────────────────────────────────
    const toggleSubject = (sub) => {
        setForm(f => ({
            ...f,
            subjects: f.subjects.includes(sub)
                ? f.subjects.filter(s => s !== sub)
                : [...f.subjects, sub]
        }));
    };

    // ── Slot toggle ───────────────────────────────────────────
    const toggleSlot = (day, time) => {
        setForm(f => {
            const exists = f.schedule.some(s => s.day === day && s.time === time);
            return {
                ...f,
                schedule: exists
                    ? f.schedule.filter(s => !(s.day === day && s.time === time))
                    : [...f.schedule, { day, time }]
            };
        });
    };

    // ── Auto-Schedule (AI) ────────────────────────────────────
    const handleAutoSchedule = async () => {
        if (!form.classroom) return toast.error('Please select a classroom first');
        setIsAutoScheduling(true);
        try {
            const { data } = await API().post('/scheduler/auto', {
                classroom: form.classroom,
                subjects: form.subjects,
                excludeBatchId: editingBatch?._id
            });
            if (data.schedule) {
                setForm(f => ({ ...f, schedule: data.schedule }));
                toast.success('Smart schedule generated! ✨');
            }
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to auto-schedule');
        } finally {
            setIsAutoScheduling(false);
        }
    };

    // ── Save (CREATE) ─────────────────────────────────────────
    const handleCreate = async () => {
        setFormSaving(true);
        try {
            await API().post('/batches', form);
            toast.success(`Batch "${form.name}" created successfully!`);
            closeModal();
            loadBatches();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to create batch');
        } finally { setFormSaving(false); }
    };

    // ── Save (UPDATE) — open password modal first ─────────────
    const handleUpdateIntent = () => {
        pendingFormRef.current = { ...form };
        setPwdError('');
        setShowPwdModal(true);
    };

    const confirmUpdate = async (password) => {
        setPwdLoading(true); setPwdError('');
        try {
            await API().put(`/batches/${editingBatch._id}`, { ...pendingFormRef.current, adminPassword: password });
            toast.success(`Batch "${form.name}" updated!`);
            setShowPwdModal(false);
            closeModal();
            loadBatches();
        } catch (e) {
            setPwdError(e.response?.data?.message || 'Update failed');
        } finally { setPwdLoading(false); }
    };

    // ── Submit handler ────────────────────────────────────────
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.error('Batch name is required');
        if (modalMode === 'create') handleCreate();
        else handleUpdateIntent();
    };

    // ── Delete flow ───────────────────────────────────────────
    const openDelete = (batch) => {
        setDelBatch(batch);
        setDelError('');
        setShowDelModal(true);
    };

    const confirmDelete = async (password) => {
        setDelLoading(true); setDelError('');
        try {
            await API().delete(`/batches/${delBatch._id}`, { data: { adminPassword: password } });
            toast.success(`Batch "${delBatch.name}" deleted`);
            setShowDelModal(false);
            setDelBatch(null);
            loadBatches();
        } catch (e) {
            setDelError(e.response?.data?.message || 'Delete failed. Check your password.');
        } finally { setDelLoading(false); }
    };

    const fmt = n => (n || 0).toLocaleString('en-IN');

    const exportData = () => {
        if (batches.length === 0) {
            toast.error('No records to export');
            return;
        }
        const csvRows = [];
        const headers = ['Batch Name', 'Course', 'Subjects', 'Schedule', 'Student Count', 'Capacity', 'Earnings', 'Fees/Student', 'Status'];
        csvRows.push(headers.join(','));

        batches.forEach(b => {
            const name = b.name || '';
            const course = b.course || '';
            const subjects = (b.subjects || []).join('; ') || 'N/A';
            const schedule = [...new Set((b.schedule || []).map(s => s.day.slice(0, 3)))].join('; ') || 'N/A';
            const studentCount = b.studentCount || 0;
            const capacity = b.capacity || '';
            const earnings = b.earnings || 0;
            const fees = b.fees || 0;
            const status = b.isActive ? 'Active' : 'Inactive';

            csvRows.push([
                `"${name}"`, `"${course}"`, `"${subjects}"`, `"${schedule}"`, studentCount, capacity, earnings, fees, `"${status}"`
            ].join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `Batches_Export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success('CSV exported!');
    };

    // ═══════════════════════════════════════════════════════════
    // RENDER
    // ═══════════════════════════════════════════════════════════
    return (
        <ERPLayout title="Batch Management">
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* ── Page Header ─────────────────────────────── */}
            <div className="page-hdr">
                <div>
                    <h1>Batch Management</h1>
                    <p>{total} batch{total !== 1 ? 'es' : ''} configured</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-outline" onClick={exportData} title="Export CSV">
                        <FileDown size={14} /> Export CSV
                    </button>
                    <button className="btn btn-outline" onClick={loadBatches} title="Refresh">
                        <RefreshCw size={14} className={loading ? 'spin' : ''} />
                        Refresh
                    </button>
                    <button className="btn btn-primary" onClick={openCreate}>
                        <Plus size={15} /> Create New Batch
                    </button>
                </div>
            </div>

            {/* ── Filter Bar ──────────────────────────────── */}
            <div className="card toolbar rounded-xl" style={{ marginBottom: 20 }}>
                <div className="tb-search-wrap">
                    <Search size={15} />
                    <input className="tb-search" placeholder="Search batch name or course…"
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <select className="tb-select" style={{ minWidth: 180 }}
                    value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
                    <option value="">Select Filter</option>
                    <option value="all">All Records</option>
                    {getDynamicClasses().map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {(filterCourse || search) && (
                    <button className="btn btn-outline btn-sm" onClick={() => { setFilterCourse(''); setSearch(''); }}>
                        <X size={13} /> Clear
                    </button>
                )}
            </div>

            {/* ── Batch Table ──────────────────────────────── */}
            <div className="card">
                {loading && page === 1 ? (
                    <div className="loader-wrap"><div className="spinner" /><p>Loading batches…</p></div>
                ) : batches.length === 0 ? (
                    <div className="empty">
                        <div className="empty-icon">
                            <Search size={40} strokeWidth={1.2} color="var(--erp-muted)" />
                        </div>
                        <p style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 6 }}>
                            No records found
                        </p>
                        <p className="td-sm" style={{ maxWidth: "280px", margin: "0 auto" }}>
                            Try adjusting your search criteria or filters to find what you're looking for.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="erp-table-wrap">
                            <table className="erp-table">
                                <thead>
                                    <tr>
                                        <th>Batch</th>
                                        <th>Subjects</th>
                                        <th>Schedule</th>
                                        <th>Enrollment</th>
                                        <th>Earnings</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {batches.map(b => (
                                        <BatchRow key={b._id} batch={b} onEdit={openEdit} onDelete={openDelete} />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {batches.length > 0 && (
                            <div style={{ marginTop: 20, marginBottom: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                <div className="text-sm text-slate-500 font-medium">Showing {batches.length} of {total} records</div>
                                {page < totalPages && (
                                    <button className="btn btn-outline" disabled={loading} onClick={() => setPage(p => p + 1)}>
                                        {loading ? <><div className="spinner w-4 h-4 border-2 mr-2" /> Loading...</> : 'Load More'}
                                    </button>
                                )}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* ═══════════════════════════════════════════════
                CREATE / EDIT MODAL
            ═══════════════════════════════════════════════ */}
            {
                showModal && (
                    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
                        <div className="modal" style={{
                            maxWidth: 820,
                            width: '95vw',
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            borderRadius: '24px',
                            border: 'none',
                            background: '#fff'
                        }}>
                            {/* --- PREMIUM BATCH FORM HEADER --- */}
                            <div style={{
                                padding: '32px 24px',
                                background: 'linear-gradient(135deg, #312e81 0%, #4338ca 100%)',
                                position: 'relative',
                                color: '#fff',
                                overflow: 'hidden'
                            }}>
                                <BookOpen size={120} style={{ position: 'absolute', right: -10, bottom: -20, opacity: 0.1, color: '#fff' }} />

                                <button type="button" onClick={closeModal} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', color: '#fff', padding: 6, cursor: 'pointer' }}>
                                    <X size={18} />
                                </button>

                                <div style={{ position: 'relative', zIndex: 1 }}>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                                        {modalMode === 'edit' ? 'Update Academic Batch' : 'Create New Batch'}
                                    </h2>
                                    <p style={{ fontSize: '0.9rem', opacity: 0.9, marginTop: 4, fontWeight: 500 }}>
                                        {modalMode === 'edit' ? `Modifying configuration for ${editingBatch?.name}` : 'Setup a new teaching group and timetable'}
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

                                    {/* ── Basic Info ────────────────────── */}
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        Basic Information
                                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                                    </div>
                                    <div className="mf-row">
                                        <div className="mf">
                                            <label>Batch Name *</label>
                                            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                                placeholder="e.g.SCI-11-26" required />
                                        </div>
                                        <div className="mf">
                                            <label>Class / Course</label>
                                            <select value={form.course} onChange={e => setForm(f => ({ ...f, course: e.target.value, subjects: [] }))}>
                                                <option value="">Select course…</option>
                                                {getDynamicClasses().map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="mf-row">
                                        <div className="mf">
                                            <label>Fees per Student (₹ / Month)</label>
                                            <input type="number" value={form.fees}
                                                onChange={e => setForm(f => ({ ...f, fees: e.target.value }))} placeholder="0" min="0" />
                                        </div>
                                        <div className="mf">
                                            <label>Capacity</label>
                                            <input type="number" value={form.capacity}
                                                onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} placeholder="30" min="1" />
                                        </div>
                                    </div>

                                    <div className="mf-row">
                                        <div className="mf">
                                            <label>Batch Start Date</label>
                                            <div style={{ position: 'relative' }}>
                                                <input type="date" value={form.startDate}
                                                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                                            </div>
                                            <p className="td-sm" style={{ marginTop: 4 }}>Date when fee generation begins</p>
                                        </div>
                                        <div className="mf">
                                            <label>Batch End Date</label>
                                            <div style={{ position: 'relative' }}>
                                                <input type="date" value={form.endDate}
                                                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                                            </div>
                                            <p className="td-sm" style={{ marginTop: 4 }}>Date when fee generation stops</p>
                                        </div>
                                    </div>


                                    <hr className="divider" />

                                    {/* ── Subject Selection ──────────────── */}
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        Subject Assignment
                                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                                    </div>
                                    {!form.course ? (
                                        <div style={{ fontSize: '0.84rem', color: 'var(--erp-muted2)', padding: '12px 0', background: 'var(--erp-bg2)', borderRadius: 8, textAlign: 'center', marginBottom: 14 }}>
                                            Select a course above to load available subjects
                                        </div>
                                    ) : subjLoading ? (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--erp-muted2)', fontSize: '0.84rem', marginBottom: 14 }}>
                                            <Loader2 size={15} className="spin" /> Loading subjects…
                                        </div>
                                    ) : subjects.length === 0 ? (
                                        <div style={{ fontSize: '0.84rem', color: 'var(--erp-muted2)', marginBottom: 14 }}>No subjects found for this course.</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                            {subjects.map(sub => {
                                                const checked = form.subjects.includes(sub);
                                                return (
                                                    <button key={sub} type="button" onClick={() => toggleSubject(sub)}
                                                        style={{
                                                            padding: '6px 14px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.16s',
                                                            background: checked ? 'var(--erp-primary)' : 'var(--erp-input-bg)',
                                                            color: checked ? '#fff' : 'var(--erp-text2)',
                                                            border: `1.5px solid ${checked ? 'var(--erp-primary)' : 'var(--erp-border)'}`,
                                                        }}>
                                                        {checked && <CheckCircle2 size={12} style={{ marginRight: 5, verticalAlign: 'middle' }} />}
                                                        {sub}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <hr className="divider" />

                                    {/* ── Classroom & Timetable ──────────── */}
                                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#4338ca', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        Classroom & Timetable
                                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                                    </div>
                                    <div className="mf" style={{ maxWidth: 260 }}>
                                        <label>Classroom</label>
                                        <select value={form.classroom} onChange={e => setForm(f => ({ ...f, classroom: e.target.value, schedule: [] }))}>
                                            <option value="">Select classroom…</option>
                                            {config.classrooms.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>

                                    {form.classroom ? (
                                        occLoading ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--erp-muted2)', fontSize: '0.84rem', padding: '12px 0' }}>
                                                <Loader2 size={15} className="spin" /> Checking room occupancy…
                                            </div>
                                        ) : (
                                            <div>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                                                    <p style={{ fontSize: '0.82rem', color: 'var(--erp-muted2)' }}>
                                                        Click slots to schedule — <strong>{form.schedule.length}</strong> slot{form.schedule.length !== 1 ? 's' : ''} selected
                                                    </p>
                                                    <div style={{ display: 'flex', gap: 8 }}>
                                                        <button type="button" className="btn btn-primary btn-sm"
                                                            style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', border: 'none' }}
                                                            onClick={handleAutoSchedule} disabled={isAutoScheduling}>
                                                            {isAutoScheduling ? <><Loader2 size={13} className="spin" style={{ marginRight: 5 }} /> Generating…</> : '✨ Auto-Schedule (AI)'}
                                                        </button>
                                                        {form.schedule.length > 0 && (
                                                            <button type="button" className="btn btn-outline btn-sm"
                                                                onClick={() => setForm(f => ({ ...f, schedule: [] }))}>
                                                                Clear slots
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                                {config.days?.length > 0 && config.timeSlots?.length > 0 ? (
                                                    <TimetableGrid
                                                        days={config.days}
                                                        timeSlots={config.timeSlots}
                                                        classroom={form.classroom}
                                                        occupancy={occupancy}
                                                        selected={form.schedule}
                                                        onToggle={toggleSlot}
                                                    />
                                                ) : (
                                                    <div className="empty"><p>Scheduler config not loaded.</p></div>
                                                )}
                                            </div>
                                        )
                                    ) : (
                                        <div style={{ background: 'var(--erp-bg2)', borderRadius: 8, padding: 16, textAlign: 'center', color: 'var(--erp-muted2)', fontSize: '0.84rem' }}>
                                            <Calendar size={24} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                                            Select a classroom to configure the timetable
                                        </div>
                                    )}
                                </div>

                                <div className="modal-footer" style={{ borderTop: '1px solid #e2e8f0', padding: '16px 24px', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                                    <button type="button" className="btn" style={{ padding: '12px 24px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer' }} onClick={closeModal}>Cancel</button>
                                    <button type="submit" className="btn" style={{ padding: '12px 32px', background: '#312e81', color: '#fff', borderRadius: '12px', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }} disabled={formSaving}>
                                        {formSaving ? <><Loader2 size={16} className="spin" /> Saving…</> : modalMode === 'edit' ? 'Update Batch' : 'Create Batch'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* ═══════════════════════════════════════════════
                PASSWORD MODAL (for update)
            ═══════════════════════════════════════════════ */}
            <ActionModal
                isOpen={showPwdModal}
                onClose={() => setShowPwdModal(false)}
                onConfirm={confirmUpdate}
                title="Admin Verification"
                description="Updating a batch requires admin password verification for security."
                actionType="verify"
                loading={pwdLoading}
                error={pwdError}
            />

            {/* ═══════════════════════════════════════════════
                DELETE MODAL
            ═══════════════════════════════════════════════ */}
            {
                showDelModal && delBatch && (
                    <ActionModal
                        isOpen={showDelModal}
                        onClose={() => { setShowDelModal(false); setDelBatch(null); }}
                        onConfirm={confirmDelete}
                        title="Delete Batch"
                        description={`You are about to delete "${delBatch?.name}". All timetable slots and assignments will be lost.`}
                        actionType="delete"
                        loading={delLoading}
                        error={delError}
                    />
                )
            }
        </ERPLayout>
    );
};

export default BatchesPage;
