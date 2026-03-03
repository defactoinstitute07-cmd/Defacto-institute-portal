import React, { useState, useEffect } from 'react';
import { X, Receipt, User, Calendar, IndianRupee, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import axios from 'axios';

import { API_BASE_URL } from '../../api/apiConfig';

const API = () => axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const CreateFeeModal = ({ onClose, onSave }) => {
    const [students, setStudents] = useState([]);
    const [batches, setBatches] = useState([]);
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

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [sRes, bRes] = await Promise.all([
                    API().get('/students?limit=1000'),
                    API().get('/batches')
                ]);
                setStudents(sRes.data.students || []);
                setBatches(bRes.data.batches || []);
            } catch (err) {
                setError({ message: 'Failed to load students or batches' });
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleStudentChange = (e) => {
        const studentId = e.target.value;
        const student = students.find(s => s._id === studentId);
        if (student) {
            setForm({
                ...form,
                studentId,
                batchId: student.batchId?._id || student.batchId || '',
                amount: student.batchId?.fees || student.fees || ''
            });
        } else {
            setForm({ ...form, studentId: '' });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.studentId || !form.amount || !form.month || !form.year || !form.dueDate) {
            setError({ message: 'Please fill all required fields' });
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await onSave(form);
            onClose();
        } catch (err) {
            if (err.response?.status === 409) {
                // Return full error state including possible feeId to allow user to switch
                setError({
                    message: "This month's tuition fee is already created.",
                    feeId: err.response?.data?.feeId
                });
            } else {
                setError({ message: err.response?.data?.message || 'Failed to create fee record' });
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '20px'
        }} onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{
                width: '100%', maxWidth: '900px', maxHeight: '92vh',
                background: '#f8fafc', borderRadius: '12px', overflow: 'hidden',
                display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                position: 'relative'
            }}>
                {/* --- TOP BAR (Inside Modal Box) --- */}
                <header style={{
                    width: '100%',
                    padding: '24px 32px',
                    background: '#0f172a',
                    position: 'relative',
                    color: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0,
                    overflow: 'hidden'
                }}>
                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{
                            width: 52, height: 52, borderRadius: '8px',
                            background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
                            border: '1px solid rgba(255,255,255,0.2)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            <Receipt size={24} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Initialize Manual Fee</h2>
                            <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 500, marginTop: 2 }}>Create billing records for students</div>
                        </div>
                    </div>

                    <button type="button" onClick={onClose} style={{
                        position: 'relative', zIndex: 1,
                        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px', color: '#fff', padding: '8px 16px',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        gap: 8, fontSize: '0.75rem', fontWeight: 700
                    }}>
                        <X size={16} /> CLOSE
                    </button>
                </header>

                <div className="modal-body custom-scrollbar" style={{ padding: '24px', maxHeight: '75vh', overflowY: 'auto' }}>
                    {loading ? (
                        <div className="loader-wrap"><div className="spinner" /><p>Loading student data…</p></div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {error && (
                                <div className="alert alert-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>{error.message}</span>
                                    {error.feeId && (
                                        <button
                                            type="button"
                                            className="btn btn-sm"
                                            style={{ background: '#ca8a04', color: '#fff', border: 'none', padding: '4px 12px' }}
                                        >
                                            Add Expense
                                        </button>
                                    )}
                                </div>
                            )}

                            <div className="mf">
                                <label>Select Student *</label>
                                <select
                                    value={form.studentId}
                                    onChange={handleStudentChange}
                                    required
                                >
                                    <option value="">Choose a student...</option>
                                    {students.map(s => (
                                        <option key={s._id} value={s._id}>
                                            {s.name} ({s.rollNo})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="mf-row">
                                <div className="mf">
                                    <label>Batch</label>
                                    <select
                                        value={form.batchId}
                                        disabled
                                        style={{ background: 'var(--erp-bg2)', cursor: 'not-allowed' }}
                                    >
                                        <option value="">No Batch</option>
                                        {Array.isArray(batches) && batches.map(b => (
                                            <option key={b._id} value={b._id}>{b.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="mf">
                                    <label>Fee Amount (₹) *</label>
                                    <input
                                        type="number"
                                        value={form.amount}
                                        onChange={e => setForm({ ...form, amount: e.target.value })}
                                        placeholder="0.00"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mf-row">
                                <div className="mf">
                                    <label>Billing Month *</label>
                                    <select
                                        value={form.month}
                                        onChange={e => setForm({ ...form, month: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Month</option>
                                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                                <div className="mf">
                                    <label>Billing Year *</label>
                                    <input
                                        type="number"
                                        value={form.year}
                                        onChange={e => setForm({ ...form, year: e.target.value })}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="mf">
                                <label>Payment Deadline *</label>
                                <input
                                    type="date"
                                    value={form.dueDate}
                                    onChange={e => setForm({ ...form, dueDate: e.target.value })}
                                    required
                                />
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