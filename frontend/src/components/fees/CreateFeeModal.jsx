import React, { useEffect, useRef, useState } from 'react';
import { Loader2, Receipt, X } from 'lucide-react';
import apiClient from '../../api/apiConfig';

const monthOptions = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const CreateFeeModal = ({ onClose, onSave }) => {
    const dropdownRef = useRef(null);
    const [students, setStudents] = useState([]);
    const [batches, setBatches] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searching, setSearching] = useState(false);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [form, setForm] = useState({
        studentId: '',
        batchId: '',
        amount: '',
        month: '',
        year: new Date().getFullYear().toString(),
        dueDate: ''
    });

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const { data } = await apiClient.get('/batches');
                setBatches(Array.isArray(data.batches) ? data.batches : []);
            } catch (_error) {
                setError({ message: 'Failed to load students or batches' });
            } finally {
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchSearchResults = async () => {
            if (!searchQuery || form.studentId) {
                if (!searchQuery) setStudents([]);
                return;
            }

            setSearching(true);
            try {
                const { data } = await apiClient.get(`/students?search=${encodeURIComponent(searchQuery)}&limit=15`);
                setStudents(Array.isArray(data.students) ? data.students : []);
            } catch (requestError) {
                console.error('Failed to search students:', requestError);
            } finally {
                setSearching(false);
            }
        };

        const timeoutId = window.setTimeout(fetchSearchResults, 300);
        return () => window.clearTimeout(timeoutId);
    }, [form.studentId, searchQuery]);

    const handleStudentSelect = (student) => {
        setForm((current) => ({
            ...current,
            studentId: student._id,
            batchId: student.batchId?._id || student.batchId || '',
            amount: student.batchId?.fees || student.fees || ''
        }));
        setSearchQuery(`${student.name} (${student.rollNo})`);
        setIsDropdownOpen(false);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();

        if (!form.studentId || !form.amount || !form.month || !form.year || !form.dueDate) {
            setError({ message: 'Please fill all required fields' });
            return;
        }

        setSaving(true);
        setError(null);
        try {
            await onSave(form);
            onClose();
        } catch (requestError) {
            if (requestError.response?.status === 409) {
                setError({ message: "This month's tuition fee is already created." });
            } else {
                setError({ message: requestError.response?.data?.message || 'Failed to create fee record' });
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div
            className="modal-overlay"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.7)',
                backdropFilter: 'blur(4px)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px'
            }}
            onClick={(event) => event.target === event.currentTarget && onClose()}
        >
            <div
                className="modal"
                style={{
                    width: '100%',
                    maxWidth: '900px',
                    maxHeight: '92vh',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                }}
            >
                <header
                    style={{
                        padding: '24px 32px',
                        background: '#0f172a',
                        color: '#fff',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div
                            style={{
                                width: 52,
                                height: 52,
                                borderRadius: '8px',
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid rgba(255,255,255,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Receipt size={24} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Initialize Manual Fee</h2>
                            <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 500, marginTop: 2 }}>Create billing records for students</div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'rgba(255,255,255,0.15)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '8px',
                            color: '#fff',
                            padding: '8px 16px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: '0.75rem',
                            fontWeight: 700
                        }}
                    >
                        <X size={16} /> CLOSE
                    </button>
                </header>

                <div className="modal-body custom-scrollbar" style={{ padding: '24px', maxHeight: '75vh', overflowY: 'auto' }}>
                    {loading ? (
                        <div className="loader-wrap"><div className="spinner" /><p>Loading student data...</p></div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {error && <div className="alert alert-error">{error.message}</div>}

                            <div className="mf" style={{ position: 'relative' }} ref={dropdownRef}>
                                <label>Select Student *</label>
                                <input
                                    type="text"
                                    placeholder="Search by student name, roll no or phone..."
                                    value={searchQuery}
                                    onChange={(event) => {
                                        const nextValue = event.target.value;
                                        setSearchQuery(nextValue);
                                        setIsDropdownOpen(true);
                                        if (form.studentId) {
                                            setForm((current) => ({ ...current, studentId: '', batchId: '', amount: '' }));
                                        }
                                    }}
                                    onFocus={() => setIsDropdownOpen(true)}
                                    style={{
                                        width: '100%',
                                        padding: '10px 14px',
                                        borderRadius: 6,
                                        border: '1px solid #e2e8f0',
                                        fontSize: '0.9rem',
                                        outline: 'none'
                                    }}
                                    required={!form.studentId}
                                />

                                {isDropdownOpen && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            right: 0,
                                            background: '#fff',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: 6,
                                            marginTop: 4,
                                            maxHeight: 220,
                                            overflowY: 'auto',
                                            zIndex: 10,
                                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'
                                        }}
                                    >
                                        {searching ? (
                                            <div style={{ padding: '16px', color: '#64748b', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                                <Loader2 size={16} className="spin" /> Searching...
                                            </div>
                                        ) : !searchQuery && !form.studentId ? (
                                            <div style={{ padding: '16px', color: '#64748b', textAlign: 'center', fontSize: '0.85rem' }}>
                                                Start typing to search for a student...
                                            </div>
                                        ) : students.length > 0 ? students.map((student) => (
                                            <div
                                                key={student._id}
                                                onClick={() => handleStudentSelect(student)}
                                                style={{
                                                    padding: '10px 16px',
                                                    cursor: 'pointer',
                                                    borderBottom: '1px solid #f1f5f9',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center'
                                                }}
                                                onMouseEnter={(event) => { event.currentTarget.style.background = '#f8fafc'; }}
                                                onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent'; }}
                                            >
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{student.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Roll: {student.rollNo}</div>
                                                </div>
                                                {student.batchId && (
                                                    <div style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 6 }}>
                                                        {student.batchId.name || 'Assigned'}
                                                    </div>
                                                )}
                                            </div>
                                        )) : (
                                            <div style={{ padding: '12px 16px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>
                                                No students matched your search
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="mf-row">
                                <div className="mf">
                                    <label>Batch</label>
                                    <select value={form.batchId} disabled style={{ background: 'var(--erp-bg2)', cursor: 'not-allowed' }}>
                                        <option value="">No Batch</option>
                                        {batches.map((batch) => (
                                            <option key={batch._id} value={batch._id}>{batch.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mf">
                                    <label>Fee Amount (Rs) *</label>
                                    <input type="number" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} placeholder="0.00" required />
                                </div>
                            </div>

                            <div className="mf-row">
                                <div className="mf">
                                    <label>Billing Month *</label>
                                    <select value={form.month} onChange={(event) => setForm((current) => ({ ...current, month: event.target.value }))} required>
                                        <option value="">Select Month</option>
                                        {monthOptions.map((month) => <option key={month} value={month}>{month}</option>)}
                                    </select>
                                </div>
                                <div className="mf">
                                    <label>Billing Year *</label>
                                    <input type="number" value={form.year} onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))} required />
                                </div>
                            </div>

                            <div className="mf">
                                <label>Payment Deadline *</label>
                                <input type="date" value={form.dueDate} onChange={(event) => setForm((current) => ({ ...current, dueDate: event.target.value }))} required />
                            </div>

                            <div className="modal-footer" style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--erp-border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? <Loader2 className="spin" size={14} /> : 'Generate Invoice'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CreateFeeModal;
