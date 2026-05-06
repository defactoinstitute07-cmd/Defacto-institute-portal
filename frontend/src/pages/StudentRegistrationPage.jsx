import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { AlertCircle, CheckCircle2, Loader2, Send } from 'lucide-react';
import { API_BASE_URL } from '../api/apiConfig';

const EMPTY_FORM = {
    name: '',
    dob: '',
    gender: 'Male',
    phone: '',
    email: '',
    fatherName: '',
    motherName: '',
    parentPhone: '',
    address: '',
    className: '',
    batchId: '',
    admissionDate: new Date().toISOString().slice(0, 10),
    session: '2026-2027',
    fees: '',
    registrationFee: '',
    discount: '',
    paymentMode: 'monthly',
    notes: '',
    profileImage: null
};

const inputStyle = {
    width: '100%',
    height: 44,
    padding: '0 12px',
    border: '1.5px solid #cbd5e1',
    borderRadius: 6,
    background: '#fff',
    color: '#0f172a',
    outline: 'none',
    fontSize: '0.9rem'
};

const labelStyle = {
    display: 'block',
    marginBottom: 6,
    color: '#475569',
    fontSize: '0.72rem',
    fontWeight: 800,
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
};

const StudentRegistrationPage = () => {
    const [form, setForm] = useState(EMPTY_FORM);
    const [batches, setBatches] = useState([]);
    const [loadingBatches, setLoadingBatches] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const settings = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('instituteSettings') || '{}');
        } catch {
            return {};
        }
    }, []);

    const classesList = settings.classesOffered && settings.classesOffered.length > 0
        ? settings.classesOffered
        : ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];

    const visibleBatches = batches.filter((batch) => {
        if (!form.className) return false;
        return String(batch.course || '').trim().toLowerCase() === String(form.className).trim().toLowerCase();
    });

    const selectedBatch = batches.find((batch) => batch._id === form.batchId);
    const monthlyFeeValue = Number(form.fees) || 0;
    const registrationFeeValue = Number(form.registrationFee) || 0;
    const discountValue = Math.max(Number(form.discount) || 0, 0);
    const netPayableOnAdmission = Math.max(monthlyFeeValue + registrationFeeValue - discountValue, 0);

    useEffect(() => {
        let mounted = true;
        axios.get(`${API_BASE_URL}/api/students/batches`)
            .then((res) => {
                if (mounted) setBatches(res.data.batches || []);
            })
            .catch(() => {
                if (mounted) setError('Unable to load batches. Please try again later.');
            })
            .finally(() => {
                if (mounted) setLoadingBatches(false);
            });

        return () => {
            mounted = false;
        };
    }, []);

    const handleForm = (event) => {
        const { name, value } = event.target;
        setForm((prev) => {
            const next = { ...prev, [name]: value };
            if (name === 'className') {
                next.batchId = '';
                next.fees = '';
            }
            if (name === 'batchId') {
                const batch = batches.find((item) => item._id === value);
                next.fees = batch?.fees || '';
            }
            return next;
        });
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');

        try {
            const formData = new FormData();
            Object.entries(form).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    formData.append(key, value);
                }
            });

            await axios.post(`${API_BASE_URL}/api/students/register`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setSubmitted(true);
            setForm(EMPTY_FORM);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } catch (err) {
            setError(err.response?.data?.message || 'Registration could not be submitted.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <main style={{ minHeight: '100vh', background: '#f8fafc', color: '#0f172a' }}>
            <style>{`
                .registration-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
                .registration-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 12px 24px -16px rgba(15, 23, 42, 0.24); }
                .registration-field-full { grid-column: 1 / -1; }
                .registration-batch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
                .registration-input:focus { border-color: var(--erp-primary, #193466) !important; box-shadow: 0 0 0 3px rgba(25, 52, 102, 0.10); }
                .defacto-logo { display: flex; align-items: center; gap: 14px; }
                .defacto-mark {
                    width: 60px;
                    height: 60px;
                    border-radius: 8px;
                    background: #07101f;
                    border: 2px solid #f5c400;
                    color: #fff;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.16), 0 8px 16px -10px rgba(15,23,42,0.6);
                    font-weight: 900;
                    font-size: 1.35rem;
                    letter-spacing: -0.04em;
                }
                .defacto-mark::before {
                    content: '';
                    position: absolute;
                    width: 30px;
                    height: 30px;
                    border-left: 2px solid #d6a63a;
                    border-top: 2px solid #d6a63a;
                    transform: rotate(45deg);
                    top: 9px;
                    opacity: 0.9;
                }
                .defacto-word {
                    margin: 0;
                    color: #ffd400;
                    font-size: 2.05rem;
                    line-height: 0.95;
                    font-weight: 900;
                    letter-spacing: 0;
                    -webkit-text-stroke: 1.2px #07101f;
                    text-shadow: 1px 1px 0 #07101f;
                }
                .defacto-sub {
                    margin-top: 6px;
                    color: #07101f;
                    font-size: 0.82rem;
                    font-weight: 900;
                    letter-spacing: 0.08em;
                }
                .defacto-divider { color: #64748b; margin: 0 8px; }
                @media (max-width: 720px) {
                    .registration-grid { grid-template-columns: 1fr; }
                    .registration-shell { padding: 16px !important; }
                    .registration-header { flex-direction: column; align-items: flex-start !important; }
                    .defacto-mark { width: 52px; height: 52px; font-size: 1.1rem; }
                    .defacto-word { font-size: 1.55rem; }
                    .defacto-sub { font-size: 0.68rem; }
                }
            `}</style>

            <section className="registration-shell" style={{ width: '100%', maxWidth: 1040, margin: '0 auto', padding: '32px 20px' }}>
                <header className="registration-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, marginBottom: 20 }}>
                    <div className="defacto-logo">
                        {/* Logo Icon Container */}
                        <div className="flex-shrink-0 w-12 h-12 rounded-2xl overflow-hidden border-[1.5px] border-yellow-500/60 shadow-lg bg-[#0a1120] flex items-center justify-center">
                            {settings?.instituteLogo ? (
                                <img
                                    src={settings.instituteLogo}
                                    alt="Defacto Institute Logo"
                                    className="w-full h-full object-cover"
                                    onError={(event) => {
                                        event.target.style.display = 'none';
                                        // Reverts to the default 'DF' fallback if image fails to load
                                        event.target.nextElementSibling.style.display = 'flex';
                                    }}
                                />
                            ) : null}

                            {/* Fallback Icon (Shows if no logo or if logo fails to load) */}
                            <div
                                className="w-full h-full flex flex-col items-center justify-center"
                                style={{ display: settings?.instituteLogo ? 'none' : 'flex' }}
                            >
                                <span className="text-white font-black text-xl tracking-tighter leading-none relative z-10">DF</span>
                                {/* Subtle gold triangle accent mimicking your logo */}
                                <div className="absolute w-0 h-0 border-l-[12px] border-r-[12px] border-b-[20px] border-l-transparent border-r-transparent border-b-yellow-500/20 -mb-4"></div>
                            </div>
                        </div>

                        {/* Brand Text Container */}
                        <div className="flex flex-col justify-center whitespace-nowrap">
                            {/* Main "Defacto" Text */}
                            <span
                                className="text-3xl font-black tracking-tight leading-none"
                                style={{
                                    color: '#FACC15', // Tailwind's yellow-400
                                    WebkitTextStroke: '1px #0f172a', // Dark outline to match the image
                                    textShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                }}
                            >
                                Defacto
                            </span>

                            {/* Subtitle Text */}
                            <span className="text-[11px] font-black text-slate-900 tracking-wider mt-0.5 uppercase">
                                Institute <span className="text-slate-400 mx-1">|</span> BHANIYAWALA
                            </span>
                        </div>
                    </div>

                <span style={{ border: '1px solid #fde68a', background: '#fffbeb', color: '#b45309', borderRadius: 4, padding: '6px 10px', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>
                    Approval Required
                </span>
            </header>

            {submitted && (
                <div className="registration-card" style={{ marginBottom: 18, padding: 16, display: 'flex', alignItems: 'center', gap: 10, borderColor: '#bbf7d0', background: '#f0fdf4', color: '#166534' }}>
                    <CheckCircle2 size={20} />
                    <div>
                        <div style={{ fontWeight: 800 }}>Registration submitted</div>
                        <div style={{ fontSize: '0.86rem' }}>Your details are now visible to the admin for manual approval.</div>
                    </div>
                </div>
            )}

            {error && (
                <div className="registration-card" style={{ marginBottom: 18, padding: 16, display: 'flex', alignItems: 'center', gap: 10, borderColor: '#fecaca', background: '#fef2f2', color: '#b91c1c' }}>
                    <AlertCircle size={20} />
                    <span style={{ fontWeight: 700 }}>{error}</span>
                </div>
            )}

            <form className="registration-card" onSubmit={handleSubmit} style={{ overflow: 'hidden' }}>
                <div style={{ padding: 22, borderBottom: '1px solid #e2e8f0', background: '#0f172a', color: '#fff' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800 }}>Basic Details</div>
                </div>

                <div style={{ padding: 22 }}>
                    <div style={{ marginBottom: 18 }}>
                        <label style={labelStyle}>Full Name *</label>
                        <input className="registration-input" name="name" value={form.name} onChange={handleForm} required placeholder="Student full name" style={inputStyle} />
                    </div>

                    <div className="registration-grid">
                        <Field label="Date of Birth">
                            <input className="registration-input" type="date" name="dob" value={form.dob} onChange={handleForm} style={inputStyle} />
                        </Field>
                        <Field label="Gender">
                            <select className="registration-input" name="gender" value={form.gender} onChange={handleForm} style={inputStyle}>
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </Field>
                        <Field label="WhatsApp Number">
                            <input className="registration-input" name="phone" value={form.phone} onChange={handleForm} placeholder="+91 0000000000" style={inputStyle} />
                        </Field>
                        <Field label="Email Address">
                            <input className="registration-input" type="email" name="email" value={form.email} onChange={handleForm} placeholder="student@example.com" style={inputStyle} />
                        </Field>
                        <Field label="Father's Name">
                            <input className="registration-input" name="fatherName" value={form.fatherName} onChange={handleForm} placeholder="Father's full name" style={inputStyle} />
                        </Field>
                        <Field label="Mother's Name">
                            <input className="registration-input" name="motherName" value={form.motherName} onChange={handleForm} placeholder="Mother's full name" style={inputStyle} />
                        </Field>
                        <Field label="Parent Contact Number">
                            <input className="registration-input" name="parentPhone" value={form.parentPhone} onChange={handleForm} placeholder="+91 0000000000" style={inputStyle} />
                        </Field>
                        <Field label="Academic Session">
                            <input className="registration-input" name="session" value={form.session} onChange={handleForm} placeholder="2026-2027" style={inputStyle} />
                        </Field>
                        <Field label="Full Address" full>
                            <textarea className="registration-input" name="address" value={form.address} onChange={handleForm} placeholder="Street, city, zip code..." style={{ ...inputStyle, height: 84, paddingTop: 10, resize: 'vertical' }} />
                        </Field>
                    </div>
                </div>

                <div style={{ padding: 22, borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800 }}>Enrollment Info</div>
                </div>

                <div style={{ padding: 22 }}>
                    <div className="registration-grid">
                        <Field label="Standard / Course">
                            <select className="registration-input" name="className" value={form.className} onChange={handleForm} style={inputStyle}>
                                <option value="">Select Class</option>
                                {classesList.map((className) => (
                                    <option key={className} value={className}>{className}</option>
                                ))}
                            </select>
                        </Field>
                        <Field label="Admission Date">
                            <input className="registration-input" type="date" name="admissionDate" value={form.admissionDate} onChange={handleForm} style={inputStyle} />
                        </Field>
                        <div className="registration-field-full">
                            <label style={labelStyle}>Preferred Batch</label>
                            {!form.className ? (
                                <div style={{ padding: 18, border: '1px dashed #cbd5e1', borderRadius: 8, color: '#64748b', textAlign: 'center', background: '#f8fafc' }}>
                                    Select a class to view available batches.
                                </div>
                            ) : loadingBatches ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#64748b' }}>
                                    <Loader2 size={16} className="spin" /> Loading batches...
                                </div>
                            ) : visibleBatches.length === 0 ? (
                                <div style={{ padding: 18, border: '1px dashed #cbd5e1', borderRadius: 8, color: '#64748b', textAlign: 'center', background: '#f8fafc' }}>
                                    No active batches available for this class.
                                </div>
                            ) : (
                                <div className="registration-batch-grid">
                                    {visibleBatches.map((batch) => {
                                        const isFull = batch.capacity > 0 && batch.enrolled >= batch.capacity;
                                        const isSelected = form.batchId === batch._id;
                                        return (
                                            <button
                                                key={batch._id}
                                                type="button"
                                                onClick={() => !isFull && handleForm({ target: { name: 'batchId', value: batch._id } })}
                                                disabled={isFull}
                                                style={{
                                                    textAlign: 'left',
                                                    padding: 14,
                                                    borderRadius: 8,
                                                    border: isSelected ? '2px solid #0f172a' : '1px solid #cbd5e1',
                                                    background: isSelected ? '#0f172a' : isFull ? '#f1f5f9' : '#fff',
                                                    color: isSelected ? '#fff' : '#0f172a',
                                                    cursor: isFull ? 'not-allowed' : 'pointer'
                                                }}
                                            >
                                                <div style={{ fontWeight: 800, fontSize: '0.9rem' }}>{batch.name}</div>
                                                <div style={{ color: isSelected ? 'rgba(255,255,255,0.72)' : isFull ? '#dc2626' : '#64748b', fontSize: '0.76rem', marginTop: 4 }}>
                                                    {batch.enrolled}/{batch.capacity || 'Open'} Seats
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="registration-field-full" style={{ opacity: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
                            <div className="registration-grid">
                                <Field label="Monthly Fee (Rs.)">
                                    <input className="registration-input" type="number" name="fees" value={form.fees} onChange={handleForm} readOnly={!!selectedBatch} tabIndex={-1} style={{ ...inputStyle, background: selectedBatch ? '#f1f5f9' : '#fff' }} />
                                </Field>
                                <Field label="Registration Fee (Rs.)">
                                    <input className="registration-input" type="number" name="registrationFee" value={form.registrationFee} onChange={handleForm} tabIndex={-1} style={inputStyle} />
                                </Field>
                                <Field label="Discount (Rs.)">
                                    <input className="registration-input" type="number" min="0" name="discount" value={form.discount} onChange={handleForm} placeholder="0" tabIndex={-1} style={inputStyle} />
                                </Field>
                                <Field label="Payment Mode">
                                    <select className="registration-input" name="paymentMode" value={form.paymentMode} onChange={handleForm} tabIndex={-1} style={inputStyle}>
                                        <option value="monthly">Month-by-Month</option>
                                        <option value="full">Full Payment</option>
                                    </select>
                                </Field>
                                <Field label="Enrollment Notes" full>
                                    <textarea className="registration-input" name="notes" value={form.notes} onChange={handleForm} rows={2} tabIndex={-1} style={{ ...inputStyle, height: 72, paddingTop: 10, resize: 'vertical' }} />
                                </Field>
                            </div>
                        </div>
                    </div>

                    <div style={{ opacity: 0, height: 0, overflow: 'hidden', pointerEvents: 'none' }} aria-hidden="true">
                        <div style={{ marginTop: 18, padding: 14, border: '1px solid #e2e8f0', borderRadius: 8, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                            <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase' }}>Net Payable On Admission</span>
                            <span style={{ color: '#0f172a', fontSize: '1.1rem', fontWeight: 900 }}>Rs. {netPayableOnAdmission.toLocaleString('en-IN')}</span>
                        </div>
                    </div>
                </div>

                <div style={{ padding: 22, borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit" disabled={saving} className="btn btn-primary" style={{ minWidth: 220, height: 48, justifyContent: 'center' }}>
                        {saving ? <><Loader2 size={18} className="spin" /> Submitting...</> : <><Send size={18} /> Submit Registration</>}
                    </button>
                </div>
            </form>
        </section>
        </main >
    );
};

const Field = ({ label, full = false, children }) => (
    <div className={full ? 'registration-field-full' : ''}>
        <label style={labelStyle}>{label}</label>
        {children}
    </div>
);

export default StudentRegistrationPage;
