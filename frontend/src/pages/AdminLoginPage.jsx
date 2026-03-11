import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authApi from '../api/authApi';
import { KeyRound, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, ShieldCheck, Mail } from 'lucide-react';

const INITIAL_FORM = {
    identifier: '',
    password: ''
};

const AdminLoginPage = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState(INITIAL_FORM);
    const [showPwd, setShowPwd] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handle = (event) => {
        const { name, value } = event.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const submit = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authApi.adminLogin({ identifier: form.identifier, password: form.password });
            const data = response.data;
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', 'admin');
            localStorage.setItem('admin', JSON.stringify(data.admin));
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.message || 'Authentication failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page-wrapper admin-login-wrapper">
            <div className="bg-decoration top-left" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)' }} />
            <div className="bg-decoration bottom-right" style={{ background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)' }} />

            <div className="login-card admin-login-card">
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div className="logo-container" style={{ background: 'linear-gradient(135deg, #4c1d95 0%, #8b5cf6 100%)', boxShadow: '0 10px 15px -3px rgba(139, 92, 246, 0.2)' }}>
                        <ShieldCheck size={32} color="#fff" />
                    </div>
                    <h1 className="title">Admin Access</h1>
                    <p className="subtitle">Secure login for administrators only.</p>
                </div>

                <form onSubmit={submit}>
                    {error && (
                        <div className="error-alert">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="input-group">
                        <label className="input-label">Username or Email</label>
                        <div style={{ position: 'relative' }}>
                            <span className="input-icon">
                                <Mail size={18} />
                            </span>
                            <input
                                name="identifier"
                                type="text"
                                className="styled-input admin-input"
                                placeholder="Enter admin username or email"
                                value={form.identifier}
                                onChange={handle}
                                required
                            />
                        </div>
                    </div>

                    <div className="input-group">
                        <label className="input-label">Password</label>
                        <div style={{ position: 'relative' }}>
                            <span className="input-icon">
                                <KeyRound size={18} />
                            </span>
                            <input
                                name="password"
                                type={showPwd ? 'text' : 'password'}
                                className="styled-input admin-input pwd-input"
                                placeholder="********"
                                value={form.password}
                                onChange={handle}
                                required
                            />
                            <span
                                onClick={() => setShowPwd((value) => !value)}
                                className="toggle-pwd"
                            >
                                {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                            </span>
                        </div>
                    </div>

                    <button type="submit" disabled={loading} className="submit-btn admin-submit-btn">
                        {loading ? (
                            <>
                                <Loader2 size={20} className="spin" />
                                Authenticating...
                            </>
                        ) : (
                            <>
                                Secure Login Access
                                <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>
            </div>

            <style>{`
                .login-page-wrapper {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f8fafc;
                    position: relative;
                    overflow: hidden;
                    font-family: 'Inter', sans-serif;
                    padding: 20px;
                }

                .bg-decoration {
                    position: absolute;
                    width: 40%;
                    height: 40%;
                    border-radius: 50%;
                    z-index: 0;
                }

                .top-left {
                    top: -10%;
                    left: -10%;
                }

                .bottom-right {
                    bottom: -10%;
                    right: -10%;
                }

                .login-card {
                    width: 100%;
                    max-width: 420px;
                    background: #fff;
                    border-radius: 0.375rem;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.05), 0 10px 10px -5px rgba(0, 0, 0, 0.02);
                    padding: 40px;
                    position: relative;
                    z-index: 1;
                    border: 1px solid rgba(226, 232, 240, 0.8);
                    box-sizing: border-box;
                }

                .admin-login-card {
                    border-top: 4px solid #8b5cf6;
                }

                .logo-container {
                    width: 60px;
                    height: 60px;
                    border-radius: 0.375rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 16px;
                }

                .title {
                    font-size: 1.75rem;
                    font-weight: 900;
                    color: #0f172a;
                    margin: 0;
                    letter-spacing: -0.025em;
                }

                .subtitle {
                    color: #64748b;
                    margin-top: 8px;
                    font-size: 0.875rem;
                    font-weight: 500;
                }

                .error-alert {
                    background: #fef2f2;
                    border: 1px solid #fee2e2;
                    color: #b91c1c;
                    padding: 12px;
                    border-radius: 0.375rem;
                    margin-bottom: 20px;
                    font-size: 0.85rem;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-weight: 500;
                }

                .input-group {
                    margin-bottom: 24px;
                    text-align: left;
                }

                .input-label {
                    display: block;
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #334155;
                    margin-bottom: 6px;
                }

                .styled-input {
                    width: 100%;
                    padding: 12px 16px 12px 44px;
                    border-radius: 0.375rem;
                    border: 1px solid #e2e8f0;
                    background: #f8fafc;
                    font-size: 0.95rem;
                    outline: none;
                    box-sizing: border-box;
                    transition: all 0.2s;
                }

                .styled-input:focus {
                    border-color: #8b5cf6;
                    background: #fff;
                    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.1);
                }

                .pwd-input {
                    padding-right: 44px;
                }

                .input-icon {
                    position: absolute;
                    left: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                    display: flex;
                }

                .toggle-pwd {
                    position: absolute;
                    right: 14px;
                    top: 50%;
                    transform: translateY(-50%);
                    color: #94a3b8;
                    cursor: pointer;
                    display: flex;
                }

                .submit-btn {
                    width: 100%;
                    padding: 14px;
                    border-radius: 0.375rem;
                    color: #fff;
                    font-size: 1rem;
                    font-weight: 700;
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    transition: transform 0.2s, box-shadow 0.2s;
                }

                .admin-submit-btn {
                    background: linear-gradient(135deg, #4c1d95 0%, #8b5cf6 100%);
                    box-shadow: 0 10px 15px -3px rgba(139, 92, 246, 0.2);
                }

                .admin-submit-btn:hover:not(:disabled) {
                    box-shadow: 0 10px 15px -3px rgba(139, 92, 246, 0.4);
                }

                .submit-btn:active {
                    transform: scale(0.98);
                }

                .submit-btn:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .spin {
                    animation: spin 1s linear infinite;
                }

                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }

                @media (max-width: 480px) {
                    .login-card {
                        padding: 32px 24px;
                        border-radius: 0.375rem;
                    }

                    .title {
                        font-size: 1.5rem;
                    }

                    .bg-decoration {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
};

export default AdminLoginPage;
