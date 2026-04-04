import React from 'react';
import {
    X,
    User,
    Mail,
    Smartphone,
    Calendar,
    GraduationCap,
    Hash
} from 'lucide-react';

const cardStyle = {
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0'
};

const DetailItem = ({ label, value, icon: Icon }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ padding: 8, background: '#f8fafc', borderRadius: '6px', color: '#94a3b8' }}>
            <Icon size={14} />
        </div>
        <div>
            <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, marginBottom: 2, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: 700 }}>{value}</div>
        </div>
    </div>
);

const TeacherProfileModal = ({ teacher, onClose, imgSrc }) => {
    if (!teacher) return null;

    return (
        <div
            className="modal-overlay modal-full-overlay"
            style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)' }}
            onClick={(event) => event.target === event.currentTarget && onClose()}
        >
            <div className="modal modal-full" style={{ background: '#f8fafc', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div
                    style={{
                        padding: '16px 32px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: '#fff',
                        borderBottom: '1px solid #e2e8f0'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ padding: 8, background: 'var(--erp-teacher)', borderRadius: '6px', color: '#fff' }}>
                            <GraduationCap size={18} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.05em' }}>
                                FACULTY PROFILE
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
                                Faculty details and employment record
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '6px',
                            width: 32,
                            height: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#64748b',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={16} />
                    </button>
                </div>

                <div className="modal-body" style={{ padding: '32px', overflowY: 'auto', flex: 1 }}>
                    <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gap: 24 }}>
                        <div
                            style={{
                                ...cardStyle,
                                padding: '28px',
                                display: 'flex',
                                flexWrap: 'wrap',
                                alignItems: 'center',
                                gap: 24
                            }}
                        >
                            <div
                                style={{
                                    width: 96,
                                    height: 96,
                                    borderRadius: '10px',
                                    background: '#f8fafc',
                                    overflow: 'hidden',
                                    border: '1px solid #e2e8f0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}
                            >
                                {teacher.profileImage ? (
                                    <img src={imgSrc(teacher.profileImage)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={teacher.name} />
                                ) : (
                                    <User size={44} color="#cbd5e1" />
                                )}
                            </div>

                            <div style={{ flex: 1, minWidth: 280 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                                    <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>{teacher.name}</h1>
                                    <span
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '999px',
                                            fontSize: '0.7rem',
                                            fontWeight: 800,
                                            textTransform: 'uppercase',
                                            background: teacher.status === 'active' ? '#ecfdf5' : '#fef2f2',
                                            color: teacher.status === 'active' ? '#047857' : '#b91c1c'
                                        }}
                                    >
                                        {teacher.status || 'active'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px 24px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600, marginTop: 10 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Mail size={14} /> {teacher.email || 'No email added'}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Smartphone size={14} /> {teacher.phone || 'No phone added'}</div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Hash size={14} /> {teacher.regNo || '--'}</div>
                                </div>
                            </div>
                        </div>

                        <div style={{ ...cardStyle, padding: '24px' }}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#0f172a', marginBottom: 20, letterSpacing: '0.05em' }}>
                                EMPLOYMENT & BACKGROUND
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
                                <DetailItem label="DOB" value={teacher.dob ? new Date(teacher.dob).toLocaleDateString() : '--'} icon={Calendar} />
                                <DetailItem label="Gender" value={teacher.gender || '--'} icon={User} />
                                <DetailItem label="Joining Date" value={teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : '--'} icon={Calendar} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TeacherProfileModal;
