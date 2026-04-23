import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Loader2, Receipt, X, Calendar, Calculator, Tag, CheckCircle2 } from 'lucide-react';
import apiClient from '../../api/apiConfig';

const monthOptions = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fmt = (v) => (Number(v) || 0).toLocaleString('en-IN');

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

    const [paymentMode, setPaymentMode] = useState('monthly');
    const [selectedMonths, setSelectedMonths] = useState([]);
    const [discount, setDiscount] = useState('');

    const [form, setForm] = useState({
        studentId: '',
        batchId: '',
        amount: '',
        month: '',
        year: new Date().getFullYear().toString(),
        dueDate: ''
    });

    // Selected student object for display
    const [selectedStudentObj, setSelectedStudentObj] = useState(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const { data } = await apiClient.get('/batches');
                setBatches(Array.isArray(data.batches) ? data.batches : []);
            } catch (_error) {
                setError({ message: 'Failed to load batches' });
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
        const batchFee = student.batchId?.fees || student.fees || '';
        setForm((current) => ({
            ...current,
            studentId: student._id,
            batchId: student.batchId?._id || student.batchId || '',
            amount: batchFee
        }));
        setSelectedStudentObj(student);
        setPaymentMode(student.paymentMode || 'monthly');
        setSearchQuery(`${student.name} (${student.rollNo})`);
        setIsDropdownOpen(false);
    };

    const toggleMonth = (month) => {
        setSelectedMonths(prev =>
            prev.includes(month) ? prev.filter(m => m !== month) : [...prev, month]
        );
    };

    const selectAllMonths = () => {
        setSelectedMonths(prev => prev.length === 12 ? [] : [...monthOptions]);
    };

    const monthlyFee = Number(form.amount) || 0;
    const discountValue = Math.max(Number(discount) || 0, 0);

    const calculation = useMemo(() => {
        if (paymentMode === 'monthly') {
            const subtotal = monthlyFee;
            const total = Math.max(subtotal - discountValue, 0);
            return { subtotal, months: 1, total, perMonth: total };
        }
        const count = selectedMonths.length;
        const subtotal = monthlyFee * count;
        const total = Math.max(subtotal - discountValue, 0);
        return { subtotal, months: count, total, perMonth: count > 0 ? Math.round(total / count) : 0 };
    }, [monthlyFee, discountValue, paymentMode, selectedMonths.length]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(null);

        if (paymentMode === 'monthly') {
            if (!form.studentId || !form.amount || !form.month || !form.year || !form.dueDate) {
                setError({ message: 'Please fill all required fields' });
                return;
            }
            setSaving(true);
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
        } else {
            if (!form.studentId || selectedMonths.length === 0 || !form.year || !form.dueDate) {
                setError({ message: 'Please select a student, at least one month, year, and due date' });
                return;
            }
            setSaving(true);
            try {
                await onSave({
                    studentId: form.studentId,
                    batchId: form.batchId,
                    months: selectedMonths,
                    year: form.year,
                    dueDate: form.dueDate,
                    discount: discountValue,
                    _multiMonth: true
                });
                onClose();
            } catch (requestError) {
                setError({ message: requestError.response?.data?.message || 'Failed to create fee records' });
            } finally {
                setSaving(false);
            }
        }
    };

    const inputStyle = {
        width: '100%', padding: '10px 14px', borderRadius: 6,
        border: '1px solid #e2e8f0', fontSize: '0.9rem', outline: 'none', background: '#fff'
    };

    return (
        <div className="modal-overlay" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={(event) => event.target === event.currentTarget && onClose()}>

            <style>{`
                .month-chip { transition: all 0.15s ease; cursor: pointer; user-select: none; }
                .month-chip:hover { transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .mode-card { transition: all 0.2s ease; cursor: pointer; }
                .mode-card:hover { transform: translateY(-1px); }
                .calc-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; }
                @media (max-width: 640px) {
                    .month-grid { grid-template-columns: repeat(3, 1fr) !important; }
                    .mode-grid { grid-template-columns: 1fr !important; }
                }
            `}</style>

            <div className="modal" style={{ width: '100%', maxWidth: '920px', maxHeight: '92vh', background: '#f8fafc', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>

                {/* Header */}
                <header style={{ padding: '24px 32px', background: '#0f172a', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ width: 52, height: 52, borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Receipt size={24} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Create Fee Record</h2>
                            <div style={{ fontSize: '0.8rem', opacity: 0.85, fontWeight: 500, marginTop: 2 }}>Generate billing records for students</div>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#fff', padding: '8px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.75rem', fontWeight: 700 }}>
                        <X size={16} /> CLOSE
                    </button>
                </header>

                <div className="modal-body custom-scrollbar" style={{ padding: '24px 28px', maxHeight: '75vh', overflowY: 'auto' }}>
                    {loading ? (
                        <div className="loader-wrap"><div className="spinner" /><p>Loading...</p></div>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            {error && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#991b1b', fontSize: '0.85rem', fontWeight: 600, marginBottom: 16 }}>{error.message}</div>}

                            {/* Student Search */}
                            <div style={{ position: 'relative', marginBottom: 20 }} ref={dropdownRef}>
                                <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569', display: 'block', marginBottom: 6 }}>SELECT STUDENT *</label>
                                <input type="text" placeholder="Search by name, roll no or phone..." value={searchQuery}
                                    onChange={(event) => { setSearchQuery(event.target.value); setIsDropdownOpen(true); if (form.studentId) { setForm(c => ({ ...c, studentId: '', batchId: '', amount: '' })); setSelectedStudentObj(null); } }}
                                    onFocus={() => setIsDropdownOpen(true)} style={inputStyle} required={!form.studentId} autoComplete="new-password" />
                                {isDropdownOpen && (
                                    <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 6, marginTop: 4, maxHeight: 220, overflowY: 'auto', zIndex: 10, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}>
                                        {searching ? (
                                            <div style={{ padding: 16, color: '#64748b', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><Loader2 size={16} className="spin" /> Searching...</div>
                                        ) : !searchQuery && !form.studentId ? (
                                            <div style={{ padding: 16, color: '#64748b', textAlign: 'center', fontSize: '0.85rem' }}>Start typing to search...</div>
                                        ) : students.length > 0 ? students.map((student) => (
                                            <div key={student._id} onClick={() => handleStudentSelect(student)}
                                                style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                                                <div>
                                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{student.name}</div>
                                                    <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Roll: {student.rollNo} {student.paymentMode === 'full' ? '• Full Payment' : ''}</div>
                                                </div>
                                                {student.batchId && <div style={{ fontSize: '0.75rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 8px', borderRadius: 6 }}>{student.batchId.name || 'Assigned'}</div>}
                                            </div>
                                        )) : (
                                            <div style={{ padding: '12px 16px', color: '#64748b', fontStyle: 'italic', textAlign: 'center' }}>No students matched</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Batch & Year Row */}
                            <div className="mf-row" style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569', display: 'block', marginBottom: 6 }}>BATCH</label>
                                    <select value={form.batchId} disabled style={{ ...inputStyle, background: '#f1f5f9', cursor: 'not-allowed' }}>
                                        <option value="">No Batch</option>
                                        {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569', display: 'block', marginBottom: 6 }}>BILLING YEAR *</label>
                                    <input type="number" value={form.year} onChange={(e) => setForm(c => ({ ...c, year: e.target.value }))} required style={inputStyle} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569', display: 'block', marginBottom: 6 }}>DUE DATE *</label>
                                    <input type="date" value={form.dueDate} onChange={(e) => setForm(c => ({ ...c, dueDate: e.target.value }))} required style={inputStyle} />
                                </div>
                            </div>

                            {/* Payment Mode Toggle */}
                            <div style={{ marginBottom: 20 }}>
                                <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569', display: 'block', marginBottom: 10 }}>PAYMENT MODE</label>
                                <div className="mode-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    {[
                                        { value: 'monthly', icon: Calendar, label: 'Month-by-Month', desc: 'Create fee for a single month' },
                                        { value: 'full', icon: Calculator, label: 'Full Payment', desc: 'Select multiple months at once' }
                                    ].map(opt => {
                                        const active = paymentMode === opt.value;
                                        const Icon = opt.icon;
                                        return (
                                            <div key={opt.value} className="mode-card" onClick={() => { setPaymentMode(opt.value); if (opt.value === 'monthly') setSelectedMonths([]); }}
                                                style={{ padding: '16px 18px', borderRadius: 10, border: active ? '2px solid #0f172a' : '1.5px solid #e2e8f0', background: active ? '#0f172a' : '#fff', position: 'relative' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                    <Icon size={18} color={active ? '#fff' : '#64748b'} />
                                                    <div>
                                                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: active ? '#fff' : '#1e293b' }}>{opt.label}</div>
                                                        <div style={{ fontSize: '0.7rem', color: active ? 'rgba(255,255,255,0.65)' : '#94a3b8', marginTop: 1 }}>{opt.desc}</div>
                                                    </div>
                                                </div>
                                                {active && <div style={{ position: 'absolute', top: -7, right: -7, background: '#059669', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircle2 size={14} /></div>}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Month Selection */}
                            {paymentMode === 'monthly' ? (
                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569', display: 'block', marginBottom: 6 }}>BILLING MONTH *</label>
                                    <select value={form.month} onChange={(e) => setForm(c => ({ ...c, month: e.target.value }))} required style={inputStyle}>
                                        <option value="">Select Month</option>
                                        {monthOptions.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </div>
                            ) : (
                                <div style={{ marginBottom: 20 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                        <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569' }}>SELECT MONTHS *</label>
                                        <button type="button" onClick={selectAllMonths} style={{ background: 'none', border: '1px solid #cbd5e1', borderRadius: 6, padding: '4px 12px', fontSize: '0.72rem', fontWeight: 700, color: '#475569', cursor: 'pointer' }}>
                                            {selectedMonths.length === 12 ? 'Deselect All' : 'Select All'}
                                        </button>
                                    </div>
                                    <div className="month-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                                        {monthOptions.map((m, i) => {
                                            const sel = selectedMonths.includes(m);
                                            return (
                                                <div key={m} className="month-chip" onClick={() => toggleMonth(m)}
                                                    style={{ padding: '10px 8px', borderRadius: 8, border: sel ? '2px solid #059669' : '1.5px solid #e2e8f0', background: sel ? '#ecfdf5' : '#fff', textAlign: 'center', position: 'relative' }}>
                                                    <div style={{ fontWeight: 700, fontSize: '0.82rem', color: sel ? '#065f46' : '#334155' }}>{shortMonths[i]}</div>
                                                    <div style={{ fontSize: '0.65rem', color: sel ? '#059669' : '#94a3b8', marginTop: 1 }}>{m}</div>
                                                    {sel && <div style={{ position: 'absolute', top: -5, right: -5, background: '#059669', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>✓</div>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {selectedMonths.length > 0 && (
                                        <div style={{ marginTop: 8, fontSize: '0.78rem', color: '#059669', fontWeight: 600 }}>
                                            {selectedMonths.length} month{selectedMonths.length > 1 ? 's' : ''} selected
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Fee Amount */}
                            <div style={{ display: 'flex', gap: 14, marginBottom: 20 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569', display: 'block', marginBottom: 6 }}>MONTHLY FEE (₹) *</label>
                                    <input type="number" value={form.amount} onChange={(e) => setForm(c => ({ ...c, amount: e.target.value }))} placeholder="0" required style={inputStyle} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ fontWeight: 800, fontSize: '0.7rem', color: '#475569', display: 'block', marginBottom: 6 }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Tag size={12} /> DISCOUNT (₹)</span>
                                    </label>
                                    <input type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" style={inputStyle} />
                                </div>
                            </div>

                            {/* Calculation Panel */}
                            {monthlyFee > 0 && (paymentMode === 'monthly' ? form.month : selectedMonths.length > 0) && (
                                <div style={{ background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '18px 20px', marginBottom: 20 }}>
                                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                        <Calculator size={14} /> Fee Calculation
                                    </div>

                                    <div className="calc-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Monthly Fee</span>
                                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>₹ {fmt(monthlyFee)}</span>
                                    </div>

                                    {paymentMode === 'full' && (
                                        <div className="calc-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Selected Months</span>
                                            <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>× {calculation.months}</span>
                                        </div>
                                    )}

                                    <div className="calc-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Subtotal</span>
                                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1e293b' }}>₹ {fmt(calculation.subtotal)}</span>
                                    </div>

                                    {discountValue > 0 && (
                                        <div className="calc-row" style={{ borderBottom: '1px solid #f1f5f9', background: '#f0fdf4', margin: '0 -20px', padding: '10px 20px', borderRadius: 0 }}>
                                            <span style={{ fontSize: '0.85rem', color: '#059669', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                                <Tag size={13} /> Discount Applied
                                            </span>
                                            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: '#059669' }}>- ₹ {fmt(discountValue)}</span>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 14, marginTop: 4 }}>
                                        <span style={{ fontSize: '0.82rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Total Payable</span>
                                        <span style={{ fontSize: '1.3rem', fontWeight: 900, color: '#0f172a' }}>₹ {fmt(calculation.total)}</span>
                                    </div>

                                    {paymentMode === 'full' && calculation.months > 1 && (
                                        <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'right', marginTop: 4 }}>
                                            (₹ {fmt(calculation.perMonth)} per month)
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Footer */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
                                <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 160 }}>
                                    {saving ? <Loader2 className="spin" size={14} /> : paymentMode === 'full' ? `Generate ${selectedMonths.length} Invoice${selectedMonths.length > 1 ? 's' : ''}` : 'Generate Invoice'}
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
