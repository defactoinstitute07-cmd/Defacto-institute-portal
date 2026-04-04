import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileDown, Search, Upload } from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import ToastContainer, { useToast } from '../components/Toast';
import ActionModal from '../components/common/ActionModal';
import TeacherStats from '../components/teachers/TeacherStats';
import TeacherFilters from '../components/teachers/TeacherFilters';
import TeacherTable from '../components/teachers/TeacherTable';
import TeacherProfileModal from '../components/teachers/TeacherProfileModal';
import TeacherFormModal from '../components/teachers/TeacherFormModal';
import TeacherBulkImportModal from '../components/teachers/TeacherBulkImportModal';
import apiClient, { API_BASE_URL } from '../api/apiConfig';
import { hasClientSession } from '../utils/authSession';

const imgSrc = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${API_BASE_URL}${path}`;
};

const TeachersPage = () => {
    const navigate = useNavigate();
    const { toasts, toast, removeToast } = useToast();
    const searchRef = useRef(null);

    const [teachers, setTeachers] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilt, setStatusFilt] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);

    const [viewTeacher, setViewTeacher] = useState(null);
    const [showForm, setShowForm] = useState(false);
    const [formMode, setFormMode] = useState('create');
    const [editTeacher, setEditTeacher] = useState(null);
    const [showDel, setShowDel] = useState(false);
    const [delTeacher, setDelTeacher] = useState(null);
    const [delLoading, setDelLoading] = useState(false);
    const [delError, setDelError] = useState('');

    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkFile, setBulkFile] = useState(null);
    const [bulkResults, setBulkResults] = useState(null);
    const [bulkSaving, setBulkSaving] = useState(false);
    const [bulkImportErr, setBulkImportErr] = useState('');

    useEffect(() => {
        const handler = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, []);

    const loadSummary = useCallback(async () => {
        try {
            const { data } = await apiClient.get('/teachers/summary');
            setSummary(data);
        } catch (_error) {
            setSummary(null);
        }
    }, []);

    const load = useCallback(async () => {
        if (!hasClientSession(['admin'])) {
            navigate('/login');
            return;
        }

        setLoading(true);
        try {
            const params = { page, limit: search || statusFilt ? 10 : 5 };
            if (search) params.search = search;
            if (statusFilt && statusFilt !== 'all') params.status = statusFilt;

            const { data } = await apiClient.get('/teachers', { params });

            if (page === 1) {
                setTeachers(data.teachers || []);
            } else {
                setTeachers((prev) => {
                    const existingIds = new Set(prev.map((teacher) => teacher._id));
                    const nextTeachers = (data.teachers || []).filter((teacher) => !existingIds.has(teacher._id));
                    return [...prev, ...nextTeachers];
                });
            }

            setTotalPages(data.pages || 1);
            setTotal(data.total || 0);
        } catch (error) {
            if (error.response?.status === 401) navigate('/login');
            else toast.error('Failed to load teachers');
        } finally {
            setLoading(false);
        }
    }, [navigate, page, search, statusFilt, toast]);

    useEffect(() => {
        const delay = search ? 400 : 0;
        const timer = setTimeout(() => {
            load();
        }, delay);
        return () => clearTimeout(timer);
    }, [load, page]);

    useEffect(() => {
        setPage(1);
    }, [search, statusFilt]);

    useEffect(() => {
        loadSummary();
    }, [loadSummary]);

    const openCreate = () => {
        setEditTeacher(null);
        setFormMode('create');
        setShowForm(true);
    };

    const openEdit = (teacher) => {
        setEditTeacher(teacher);
        setFormMode('edit');
        setShowForm(true);
    };

    const openDelete = (teacher) => {
        setDelTeacher(teacher);
        setDelError('');
        setShowDel(true);
    };

    const handleSave = () => {
        setShowForm(false);
        load();
        loadSummary();
    };

    const confirmDelete = async (password) => {
        setDelLoading(true);
        setDelError('');
        try {
            await apiClient.delete(`/teachers/${delTeacher._id}`, { data: { adminPassword: password } });
            toast.success(`"${delTeacher.name}" deleted`);
            setShowDel(false);
            setDelTeacher(null);
            load();
            loadSummary();
        } catch (error) {
            setDelError(error.response?.data?.message || 'Delete failed. Check your password.');
        } finally {
            setDelLoading(false);
        }
    };

    const exportData = async (type = 'csv') => {
        if (teachers.length === 0) {
            toast.error('No records to export');
            return;
        }

        if (type === 'pdf') {
            try {
                const { default: jsPDF } = await import('jspdf');
                const { default: autoTable } = await import('jspdf-autotable');
                const doc = new jsPDF();
                doc.setFontSize(16);
                doc.text('Teacher Report', 14, 14);
                doc.setFontSize(10);
                doc.text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, 14, 22);
                autoTable(doc, {
                    startY: 28,
                    head: [['ID', 'Name', 'Email', 'Phone', 'Status']],
                    body: teachers.map((teacher) => [
                        teacher.regNo || '--',
                        teacher.name,
                        teacher.email || '--',
                        teacher.phone || '--',
                        teacher.status || '--'
                    ]),
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [27, 58, 122] }
                });
                doc.save(`Teachers_Export_${new Date().toISOString().slice(0, 10)}.pdf`);
                toast.success('PDF exported');
            } catch (_error) {
                toast.error('PDF export failed');
            }
            return;
        }

        const rows = [['Employee ID', 'Name', 'Email', 'Phone', 'Status'].join(',')];
        teachers.forEach((teacher) => {
            rows.push([
                `"${teacher.regNo || 'N/A'}"`,
                `"${teacher.name || ''}"`,
                `"${teacher.email || ''}"`,
                `"${teacher.phone || ''}"`,
                `"${teacher.status || ''}"`
            ].join(','));
        });

        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.setAttribute('hidden', '');
        anchor.setAttribute('href', url);
        anchor.setAttribute('download', `Teachers_Export_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        toast.success('CSV exported');
    };

    return (
        <ERPLayout title="Teacher Management">
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            <div className="page-hdr" style={{ marginBottom: 32, marginTop: 8 }}>
                <div>
                    <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--erp-primary)' }}>Faculty Management</h1>
                    <p style={{ fontSize: '0.95rem', color: '#64748b' }}>Manage instructors and faculty records.</p>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn btn-outline" style={{ height: 44, padding: '0 16px', borderRadius: 6 }} onClick={() => setShowBulkModal(true)}>
                        <Upload size={18} /> Bulk Import
                    </button>
                    <button className="btn btn-outline" style={{ height: 44, padding: '0 16px', borderRadius: 6 }} onClick={() => exportData('pdf')}>
                        <FileDown size={18} /> Export PDF
                    </button>
                    <button className="btn btn-primary" style={{ height: 44, padding: '0 20px', borderRadius: 6, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }} onClick={openCreate}>
                        <Plus size={18} /> Add New Faculty
                    </button>
                </div>
            </div>

            <TeacherStats summary={summary} />

            <TeacherFilters
                search={search}
                setSearch={setSearch}
                statusFilt={statusFilt}
                setStatusFilt={setStatusFilt}
                loading={loading}
                onLoad={load}
                searchRef={searchRef}
            />

            <div className="card" style={{ marginTop: 20 }}>
                {loading && page === 1 ? (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                        <div className="spinner mb-4" />
                        <p className="font-medium">Loading faculty records...</p>
                    </div>
                ) : teachers.length === 0 ? (
                    <div className="empty">
                        <div className="empty-icon">
                            <Search size={40} strokeWidth={1.2} color="var(--erp-muted)" />
                        </div>
                        <p style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 6 }}>No records found</p>
                        <p className="td-sm" style={{ maxWidth: 280, margin: '0 auto' }}>
                            Try adjusting your search or status filter to find what you need.
                        </p>
                    </div>
                ) : (
                    <TeacherTable teachers={teachers} onView={setViewTeacher} onEdit={openEdit} onDelete={openDelete} imgSrc={imgSrc} />
                )}

                {teachers.length > 0 && (
                    <div style={{ padding: '20px 0', borderTop: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                        <div className="text-sm text-slate-500 font-medium">Showing {teachers.length} of {total} records</div>
                        {page < totalPages && (
                            <button className="btn btn-outline" disabled={loading} onClick={() => setPage((current) => current + 1)} style={{ borderRadius: 6, fontWeight: 700 }}>
                                Load More Records
                            </button>
                        )}
                    </div>
                )}
            </div>

            {viewTeacher && (
                <TeacherProfileModal teacher={viewTeacher} onClose={() => setViewTeacher(null)} imgSrc={imgSrc} />
            )}

            {showForm && (
                <TeacherFormModal
                    mode={formMode}
                    teacher={editTeacher}
                    toast={toast}
                    onSave={handleSave}
                    onClose={() => setShowForm(false)}
                    imgSrc={imgSrc}
                />
            )}

            <ActionModal
                isOpen={showDel}
                onClose={() => setShowDel(false)}
                onConfirm={confirmDelete}
                title="Confirm Deletion"
                description={`Are you sure you want to delete ${delTeacher?.name}? This action requires your admin password.`}
                actionType="delete"
                loading={delLoading}
                error={delError}
            />

            <TeacherBulkImportModal
                isOpen={showBulkModal}
                onClose={() => {
                    setShowBulkModal(false);
                    setBulkFile(null);
                    setBulkImportErr('');
                    setBulkResults(null);
                }}
                bulkFile={bulkFile}
                setBulkFile={setBulkFile}
                bulkResults={bulkResults}
                setBulkResults={setBulkResults}
                saving={bulkSaving}
                onConfirm={async (password) => {
                    if (!password) {
                        toast.error('Admin password is required');
                        return;
                    }

                    setBulkSaving(true);
                    setBulkImportErr('');
                    try {
                        const { data } = await apiClient.post('/teachers/bulk', { teachers: bulkFile, adminPassword: password });
                        setBulkResults(data);
                        toast.success(`${data.success} teachers imported`);
                        load();
                        loadSummary();

                        if (data.failed === 0) {
                            setTimeout(() => {
                                setShowBulkModal(false);
                                setBulkFile(null);
                                setBulkResults(null);
                            }, 1500);
                        }
                    } catch (error) {
                        setBulkImportErr(error.response?.data?.message || 'Bulk import failed');
                        toast.error('Bulk import failed');
                    } finally {
                        setBulkSaving(false);
                    }
                }}
                err={bulkImportErr}
                setErr={setBulkImportErr}
            />
        </ERPLayout>
    );
};

export default TeachersPage;
