import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authApi from '../api/authApi';
import { Hash, KeyRound, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, Mail, School } from 'lucide-react';

const LoginPage = () => {
    const navigate = useNavigate();
    const [role, setRole] = useState('admin'); // admin, teacher, student
    const [form, setForm] = useState({ identifier: '', email: '', password: '' });
    const [showPwd, setShowPwd] = useState(false);
    const [remember, setRemember] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handle = e => setForm({ ...form, [e.target.name]: e.target.value });

    const submit = async e => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            let res;
            if (role === 'admin') {
                res = await authApi.adminLogin({ identifier: form.identifier, password: form.password });
            } else if (role === 'teacher') {
                res = await authApi.teacherLogin({ regNo: form.identifier, password: form.password });
            } else if (role === 'student') {
                res = await authApi.studentLogin({ email: form.email, password: form.password });
            }

            const { data } = res;

            localStorage.setItem('token', data.token);
            localStorage.setItem('role', role);

            if (role === 'admin') {
                localStorage.setItem('admin', JSON.stringify(data.admin));
                navigate('/dashboard');
            } else if (role === 'teacher') {
                localStorage.setItem('teacher', JSON.stringify(data.teacher));
                navigate('/teacher-dashboard');
            } else if (role === 'student') {
                localStorage.setItem('student', JSON.stringify(data.student));
                navigate('/student-dashboard');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid credentials. Please try again.');
        } finally { setLoading(false); }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f8fafc',
            position: 'relative',
            overflow: 'hidden',
            fontFamily: "'Inter', sans-serif"
        }}>
            {/* Background Decorative Elements */}
            <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(37,99,235,0.05) 0%, transparent 70%)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40%', height: '40%', background: 'radial-gradient(circle, rgba(37,99,235,0.05) 0%, transparent 70%)', borderRadius: '50%' }} />

            <div style={{
                width: '100%',
                maxWidth: 440,
                background: '#fff',
                borderRadius: '32px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)',
                padding: '48px 40px',
                position: 'relative',
                zIndex: 1,
                border: '1px solid rgba(226, 232, 240, 0.8)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{
                        width: 64,
                        height: 64,
                        background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        borderRadius: '18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 20px',
                        boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.2)'
                    }}>
                        <School size={32} color="#fff" />
                    </div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 900, color: '#0f172a', margin: 0, letterSpacing: '-0.025em' }}>ERP Login</h1>
                    <p style={{ color: '#64748b', marginTop: 8, fontSize: '0.95rem', fontWeight: 500 }}>Access your management dashboard</p>
                </div>

                {/* Role Tabs */}
                <div style={{
                    display: 'flex',
                    background: '#f1f5f9',
                    padding: 4,
                    borderRadius: '14px',
                    marginBottom: 32
                }}>
                    {['admin', 'teacher', 'student'].map(r => (
                        <button
                            key={r}
                            type="button"
                            onClick={() => setRole(r)}
                            style={{
                                flex: 1,
                                padding: '10px 0',
                                border: 'none',
                                borderRadius: '10px',
                                fontSize: '0.875rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                textTransform: 'capitalize',
                                transition: 'all 0.2s',
                                background: role === r ? '#fff' : 'transparent',
                                color: role === r ? '#2563eb' : '#64748b',
                                boxShadow: role === r ? '0 4px 6px -1px rgba(0, 0, 0, 0.05)' : 'none'
                            }}
                        >
                            {r}
                        </button>
                    ))}
                </div>

                <form onSubmit={submit}>
                    {error && (
                        <div style={{
                            background: '#fef2f2',
                            border: '1px solid #fee2e2',
                            color: '#b91c1c',
                            padding: '12px 16px',
                            borderRadius: '12px',
                            marginBottom: 24,
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            fontWeight: 500
                        }}>
                            <AlertCircle size={18} />{error}
                        </div>
                    )}

                    <div style={{ marginBottom: 20 }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: 8, marginLeft: 4 }}>
                            {role === 'admin' ? 'User Identity' : role === 'teacher' ? 'Employee ID' : 'Email Address'}
                        </label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                {role === 'admin' || role === 'teacher' ? <Hash size={18} /> : <Mail size={18} />}
                            </span>
                            <input
                                name={role === 'student' ? 'email' : 'identifier'}
                                type={role === 'student' ? 'email' : 'text'}
                                placeholder={role === 'admin' ? "Name or email" : role === 'teacher' ? "Enter Employee ID" : "your@email.com"}
                                value={role === 'student' ? form.email : form.identifier}
                                onChange={handle}
                                style={{
                                    width: '100%',
                                    padding: '14px 16px 14px 48px',
                                    borderRadius: '14px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'all 0.2s'
                                }}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 700, color: '#334155', marginBottom: 8, marginLeft: 4 }}>
                            Secret Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}>
                                <KeyRound size={18} />
                            </span>
                            <input
                                name="password"
                                type={showPwd ? 'text' : 'password'}
                                placeholder="••••••••"
                                value={form.password}
                                onChange={handle}
                                style={{
                                    width: '100%',
                                    padding: '14px 48px 14px 48px',
                                    borderRadius: '14px',
                                    border: '1px solid #e2e8f0',
                                    background: '#f8fafc',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'all 0.2s'
                                }}
                                required
                            />
                            <span
                                onClick={() => setShowPwd(p => !p)}
                                style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', cursor: 'pointer' }}
                            >
                                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                            </span>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            width: '100%',
                            padding: '16px',
                            borderRadius: '14px',
                            background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                            color: '#fff',
                            fontSize: '1rem',
                            fontWeight: 800,
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 10,
                            boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.25)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {loading
                            ? <><Loader2 size={20} className="spin" /> Securely Signing In…</>
                            : <>Enter Dashboard <ArrowRight size={20} /></>
                        }
                    </button>
                </form>

                <div style={{ marginTop: 32, textAlign: 'center', fontSize: '0.925rem', color: '#64748b' }}>
                    New to the academy? <Link to="/signup" style={{ color: '#2563eb', fontWeight: 700, textDecoration: 'none' }}>Register here</Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
