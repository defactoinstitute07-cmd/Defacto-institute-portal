import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus, RefreshCw, Search, Pencil, Trash2, X, Lock,
    Loader2, AlertCircle, CheckCircle2, BookOpen, Users,
    IndianRupee, Calendar, ChevronDown, Eye, EyeOff, ShieldAlert, FileDown
} from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import ToastContainer, { useToast } from '../components/Toast';
import ActionModal from '../components/common/ActionModal';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { SkeletonTable } from '../components/common/SkeletonLoaders';

// â”€â”€ API helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import apiClient from '../api/apiConfig';
import { getSubjects } from '../api/subjectApi';
import { hasClientSession } from '../utils/authSession';

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
    fees: '',
    startDate: '', endDate: '',
    classroom: '',
    schedule: [],
    schedulerConfig: { daysCount: 6, timings: ['09:00', '10:00', '11:00'] }
};

const toDateInputValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// TimetableGrid Component
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const TimetableGrid = ({ days, timeSlots, classroom, occupancy, selected, onToggle }) => {
    const getOccupant = (day, time) => occupancy?.[classroom]?.[day]?.[time] || null;
    const getSelectedSlot = (day, time) => selected.find(s => s.day === day && s.time === time);

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
                                const selectedSlot = getSelectedSlot(day, time);
                                const selected_ = !!selectedSlot;
                                const locked = !!occupant && !selected_; // If we selected it, it's not locked to us
                                const isOtherRoom = selectedSlot && selectedSlot.room && selectedSlot.room !== classroom;

                                return (
                                    <td key={day} style={{ border: '1px solid var(--erp-border)', padding: 0 }}>
                                        <div
                                            title={isOtherRoom ? `Selected in ${selectedSlot.room}` : locked ? `Occupied by: ${occupant} (Click to overwrite/merge)` : selected_ ? 'Click to deselect' : 'Click to select'}
                                            onClick={() => onToggle(day, time)}
                                            style={{
                                                width: '100%', height: 32,
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                                cursor: 'pointer',
                                                background: locked
                                                    ? '#f1f5f9'
                                                    : selected_
                                                        ? (isOtherRoom ? '#64748b' : 'var(--erp-primary)')
                                                        : '#fff',
                                                transition: 'background 0.15s',
                                                position: 'relative',
                                                lineHeight: 1
                                            }}
                                        >
                                            {locked && !selected_ && <Lock size={11} color="#94a3b8" />}
                                            {selected_ && (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                                                    <span style={{ fontSize: '0.55rem', color: '#fff', fontWeight: 700, textAlign: 'center', padding: '0 2px', lineHeight: 1.1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                                                        {selectedSlot.subject || 'Lec'}
                                                    </span>
                                                    {isOtherRoom && <span style={{ fontSize: '0.45rem', color: '#f8fafc', fontWeight: 600 }}>{selectedSlot.room}</span>}
                                                    {selectedSlot.isMerged && <span style={{ fontSize: '0.4rem', color: '#cbd5e1', fontStyle: 'italic' }}>SHARED</span>}
                                                </div>
                                            )}
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
                    <span style={{ width: 14, height: 14, background: '#64748b', borderRadius: 3, display: 'inline-block' }} />
                    Selected (Other Room)
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Utility Functions
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const fmt = (n) => (n || 0).toLocaleString('en-IN');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Batch Row
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const BatchRow = ({ batch, onEdit, onDelete }) => {
    const navigate = useNavigate();
    const scheduleArray = Array.isArray(batch.schedule) ? batch.schedule : [];
    const legacySlots = Array.isArray(batch.timeSlots) ? batch.timeSlots : [];

    const schedDays = scheduleArray.length
        ? [...new Set(scheduleArray
            .map(s => (s && s.day ? String(s.day).slice(0, 3) : ''))
            .filter(Boolean))].join(', ')
        : legacySlots.length
            ? [...new Set(legacySlots
                .map(slot => String(slot).split(' ')[0].slice(0, 3))
                .filter(Boolean))].join(', ')
            : '';

    return (
        <tr>
            <td data-label="Batch">
                <div className="td-bold">{batch.name}</div>
                <div className="td-sm">{batch.course || '-'}</div>
            </td>
            <td data-label="Subjects">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {batch.subjects?.length
                        ? batch.subjects.map(s => (
                            <span key={s} className="chip" style={{ fontSize: '0.68rem' }}>{s}</span>
                        ))
                        : <span className="td-sm">-</span>
                    }
                </div>
            </td>

            <td data-label="Enrollment">
                <div className="td-bold">{batch.studentCount || 0} / {batch.capacity || 30}</div>
                <div className="progress-bar-container" style={{ width: 60, height: 4, background: '#e2e8f0', borderRadius: 2, marginTop: 4 }}>
                    <div style={{ width: `${Math.min((batch.studentCount / (batch.capacity || 30)) * 100, 100)}%`, height: '100%', background: 'var(--erp-primary)', borderRadius: 2 }}></div>
                </div>
            </td>

            <td data-label="Status">
                <span className={`badge ${batch.isActive ? 'badge-active' : 'badge-inactive'}`}>
                    {batch.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td data-label="Actions">
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-icon" onClick={() => navigate(`/batches/${batch._id}`)} title="View Details">
                        <Eye size={14} />
                    </button>
                    <button className="btn-icon" onClick={() => onEdit(batch)} title="Edit">
                        <Pencil size={14} />
                    </button>
                    <button className="btn-icon text-red-500" onClick={() => onDelete(batch)} title="Delete">
                        <Trash2 size={14} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// Main BatchesPage Component
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
const BatchesPage = () => {
    const navigate = useNavigate();
    const { toasts, toast, removeToast } = useToast();

    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [filterCourse, setFilterCourse] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [editingBatch, setEditingBatch] = useState(null);
    const [form, setForm] = useState({
        ...EMPTY_FORM,
        classroom: '',
        schedule: [],
        schedulerConfig: { daysCount: 6, timings: ['09:00', '10:00', '11:00'] }
    });

    const [subjects, setSubjects] = useState([]);
    const availableSubjects = subjects;
    const [subjLoading, setSubjLoading] = useState(false);
    const [activeSubject, setActiveSubject] = useState(null);

    const [occupancy, setOccupancy] = useState({});
    const [occLoading, setOccLoading] = useState(false);
    const [config, setConfig] = useState({ classrooms: [], days: [], timeSlots: [] });
    const [formSaving, setFormSaving] = useState(false);

    const [showPwdModal, setShowPwdModal] = useState(false);
    const [pwdLoading, setPwdLoading] = useState(false);
    const [pwdError, setPwdError] = useState('');
    const pendingFormRef = useRef(null);

    const [showDelModal, setShowDelModal] = useState(false);
    const [delBatch, setDelBatch] = useState(null);
    const [delLoading, setDelLoading] = useState(false);
    const [delError, setDelError] = useState('');

    const loadBatches = useCallback(async () => {
        if (!hasClientSession(['admin'])) { navigate('/login'); return; }

        const isAllRecords = filterCourse === 'all';
        const isDefaultLoad = !search && !filterCourse && !isAllRecords;

        setLoading(true);
        try {
            const limit = isDefaultLoad ? 5 : 10;
            const params = { page, limit };
            const apiCourse = filterCourse === 'all' ? '' : filterCourse;
            if (apiCourse) params.course = apiCourse;
            if (search) params.search = search;

            const { data } = await apiClient.get('/batches', { params });

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
    }, [filterCourse, search, page, navigate, toast]);

    // â”€â”€ Load scheduler config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        apiClient.get('/scheduler/config')
            .then(({ data }) => setConfig(data))
            .catch(() => toast.warning('Could not load scheduler config'));
    }, []);



    useEffect(() => { loadBatches(); }, [loadBatches]);
    useEffect(() => { const t = setTimeout(() => { setPage(1); loadBatches(); }, 400); return () => clearTimeout(t); }, [search]);
    useEffect(() => { setPage(1); }, [filterCourse]);

    // â”€â”€ Load only subjects mapped for the selected batch â”€â”€â”€â”€
    useEffect(() => {
        if (!editingBatch?._id) {
            setSubjects([]);
            return;
        }

        setSubjLoading(true);
        getSubjects({ activeOnly: true, batchId: editingBatch._id })
            .then(({ data }) => {
                const suggestionNames = [...new Set((data.subjects || []).map((s) => s.name).filter(Boolean))];
                setSubjects(suggestionNames);
                setActiveSubject(prev => (prev && suggestionNames.includes(prev) ? prev : (suggestionNames[0] || null)));
            })
            .catch(() => setSubjects([]))
            .finally(() => setSubjLoading(false));
    }, [editingBatch?._id]);

    // â”€â”€ Load occupancy when classroom changes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    useEffect(() => {
        if (!form.classroom) { setOccupancy({}); return; }
        setOccLoading(true);
        const params = editingBatch ? { excludeBatchId: editingBatch._id } : {};
        apiClient.get('/batches/room-occupancy', { params })
            .then(({ data }) => setOccupancy(data.occupancy))
            .catch(() => setOccupancy({}))
            .finally(() => setOccLoading(false));
    }, [form.classroom, editingBatch]);

    // â”€â”€ Open modals â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const openCreate = () => {
        setForm(EMPTY_FORM);
        setEditingBatch(null);
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
            schedule: Array.isArray(batch.schedule) ? batch.schedule : [],
            fees: batch.fees || '',

            startDate: toDateInputValue(batch.startDate),
            endDate: toDateInputValue(batch.endDate),
            schedulerConfig: batch.schedulerConfig || { daysCount: 6, timings: ['09:00', '10:00', '11:00'] }
        });

        getSubjects({ activeOnly: false, batchId: batch._id })
            .then(({ data }) => {
                // subjectPlans removed
            })
            .catch(() => { });

        setEditingBatch(batch);
        setModalMode('edit');
        setShowModal(true);
    };

    const closeModal = () => { setShowModal(false); setEditingBatch(null); };

    // â”€â”€ Subject toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const toggleSubject = (sub) => {
        setForm(f => ({
            ...f,
            subjects: f.subjects.includes(sub)
                ? f.subjects.filter(s => s !== sub)
                : [...f.subjects, sub]
        }));
    };

    // â”€â”€ Slot toggle â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const toggleSlot = (day, time) => {
        if (!activeSubject) return toast.error('Please select a subject from the list first');
        setForm(f => {
            const exists = f.schedule.some(s => s.day === day && s.time === time);
            return {
                ...f,
                schedule: exists
                    ? f.schedule.filter(s => !(s.day === day && s.time === time))
                    : [...f.schedule, { day, time, room: f.classroom, subject: activeSubject }]
            };
        });
    };

    // â”€â”€ Save (CREATE) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleCreate = async () => {
        setFormSaving(true);
        try {
            const { schedulerConfig, ...rawPayload } = form;
            const payload = {
                ...rawPayload,
                startDate: rawPayload.startDate || null,
                endDate: rawPayload.endDate || null
            };
            await apiClient.post('/batches', payload);
            toast.success(`Batch "${form.name}" created successfully!`);
            closeModal();
            loadBatches();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to create batch');
        } finally { setFormSaving(false); }
    };

    // â”€â”€ Save (UPDATE) - open password modal first â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleUpdateIntent = () => {
        const { schedulerConfig, ...rawPayload } = form;
        const payload = {
            ...rawPayload,
            startDate: rawPayload.startDate || null,
            endDate: rawPayload.endDate || null
        };
        pendingFormRef.current = payload;
        setPwdError('');
        setShowPwdModal(true);
    };

    const confirmUpdate = async (password) => {
        setPwdLoading(true); setPwdError('');
        try {
            await apiClient.put(`/batches/${editingBatch._id}`, { ...pendingFormRef.current, adminPassword: password });
            toast.success(`Batch "${form.name}" updated!`);
            setShowPwdModal(false);
            closeModal();
            loadBatches();
        } catch (e) {
            setPwdError(e.response?.data?.message || 'Update failed');
        } finally { setPwdLoading(false); }
    };

    // â”€â”€ Submit handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const handleSubmit = (e) => {
        e.preventDefault();
        if (!form.name.trim()) return toast.error('Batch name is required');
        if (modalMode === 'create') handleCreate();
        else handleUpdateIntent();
    };

    // â”€â”€ Delete flow â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const openDelete = (batch) => {
        setDelBatch(batch);
        setDelError('');
        setShowDelModal(true);
    };

    const confirmDelete = async (password) => {
        setDelLoading(true); setDelError('');
        try {
            await apiClient.delete(`/batches/${delBatch._id}`, { data: { adminPassword: password } });
            toast.success(`Batch "${delBatch.name}" deleted`);
            setShowDelModal(false);
            setDelBatch(null);
            loadBatches();
        } catch (e) {
            setDelError(e.response?.data?.message || 'Delete failed. Check your password.');
        } finally { setDelLoading(false); }
    };

    const fmt = n => (n || 0).toLocaleString('en-IN');

    const generateTimetablePDF = () => {
        if (!form.schedule || form.schedule.length === 0) {
            toast.error('No schedule slots to export');
            return;
        }

        const doc = new jsPDF('landscape');

        // Header
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42);
        doc.text(`Timetable: ${form.name || 'Untitled Batch'}`, 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Course: ${form.course || 'N/A'}`, 14, 28);
        doc.text(`Classroom: ${form.classroom || 'N/A'}`, 14, 33);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 38);

        // Prepare table data
        const head = ['TIME', ...config.days];
        const body = config.timeSlots.map(time => {
            const row = [time];
            config.days.forEach(day => {
                const slot = form.schedule.find(s => s.day === day && s.time === time);
                row.push(slot ? `${slot.subject}\n(${slot.room})` : '-');
            });
            return row;
        });

        autoTable(doc, {
            startY: 45,
            head: [head],
            body: body,
            headStyles: { fillColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold', halign: 'center' },
            styles: { fontSize: 8, cellPadding: 3, halign: 'center', valign: 'middle', overflow: 'linebreak' },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            margin: { top: 40 },
            theme: 'grid'
        });

        doc.save(`Timetable_${form.name || 'Batch'}_${new Date().toISOString().slice(0, 10)}.pdf`);
        toast.success('Timetable downloaded! ðŸ“…');
    };

    const exportData = () => {
        if (batches.length === 0) {
            toast.error('No records to export');
            return;
        }

        const doc = new jsPDF();

        // Header
        doc.setFontSize(22);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text('Academic Batches Report', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);
        doc.text(`Total Batches: ${total}`, 14, 33);

        const tableBody = batches.map(b => [
            b.name || '-',
            b.course || '-',
            (b.subjects || []).join(', ') || '-',
            `${b.studentCount || 0} / ${b.capacity || '-'}`,
            `INR ${(b.earnings || 0).toLocaleString('en-IN')}`,
            b.isActive ? 'Active' : 'Inactive'
        ]);

        autoTable(doc, {
            startY: 40,
            head: [['Batch Name', 'Course', 'Subjects', 'Enrollment', 'Revenue', 'Status']],
            body: tableBody,
            headStyles: { fillColor: [15, 23, 42], fontSize: 9, fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 4 },
            alternateRowStyles: { fillColor: [248, 250, 252] }, // slate-50
            margin: { top: 40 }
        });

        doc.save(`Batches_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
        toast.success('PDF report exported! ðŸ“„');
    };

    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    // RENDER
    // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
    return (
        <ERPLayout title="Batch Management">
            <style>{`
                @media (max-width: 640px) {
                    .batches-hdr { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
                    .batches-hdr .flex { width: 100% !important; flex-direction: column !important; }
                    .batches-hdr button { width: 100% !important; justify-content: center !important; }
                    .batches-tb { padding: 12px !important; gap: 10px !important; }
                    .batches-tb .tb-search-wrap { width: 100% !important; }
                    .batches-tb select { width: 100% !important; min-width: 100% !important; }
                    .batches-tb button { width: 100% !important; }

                    .b-modal-header { padding: 16px 20px !important; }
                    .b-modal-body { padding: 20px !important; }
                    .b-grid-2 { flex-direction: column !important; gap: 16px !important; }
                    .b-footer { flex-direction: column-reverse !important; gap: 12px !important; }
                    .b-footer button { width: 100% !important; justify-content: center !important; }
                }
            `}</style>
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            {/* â”€â”€ Page Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="page-hdr batches-hdr">
                <div>
                    <h1>Batch Management</h1>
                    <p>{total} batch{total !== 1 ? 'es' : ''} configured</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-outline" onClick={exportData} title="Export PDF">
                        <FileDown size={14} /> Export PDF
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

            {/* â”€â”€ Filter Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="card toolbar rounded-xl batches-tb" style={{ marginBottom: 20 }}>
                <div className="tb-search-wrap">
                    <Search size={15} />
                    <input className="tb-search" placeholder="Search batch name or courseâ€¦"
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

            {/* â”€â”€ Batch Table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <div className="card">
                {loading && page === 1 ? (
                    <SkeletonTable rows={8} />
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
                            <table className="erp-table stackable">
                                <thead>
                                    <tr>
                                        <th>Batch</th>
                                        <th>Subjects</th>

                                        <th>Enrollment</th>

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

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                CREATE / EDIT MODAL
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            {
                showModal && (
                    <div className="modal-overlay" style={{
                        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
                        backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', padding: '20px'
                    }} onClick={e => e.target === e.currentTarget && closeModal()}>

                        <style>{`
        .erp-input:focus { border-color: #0f172a !important; box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.1) !important; outline: none; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>

                        <div className="modal" style={{
                            maxWidth: 820,
                            width: '100%',
                            maxHeight: '92vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            borderRadius: '10px',
                            border: 'none',
                            background: '#fff',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                        }}>

                            {/* --- PREMIUM BATCH FORM HEADER (Dark Theme like Image) --- */}
                            <header className="b-modal-header" style={{
                                padding: '24px 32px',
                                background: '#0f172a',
                                position: 'relative',
                                color: '#fff',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexShrink: 0
                            }}>
                                <BookOpen size={120} style={{ position: 'absolute', right: -10, bottom: -30, opacity: 0.05 }} className="hide-mobile" />

                                <div style={{ display: 'flex', alignItems: 'center', gap: 20, position: 'relative', zIndex: 1 }}>
                                    <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.1)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255,255,255,0.2)' }} className="hide-mobile">
                                        <BookOpen size={28} />
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
                                            {modalMode === 'edit' ? 'Update Batch' : 'New Batch'}
                                        </h2>
                                        <p style={{ margin: 0, opacity: 0.8, fontSize: '0.8rem' }}>
                                            {modalMode === 'edit' ? `Editing: ${editingBatch?.name}` : 'Setup teaching group'}
                                        </p>
                                    </div>
                                </div>

                                <button type="button" onClick={closeModal} style={{
                                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                                    borderRadius: '8px', color: '#fff', padding: '10px 20px', cursor: 'pointer',
                                    fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem',
                                    position: 'relative', zIndex: 1
                                }}>
                                    <X size={18} /> <span className="hide-mobile">CLOSE</span>
                                </button>
                            </header>

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                                <div className="modal-body b-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>

                                    {/* â”€â”€ Basic Info Section â”€â”€ */}
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        Basic Information
                                        <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }}></div>
                                    </div>

                                    <div className="b-grid-2" style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Batch Name *</label>
                                            <input
                                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', marginTop: 6 }}
                                                className="erp-input"
                                                value={form.name}
                                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                                                placeholder="e.g. SCI-11-26" required
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Class / Course</label>
                                            <select
                                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', marginTop: 6, background: '#fff' }}
                                                className="erp-input"
                                                value={form.course}
                                                onChange={e => setForm(f => ({ ...f, course: e.target.value, subjects: [] }))}
                                            >
                                                <option value="">Select courseâ€¦</option>
                                                {getDynamicClasses().map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="b-grid-2" style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Fees (â‚¹  / Month)</label>
                                            <input
                                                type="number"
                                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', marginTop: 6 }}
                                                className="erp-input"
                                                value={form.fees}
                                                onChange={e => setForm(f => ({ ...f, fees: e.target.value }))}
                                                placeholder="0" min="0"
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Capacity</label>
                                            <input
                                                type="number"
                                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', marginTop: 6 }}
                                                className="erp-input"
                                                value={form.capacity}
                                                onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))}
                                                placeholder="30" min="1"
                                            />
                                        </div>
                                    </div>

                                    <div className="b-grid-2" style={{ display: 'flex', gap: 20, marginBottom: 30 }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Batch Start Date</label>
                                            <input
                                                type="date"
                                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', marginTop: 6 }}
                                                className="erp-input"
                                                value={form.startDate}
                                                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Batch End Date</label>
                                            <input
                                                type="date"
                                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', marginTop: 6 }}
                                                className="erp-input"
                                                value={form.endDate}
                                                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                                            />
                                        </div>
                                    </div>



                                    {/* â”€â”€ Subject Selection â”€â”€ */}
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        Subject Assignment
                                        <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }}></div>
                                    </div>

                                    <div style={{ marginBottom: 30 }}>
                                        {subjLoading ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b', fontSize: '0.85rem' }}>
                                                <Loader2 size={16} className="spin" /> Loading subjectsâ€¦
                                            </div>
                                        ) : availableSubjects.length === 0 ? (
                                            <div style={{ fontSize: '0.85rem', color: '#94a3b8', padding: '16px', background: '#f8fafc', borderRadius: 6, textAlign: 'center' }}>
                                                No class-based subject suggestions available for this course.
                                            </div>
                                        ) : (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                                {/* 1. Subjects available */}
                                                <div>
                                                    <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#64748b', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Batch Subjects</label>
                                                    <p style={{ margin: '0 0 10px 0', fontSize: '0.72rem', color: '#64748b' }}>
                                                        Showing active subjects available for this batch.
                                                    </p>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                        {availableSubjects.map(sub => {
                                                            const isAdded = form.subjects.includes(sub);
                                                            return (
                                                                <button key={sub} type="button" onClick={() => toggleSubject(sub)}
                                                                    style={{
                                                                        padding: '6px 12px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: '0.2s',
                                                                        background: isAdded ? '#0f172a' : '#fff',
                                                                        color: isAdded ? '#fff' : '#475569',
                                                                        border: `1px solid ${isAdded ? '#0f172a' : '#cbd5e1'}`,
                                                                    }}>
                                                                    {sub}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* 2. Active Painting Subject Selection */}
                                                {form.subjects.length > 0 && (
                                                    <div style={{ padding: '14px', background: 'rgba(79, 70, 229, 0.05)', borderRadius: '10px', border: '1px dashed #4f46e5' }}>
                                                        <label style={{ fontSize: '0.65rem', fontWeight: 800, color: '#4f46e5', display: 'block', marginBottom: 8, textTransform: 'uppercase' }}>Select Active Subject for Timetable Painting</label>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                                            {form.subjects.map(sub => {
                                                                const isActive = activeSubject === sub;
                                                                return (
                                                                    <button key={sub} type="button" onClick={() => setActiveSubject(sub)}
                                                                        style={{
                                                                            padding: '6px 14px', borderRadius: '16px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', transition: '0.2s',
                                                                            background: isActive ? '#4f46e5' : '#fff',
                                                                            color: isActive ? '#fff' : '#4f46e5',
                                                                            border: `1.5px solid ${isActive ? '#4f46e5' : '#e0e7ff'}`,
                                                                            boxShadow: isActive ? '0 4px 6px -1px rgba(79, 70, 229, 0.2)' : 'none'
                                                                        }}>
                                                                        {isActive && <CheckCircle2 size={11} style={{ marginRight: 4 }} />}
                                                                        {sub}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>


                                    {/* â”€â”€ Classroom & Timetable Section â”€â”€ */}
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                                        Classroom & Timetable
                                        <div style={{ flex: 1, height: '1px', background: '#f1f5f9' }}></div>
                                    </div>

                                    <div className="b-grid-2" style={{ display: 'flex', gap: 20, marginBottom: 20 }}>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Working Classroom</label>
                                            <select
                                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', marginTop: 6, background: '#fff' }}
                                                className="erp-input"
                                                value={form.classroom}
                                                onChange={e => setForm(f => ({ ...f, classroom: e.target.value }))}
                                            >
                                                <option value="">Select classroom...</option>
                                                {config.classrooms.map(r => <option key={r} value={r}>{r}</option>)}
                                            </select>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <label style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Days Per Week</label>
                                            <select
                                                style={{ width: '100%', padding: '12px 16px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '0.95rem', marginTop: 6, background: '#fff' }}
                                                className="erp-input"
                                                value={form.schedulerConfig?.daysCount || 6}
                                                onChange={e => setForm(f => ({ ...f, schedulerConfig: { ...f.schedulerConfig, daysCount: parseInt(e.target.value) } }))}
                                            >
                                                {[1, 2, 3, 4, 5, 6, 7].map(d => <option key={d} value={d}>{d} Days</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {form.classroom && (
                                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 20, marginBottom: 24, borderLeft: '4px solid #0f172a' }}>
                                            <div>
                                                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <Calendar size={16} /> Manual Schedule Builder
                                                </h4>
                                                <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                                    Select an <strong>Active Subject</strong> from the bubbles above, then click slots in the grid to assign.
                                                </p>
                                            </div>

                                            {availableSubjects.length > 0 && (
                                                <div style={{ marginTop: 12, padding: '8px 12px', background: '#eef2ff', borderRadius: 6, border: '1px solid #e0e7ff', display: 'flex', alignItems: 'center', gap: 8 }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4f46e5' }} />
                                                    <p style={{ margin: 0, fontSize: '0.7rem', color: '#4338ca', fontWeight: 600 }}>
                                                        Currently painting with: <strong>{activeSubject || 'None'}</strong>
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {form.classroom && (
                                        <div style={{ animation: 'fadeIn 0.3s ease' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                                                    Current Timetable Preview - <strong>{form.schedule.length}</strong> slots active
                                                </p>
                                                <button type="button" onClick={generateTimetablePDF} className="btn btn-outline btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                                    <FileDown size={14} /> Download Timetable PDF
                                                </button>
                                            </div>
                                            <div className="erp-table-wrap" style={{ border: 'none', background: 'transparent' }}>
                                                <TimetableGrid
                                                    days={config.days}
                                                    timeSlots={config.timeSlots}
                                                    classroom={form.classroom}
                                                    occupancy={occupancy}
                                                    selected={form.schedule}
                                                    onToggle={toggleSlot}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* --- FOOTER (Like Image) --- */}
                                <div className="b-footer" style={{ padding: '24px 32px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 16, background: '#fff' }}>
                                    <button type="button" onClick={closeModal} style={{ padding: '0 40px', height: 52, borderRadius: '8px', border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 800, cursor: 'pointer', fontSize: '0.9rem' }}>
                                        CANCEL
                                    </button>
                                    <button type="submit" disabled={formSaving} style={{ flex: 1, height: 52, background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontSize: '0.9rem', letterSpacing: '0.05em' }}>
                                        {formSaving ? <Loader2 className="spin" /> : (modalMode === 'edit' ? <>UPDATE ACADEMIC BATCH <ShieldAlert size={20} /></> : <>COMPLETE BATCH CREATION <Plus size={20} /></>)}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                PASSWORD MODAL (for update)
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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

            {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
                DELETE MODAL
            â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
            {
                showDelModal && delBatch && (
                    <ActionModal
                        isOpen={showDelModal}
                        onClose={() => { setShowDelModal(false); setDelBatch(null); }}
                        onConfirm={confirmDelete}
                        title="Delete Batch"
                        description={`You are about to delete "${delBatch?.name}". All timetable slots for this batch will be lost.`}
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
