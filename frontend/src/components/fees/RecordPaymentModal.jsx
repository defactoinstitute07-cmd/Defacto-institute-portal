import React, { useState, useEffect } from 'react';
import {
    X, CreditCard, AlertCircle, Loader2,
    ShieldCheck, Smartphone, Banknote
} from 'lucide-react';

const accentBlue = '#2563eb';
const sharpRadius = '4px';
const borderColor = '#e2e8f0';
const labelColor = '#475569';
const headingColor = '#0f172a';

const PAYMENT_MODES = [
    { value: 'UPI', label: 'UPI', icon: Smartphone },
    { value: 'Cash', label: 'Cash', icon: Banknote }
];

const RecordPaymentModal = ({ fee, onClose, onSave }) => {
    const [form, setForm] = useState({
        amountPaid: '',
        mode: 'UPI',
        fine: '0'
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (fee) {
            const remaining = fee.pendingAmount || 0;
            setForm(prev => ({ ...prev, amountPaid: remaining.toString() }));
        }
    }, [fee]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            await onSave(form);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to record payment');
        } finally {
            setSaving(false);
        }
    };

    if (!fee) return null;

    const totalDue = fee.totalFee || 0;
    const monthlyBase = fee.monthlyTuitionFee || 0;
    const remainingBalance = fee.pendingAmount || 0;

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
                padding: '10px'
            }}
            onClick={onClose}
        >
            <style>{`
                .pay-modal-container {
                    width: 100%;
                    max-width: 480px;
                    max-height: 95vh;
                    background: #fff;
                    border-radius: 0.375rem;
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
                    position: relative;
                }
                .pay-mode-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 10px;
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>

            <div className="pay-modal-container" onClick={e => e.stopPropagation()}>
                {/* --- HEADER --- */}
                <header style={{
                    width: '100%',
                    padding: '20px 24px',
                    background: headingColor,
                    position: 'relative',
                    color: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexShrink: 0
                }}>
                    <CreditCard size={100} style={{ position: 'absolute', right: -15, bottom: -25, opacity: 0.08, color: '#fff' }} />

                    <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{
                            width: 38, height: 38, borderRadius: '8px',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0
                        }}>
                            <CreditCard size={18} color="#fff" />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                                Record Payment
                            </h2>
                            <div style={{ fontSize: '0.72rem', opacity: 0.85, fontWeight: 500 }}>
                                {fee.studentId?.name}
                            </div>
                        </div>
                    </div>

                    <button type="button" onClick={onClose} style={{
                        position: 'relative', zIndex: 1,
                        background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px', color: '#fff', padding: '5px 10px',
                        cursor: 'pointer', fontSize: '0.65rem', fontWeight: 700
                    }}>
                        CLOSE
                    </button>
                </header>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    <form onSubmit={handleSubmit}>

                        {/* --- BILL SUMMARY --- */}
                        <div style={{ padding: '20px 24px', background: '#f8fafc', borderBottom: `1px solid ${borderColor}` }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Total Billed</span>
                                <span style={{ fontSize: '1rem', fontWeight: 800 }}>₹ {totalDue.toLocaleString()}</span>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Monthly Base Fee</span>
                                <span style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.85rem' }}>₹ {monthlyBase.toLocaleString()}</span>
                            </div>

                            <div style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                paddingTop: 12, borderTop: `1px solid ${borderColor}`
                            }}>
                                <div style={{ fontSize: '0.72rem', fontWeight: 900, color: accentBlue }}>REMAINING</div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: accentBlue }}>₹ {remainingBalance.toLocaleString()}</div>
                            </div>
                        </div>

                        {/* --- FORM FIELDS --- */}
                        <div style={{ padding: '24px' }}>
                            {error && (
                                <div style={{ padding: '10px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: sharpRadius, color: '#991b1b', fontSize: '0.78rem', fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <AlertCircle size={15} /> {error}
                                </div>
                            )}

                            {/* Amount to Pay */}
                            <div style={{ marginBottom: 18 }}>
                                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: labelColor, display: 'block', marginBottom: 6 }}>AMOUNT TO PAY *</label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#94a3b8' }}>₹</span>
                                    <input
                                        type="number" required max={remainingBalance} step="0.01"
                                        style={{ borderRadius: sharpRadius, padding: '11px 11px 11px 28px', border: `1px solid ${borderColor}`, fontSize: '0.88rem', fontWeight: 700, background: '#fcfdfd', width: '100%', boxSizing: 'border-box' }}
                                        value={form.amountPaid}
                                        onChange={e => {
                                            let val = e.target.value;
                                            if (Number(val) > remainingBalance) val = remainingBalance.toString();
                                            setForm({ ...form, amountPaid: val });
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Late Fine */}
                            <div style={{ marginBottom: 18 }}>
                                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: labelColor, display: 'block', marginBottom: 6 }}>LATE FINE</label>
                                <input
                                    type="number"
                                    style={{ borderRadius: sharpRadius, padding: '11px', border: `1px solid ${borderColor}`, fontSize: '0.88rem', fontWeight: 700, background: '#fcfdfd', width: '100%', boxSizing: 'border-box' }}
                                    value={form.fine}
                                    onChange={e => setForm({ ...form, fine: e.target.value })}
                                />
                            </div>

                            {/* Payment Method */}
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ fontSize: '0.68rem', fontWeight: 800, color: labelColor, display: 'block', marginBottom: 8 }}>PAYMENT METHOD</label>
                                <div className="pay-mode-grid">
                                    {PAYMENT_MODES.map(({ value, label, icon: Icon }) => (
                                        <button
                                            key={value} type="button"
                                            onClick={() => setForm({ ...form, mode: value })}
                                            style={{
                                                padding: '12px 8px',
                                                border: `1.5px solid ${form.mode === value ? '#001f3f' : borderColor}`,
                                                borderRadius: sharpRadius,
                                                fontSize: '0.72rem',
                                                fontWeight: 800,
                                                background: form.mode === value ? '#001f3f' : '#fff',
                                                color: form.mode === value ? '#fff' : '#475569',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: 6,
                                                transition: 'all 0.15s ease'
                                            }}
                                        >
                                            <Icon size={15} />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button type="button" onClick={onClose} disabled={saving}
                                    style={{ flex: 1, padding: '13px', borderRadius: sharpRadius, border: `1.5px solid ${borderColor}`, background: '#fff', color: '#64748b', fontWeight: 800, cursor: 'pointer', fontSize: '0.68rem' }}>
                                    Discard
                                </button>
                                <button type="submit" disabled={saving}
                                    style={{
                                        flex: 2,
                                        background: saving ? '#94a3b8' : '#001f3f',
                                        color: '#fff', borderRadius: sharpRadius, padding: '13px', fontWeight: 900, border: 'none',
                                        cursor: saving ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        fontSize: '0.68rem', textTransform: 'uppercase'
                                    }}>
                                    {saving ? <Loader2 size={15} className="spin" /> : <ShieldCheck size={15} />}
                                    Finalize Payment
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RecordPaymentModal;
