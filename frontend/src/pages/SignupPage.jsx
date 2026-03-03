import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { checkAdminExists, adminSignup } from '../api/adminApi';
import { User, School, Mail, Lock, Home, Loader2, AlertCircle, ArrowRight, Palette, BookOpen, FileDigit, Image as ImageIcon, Eye, EyeOff } from 'lucide-react';

const SignupPage = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        adminName: '', coachingName: '', email: '', password: '', confirmPassword: '', roomsAvailable: '',
        registrationNumber: '', classesOffered: '', themeColor1: '#1b3a7a', themeColor2: '#c53030'
    });
    const [logoScale, setLogoScale] = useState(null);
    const [logoFile, setLogoFile] = useState(null);
    const [exists, setExists] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSub] = useState(false);
    const [error, setError] = useState('');
    const [showPwd, setShowPwd] = useState(false);
    const [showCPwd, setShowCPwd] = useState(false);

    useEffect(() => {
        checkAdminExists()
            .then(({ data }) => setExists(data.exists))
            .catch(() => { })
            .finally(() => setLoading(false));
    }, []);

    const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

    const submit = async e => {
        e.preventDefault();
        setError('');
        if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
        if (form.password.length < 6) return setError('Password must be at least 6 characters.');
        setSub(true);
        try {
            const formData = new FormData();
            formData.append('adminName', form.adminName);
            formData.append('coachingName', form.coachingName);
            formData.append('email', form.email);
            formData.append('password', form.password);
            formData.append('roomsAvailable', form.roomsAvailable);
            if (form.registrationNumber) formData.append('registrationNumber', form.registrationNumber);

            // Format colors as array
            formData.append('themeColors', JSON.stringify([form.themeColor1, form.themeColor2]));

            // Format classes (comma separated to array)
            if (form.classesOffered) {
                const classesArray = form.classesOffered.split(',').map(c => c.trim()).filter(Boolean);
                formData.append('classesOffered', JSON.stringify(classesArray));
            }

            if (logoFile) {
                formData.append('instituteLogo', logoFile);
            }

            await adminSignup(formData);
            navigate('/login');
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong. Try again.');
        } finally { setSub(false); }
    };

    if (loading) return (
        <div className="login-wrap">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: 'var(--erp-muted2)' }}>
                <Loader2 size={40} color="var(--erp-primary)" className="spin" />
                <p style={{ fontSize: '0.9rem' }}>Checking system status…</p>
            </div>
        </div>
    );

    if (exists) return (
        <div className="login-wrap">
            <div className="login-card" style={{ textAlign: 'center', maxWidth: 420 }}>
                <div className="login-logo" style={{ background: '#fff1f2' }}>🔐</div>
                <h1 className="login-title" style={{ color: '#c53030' }}>Admin Registered</h1>
                <p style={{ color: 'var(--erp-muted2)', margin: '8px 0 28px', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    An admin account already exists. Please login to continue.
                </p>
                <Link to="/login">
                    <button className="btn-login">Go to Login <ArrowRight size={16} /></button>
                </Link>
            </div>
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8fafc',
            position: 'relative',
            overflow: 'hidden',
            padding: '40px 20px',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Background Decorative Elements */}
            <div style={{ position: 'absolute', top: '-5%', left: '-5%', width: '30%', height: '30%', background: 'radial-gradient(circle, rgba(37,99,235,0.03) 0%, transparent 70%)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '-5%', right: '-5%', width: '30%', height: '30%', background: 'radial-gradient(circle, rgba(37,99,235,0.03) 0%, transparent 70%)', borderRadius: '50%' }} />

            <div style={{
                width: '100%',
                maxWidth: 840,
                background: '#fff',
                borderRadius: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)',
                position: 'relative',
                zIndex: 1,
                border: '1px solid rgba(226, 232, 240, 0.8)',
                overflow: 'hidden'
            }}>
                {/* --- PREMIUM SIGNUP HEADER --- */}
                <div style={{
                    padding: '48px 40px',
                    background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                    position: 'relative',
                    color: '#fff',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: 56,
                        height: 56,
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        backdropFilter: 'blur(10px)'
                    }}>
                        <School size={28} color="#fff" />
                    </div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                        Institute Genesis
                    </h1>
                    <p style={{ fontSize: '1rem', opacity: 0.8, marginTop: 6, fontWeight: 500 }}>
                        Configure your ERP system and administrator profile
                    </p>
                </div>

                <form onSubmit={submit} style={{ padding: '40px' }}>
                    {error && (
                        <div style={{
                            background: '#fef2f2',
                            border: '1px solid #fee2e2',
                            color: '#b91c1c',
                            padding: '14px 20px',
                            borderRadius: '14px',
                            marginBottom: 32,
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            fontWeight: 600
                        }}>
                            <AlertCircle size={20} />{error}
                        </div>
                    )}

                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                        Master Administrator
                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: 20 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: 8, marginLeft: 4 }}>Admin Name</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><User size={18} /></span>
                                <input name="adminName" placeholder="Full name" value={form.adminName} onChange={handle} required style={inputStyle} />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: 8, marginLeft: 4 }}>Coaching Name</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><School size={18} /></span>
                                <input name="coachingName" placeholder="Institute name" value={form.coachingName} onChange={handle} required style={inputStyle} />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: 8, marginLeft: 4 }}>Account Email</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><Mail size={18} /></span>
                            <input name="email" type="email" placeholder="admin@example.com" value={form.email} onChange={handle} style={inputStyle} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: 32 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: 8, marginLeft: 4 }}>Password</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><Lock size={18} /></span>
                                <input name="password" type={showPwd ? 'text' : 'password'} placeholder="Min. 6 characters" value={form.password} onChange={handle} required style={inputStyle} />
                                <span onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }}>{showPwd ? <EyeOff size={18} /> : <Eye size={18} />}</span>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: 8, marginLeft: 4 }}>Confirm Password</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><Lock size={18} /></span>
                                <input name="confirmPassword" type={showCPwd ? 'text' : 'password'} placeholder="Repeat password" value={form.confirmPassword} onChange={handle} required style={inputStyle} />
                                <span onClick={() => setShowCPwd(p => !p)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }}>{showCPwd ? <EyeOff size={18} /> : <Eye size={18} />}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 10 }}>
                        Institute Blueprint
                        <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: 20 }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: 8, marginLeft: 4 }}>Reg # (Optional)</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><FileDigit size={18} /></span>
                                <input name="registrationNumber" placeholder="Govt. ID or Reg #" value={form.registrationNumber} onChange={handle} style={inputStyle} />
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: 8, marginLeft: 4 }}>Rooms Available</label>
                            <div style={{ position: 'relative' }}>
                                <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><Home size={18} /></span>
                                <input name="roomsAvailable" type="number" placeholder="Total rooms" value={form.roomsAvailable} onChange={handle} required style={inputStyle} />
                            </div>
                        </div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: 8, marginLeft: 4 }}>Initial Classes Offered</label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}><BookOpen size={18} /></span>
                            <input name="classesOffered" placeholder="e.g. Class 11 Sci, JEE Batch (Comma separated)" value={form.classesOffered} onChange={handle} style={inputStyle} />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: 40 }}>
                        <div style={{ background: '#f8fafc', padding: 16, borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>Primary Theme</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <input type="color" name="themeColor1" value={form.themeColor1} onChange={handle} style={{ height: 40, width: 50, border: 'none', background: 'transparent', cursor: 'pointer' }} />
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', fontFamily: 'monospace' }}>{form.themeColor1}</span>
                            </div>
                        </div>
                        <div style={{ background: '#f8fafc', padding: 16, borderRadius: '14px', border: '1px solid #e2e8f0' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 12 }}>Secondary Theme</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <input type="color" name="themeColor2" value={form.themeColor2} onChange={handle} style={{ height: 40, width: 40, border: 'none', background: 'transparent', cursor: 'pointer' }} />
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#334155', fontFamily: 'monospace' }}>{form.themeColor2}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        style={{
                            width: '100%',
                            padding: '18px',
                            borderRadius: '16px',
                            background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)',
                            color: '#fff',
                            fontSize: '1.125rem',
                            fontWeight: 900,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 12,
                            boxShadow: '0 15px 30px -5px rgba(15, 23, 42, 0.25)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {submitting ? <><Loader2 size={24} className="spin" /> Initializing System…</> : <>Finalize Registration <ArrowRight size={24} /></>}
                    </button>
                    <div style={{ textAlign: 'center', marginTop: 24, fontSize: '0.925rem', color: '#64748b' }}>
                        Joined before? <Link to="/login" style={{ color: '#0f172a', fontWeight: 700, textDecoration: 'none' }}>Login to account</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

const inputStyle = {
    width: '100%',
    padding: '14px 16px 14px 44px',
    borderRadius: '14px',
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: '0.95rem',
    outline: 'none',
    transition: 'all 0.2s'
};

export default SignupPage;
