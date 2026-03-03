import React, { useState } from 'react';
import { ShieldAlert, Trash2, X, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

const ActionModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    actionType = 'verify', // 'verify' or 'delete'
    loading,
    error
}) => {
    if (!isOpen) return null;

    const [pwd, setPwd] = useState('');
    const [showPwd, setShowPwd] = useState(false);

    const isDelete = actionType === 'delete';
    const ThemeColor = isDelete ? 'var(--erp-danger, #ef4444)' : 'var(--erp-warning, #f59e0b)';
    const ThemeBg = isDelete ? '#fef2f2' : '#fffbeb';
    const ThemeBorder = isDelete ? '#fecaca' : '#fde68a';
    const ThemeText = isDelete ? '#b91c1c' : '#b45309';

    const handleConfirm = () => {
        if (pwd) onConfirm(pwd);
    };

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal" style={{ maxWidth: 440, width: '95vw' }}>
                <div className="modal-hdr">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShieldAlert size={18} color={ThemeColor} />
                        <h3 style={{ color: ThemeColor }}>{title || (isDelete ? 'Confirm Deletion' : 'Admin Verification')}</h3>
                    </div>
                    <button className="modal-close" onClick={onClose}><X size={16} /></button>
                </div>

                <div className="modal-body">
                    <div style={{ background: ThemeBg, border: `1px solid ${ThemeBorder}`, borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                        {isDelete && <p style={{ fontSize: '0.875rem', color: ThemeText, fontWeight: 600, marginBottom: 4 }}>⚠ This action is irreversible!</p>}
                        <p style={{ fontSize: '0.815rem', color: ThemeText }}>
                            {description || 'Please enter the admin password to verify this action.'}
                        </p>
                    </div>

                    {error && (
                        <div style={{
                            background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c',
                            padding: '10px 12px', borderRadius: 8, fontSize: '0.85rem', display: 'flex', gap: 8, marginBottom: 16
                        }}>
                            <ShieldAlert size={16} className="shrink-0 mt-[2px]" />
                            {error}
                        </div>
                    )}

                    <div className="mf">
                        <label>Admin Password Required</label>
                        <div className="lf-wrap" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <span className="lf-icon-l" style={{ position: 'absolute', left: 12, color: '#94a3b8' }}><Lock size={14} /></span>
                            <input
                                type={showPwd ? 'text' : 'password'}
                                value={pwd}
                                onChange={e => setPwd(e.target.value)}
                                placeholder="Enter admin password"
                                autoFocus
                                onKeyDown={e => e.key === 'Enter' && pwd && handleConfirm()}
                                style={{
                                    width: '100%', padding: '10px 36px', borderRadius: 8,
                                    border: '1px solid var(--erp-border)', fontSize: '0.9rem'
                                }}
                            />
                            <span
                                className="lf-icon-r"
                                onClick={() => setShowPwd(s => !s)}
                                style={{ position: 'absolute', right: 12, color: '#94a3b8', cursor: 'pointer' }}
                            >
                                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, padding: 16, borderTop: '1px solid var(--erp-border)' }}>
                    <button className="btn btn-outline" onClick={onClose} style={{ padding: '8px 16px', borderRadius: 8 }}>Cancel</button>
                    <button
                        disabled={!pwd || loading}
                        onClick={handleConfirm}
                        style={{
                            background: ThemeColor, color: '#fff', border: 'none', borderRadius: 8,
                            padding: '8px 18px', fontWeight: 600,
                            cursor: !pwd || loading ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.875rem',
                            opacity: !pwd || loading ? 0.7 : 1, transition: 'all 0.2s'
                        }}
                    >
                        {loading
                            ? <><Loader2 size={16} className="spin" /> Processing…</>
                            : isDelete ? <><Trash2 size={16} /> Authorize Delete</> : <><ShieldAlert size={16} /> Confirm Action</>
                        }
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ActionModal;
