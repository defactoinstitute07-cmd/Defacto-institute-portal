import React from 'react';
import {
    X, User, ShieldCheck, Phone, Mail, MapPin, Calendar,
    GraduationCap, IndianRupee, BookOpen, Hash,
    Wallet, DownloadCloud, UserCircle2, Info, Building2
} from 'lucide-react';

const StudentProfileModal = ({ isOpen, onClose, student, onDownloadID }) => {
    if (!isOpen || !student) return null;

    const primaryColor = '#059669';
    const borderColor = '#e2e8f0';
    const sharpRadius = '10px';

    return (
        <div className="modal-overlay modal-full-overlay" style={{ background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(4px)' }} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal modal-full" style={{ background: '#f8fafc', borderRadius: '0px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

                {/* --- TOP NAVIGATION BAR --- */}
                <div style={{
                    padding: '12px 40px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#fff',
                    borderBottom: `1px solid ${borderColor}`,
                    zIndex: 10
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ padding: 6, background: primaryColor, borderRadius: '4px', color: '#fff' }}>
                            <GraduationCap size={18} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.05em' }}>STUDENT<span style={{ color: primaryColor }}> Profile</span></div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <button onClick={onClose} style={{
                            background: '#f1f5f9', border: 'none', borderRadius: '4px', width: 28, height: 28,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', cursor: 'pointer'
                        }}>
                            <X size={16} />
                        </button>
                    </div>
                </div>

                <div className="modal-body" style={{ padding: '40px', overflowY: 'auto', flex: 1 }}>
                    <div style={{ maxWidth: '1300px', margin: '0 auto' }}>

                        {/* --- TOP PROFILE HEADER CARD --- */}
                        <div style={{
                            background: '#fff',
                            borderRadius: sharpRadius,
                            border: `1px solid ${borderColor}`,
                            borderLeft: `4px solid ${primaryColor}`,
                            padding: '32px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '24px',
                            gap: '32px'
                        }}>
                            <div style={{ display: 'flex', gap: '32px', alignItems: 'center', width: '100%' }}>
                                <div style={{
                                    width: 100, height: 100, borderRadius: sharpRadius,
                                    background: '#f8fafc', overflow: 'hidden', flexShrink: 0,
                                    position: 'relative', border: `1px solid ${borderColor}`
                                }}>
                                    {student.profileImage ? (
                                        <img src={student.profileImage.startsWith('http') ? student.profileImage : `${API_BASE_URL}${student.profileImage}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>
                                            <User size={48} />
                                        </div>
                                    )}
                                </div>

                                <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                                        <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>{student.name}</h1>
                                        <span style={{
                                            padding: '2px 10px', borderRadius: '2px', fontSize: '0.6rem', fontWeight: 800,
                                            textTransform: 'uppercase', background: student.status === 'active' ? '#ecfdf5' : '#fff1f2',
                                            color: student.status === 'active' ? primaryColor : '#be123c',
                                            border: `1px solid ${student.status === 'active' ? '#d1fae5' : '#fecdd3'}`
                                        }}>
                                            {student.status || 'ACTIVE'}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px 32px', color: '#64748b', fontSize: '0.8rem', fontWeight: 600 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Hash size={14} className="text-emerald-500" /> ROLL: {student.rollNo}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><GraduationCap size={14} className="text-emerald-500" /> {student.className || 'General'}</div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Building2 size={14} className="text-emerald-500" /> BATCH: {student.batchId?.name || student.batchName || '—'}</div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', gap: 10 }}>
                                    <button onClick={() => onDownloadID(student)} style={{
                                        padding: '10px 20px', background: primaryColor, color: '#fff',
                                        borderRadius: sharpRadius, fontSize: '0.7rem', fontWeight: 800, border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: 8, textTransform: 'uppercase', letterSpacing: '0.05em'
                                    }}>
                                        <DownloadCloud size={14} /> Download ID
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* --- STATS GRID --- */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                            <StatCard label="Monthly Fee" value={`₹${(student.fees || 0).toLocaleString()}`} radius={sharpRadius} />
                            <StatCard label="Paid Amount" value={`₹${(student.feesPaid || 0).toLocaleString()}`} radius={sharpRadius} color={primaryColor} />
                            <StatCard label="Attendance" value="85%" radius={sharpRadius} />
                            <StatCard label="Enrollment Year" value={student.session?.split('-')[0] || '2026'} radius={sharpRadius} />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '32px' }}>

                            {/* --- LEFT MAIN CONTENT --- */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                                {/* Personal & Family Details */}
                                <div style={{ background: '#fff', borderRadius: sharpRadius, border: `1px solid ${borderColor}`, padding: '24px' }}>
                                    <SectionHeading title="Identity & Family Details" icon={UserCircle2} color={primaryColor} />
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
                                        <DetailItem label="DATE OF BIRTH" value={student.dob ? new Date(student.dob).toLocaleDateString() : '—'} icon={Calendar} />
                                        <DetailItem label="GENDER" value={student.gender || '—'} icon={User} />
                                        <DetailItem label="FATHER'S NAME" value={student.fatherName || '—'} icon={Info} />
                                        <DetailItem label="MOTHER'S NAME" value={student.motherName || '—'} icon={Info} />
                                        <DetailItem label="MOBILE NUMBER" value={student.contact || '—'} icon={Phone} />
                                        <DetailItem label="EMAIL ADDRESS" value={student.email || '—'} icon={Mail} />
                                        <DetailItem label="ADMISSION DATE" value={new Date(student.admissionDate || student.joinedAt).toLocaleDateString()} icon={Calendar} />
                                        <DetailItem label="ACADEMIC SESSION" value={student.session || '—'} icon={Calendar} />
                                        <DetailItem label="REGISTRATION FEE" value={`₹${student.registrationFee || 0}`} icon={IndianRupee} />
                                    </div>
                                </div>

                                {/* Academic Info Header Card Replication for consistency */}
                                <div style={{ background: '#fff', borderRadius: sharpRadius, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
                                    <div style={{ padding: '16px 24px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                                        <BookOpen size={16} color={primaryColor} />
                                        <h3 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Academic Enrollment</h3>
                                    </div>
                                    <div style={{ padding: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                        <SidebarInfo label="Assigned Course" value={student.className || 'General'} />
                                        <SidebarInfo label="Current Batch" value={student.batchId?.name || student.batchName || 'Unassigned'} />
                                        <div style={{ gridColumn: '1 / -1' }}>
                                            <p style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Enrollment Notes</p>
                                            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#475569', lineHeight: 1.5, background: '#f8fafc', padding: '12px', borderRadius: '4px', border: `1px solid ${borderColor}` }}>
                                                {student.notes || 'No internal notes provided for this student record.'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* --- RIGHT SIDEBAR --- */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                                {/* Financial Status */}
                                <div style={{ background: '#fff', borderRadius: sharpRadius, border: `1px solid ${borderColor}`, padding: '24px' }}>
                                    <SectionHeading title="Fee Status" icon={Wallet} color={primaryColor} />
                                    <div style={{ spaceY: '20px' }}>
                                        <SidebarInfo label="Subscription Amount" value={`₹${(student.fees || 0).toLocaleString()} / month`} />
                                        <SidebarInfo label="Amount Disbursed" value={`₹${(student.feesPaid || 0).toLocaleString()}`} />
                                        <div style={{ marginTop: '20px', padding: '10px', background: student.feesPaid >= student.fees ? '#ecfdf5' : '#fef2f2', borderRadius: '2px', border: `1px solid ${student.feesPaid >= student.fees ? '#d1fae5' : '#fca5a5'}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {student.feesPaid >= student.fees ? <ShieldCheck size={14} color={primaryColor} /> : <Info size={14} color="#dc2626" />}
                                            <span style={{ fontSize: '0.65rem', fontWeight: 900, color: student.feesPaid >= student.fees ? primaryColor : '#dc2626', textTransform: 'uppercase' }}>
                                                {student.feesPaid >= student.fees ? 'Fully Reconciled' : 'Pending Dues'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Address Info */}
                                <div style={{ background: '#fff', borderRadius: sharpRadius, border: `1px solid ${borderColor}`, padding: '24px' }}>
                                    <SectionHeading title="Residence" icon={MapPin} color={primaryColor} />
                                    <div>
                                        <p style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>Full Address</p>
                                        <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.5 }}>{student.address || '—'}</p>
                                    </div>
                                </div>

                                {/* Administrative Actions */}
                                <div style={{ background: '#0f172a', borderRadius: sharpRadius, padding: '24px', color: '#fff' }}>
                                    <h3 style={{ fontSize: '0.65rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', marginBottom: '20px', letterSpacing: '0.1em' }}>Student Control Panel</h3>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <SideAction text="View Full History" icon={ChevronRight} radius={sharpRadius} />
                                        <SideAction text="Payment Receipt" icon={ChevronRight} radius={sharpRadius} />
                                        <SideAction text="Restrict Access" color="#f87171" icon={Info} radius={sharpRadius} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Subcomponents ---

const StatCard = ({ label, value, radius, color }) => (
    <div style={{
        background: '#fff', padding: '20px', borderRadius: radius, border: '1px solid #e2e8f0',
        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
    }}>
        <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>{label}</div>
        <div style={{ fontSize: '1.8rem', fontWeight: 900, color: color || '#0f172a', lineHeight: 1 }}>{value}</div>
    </div>
);

const SectionHeading = ({ title, icon: Icon, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: '20px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' }}>
        <Icon size={16} color={color} />
        <h3 style={{ fontSize: '0.75rem', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</h3>
    </div>
);

const DetailItem = ({ label, value, icon: Icon }) => (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ padding: 8, background: '#f8fafc', borderRadius: '4px', color: '#94a3b8' }}>
            <Icon size={14} />
        </div>
        <div>
            <div style={{ fontSize: '0.6rem', color: '#94a3b8', fontWeight: 800, marginBottom: '2px', textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: '0.8rem', color: '#1e293b', fontWeight: 700 }}>{value}</div>
        </div>
    </div>
);

const SidebarInfo = ({ label, value }) => (
    <div style={{ marginBottom: '16px' }}>
        <p style={{ fontSize: '0.6rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</p>
        <p style={{ fontSize: '0.85rem', fontWeight: 800, color: '#1e293b' }}>{value}</p>
    </div>
);

const SideAction = ({ text, color, icon: Icon, radius }) => (
    <button style={{
        width: '100%', padding: '12px 16px', borderRadius: radius, border: 'none',
        background: 'rgba(255,255,255,0.05)', color: color || '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer'
    }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{text}</span>
        <Icon size={14} />
    </button>
);

const ChevronRight = ({ size }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="m9 18 6-6-6-6" />
    </svg>
);

export default StudentProfileModal;
