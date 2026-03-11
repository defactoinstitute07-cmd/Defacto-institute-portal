import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Loader2, MessageCircle, Search, Send, Smartphone, Users, X } from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import AlertMessage from '../components/common/AlertMessage';
import { fetchNotificationHistory, fetchNotificationRecipients, sendAdminNotifications } from '../api/notificationApi';

const STATUS_STYLES = {
    sent: { background: '#ecfdf5', color: '#047857' },
    partial: { background: '#fff7ed', color: '#c2410c' },
    failed: { background: '#fef2f2', color: '#b91c1c' },
    logged: { background: '#eff6ff', color: '#1d4ed8' },
    pending: { background: '#f8fafc', color: '#475569' }
};

const formatDeliveryType = (deliveryType) => {
    if (deliveryType === 'both') return 'Push + WhatsApp';
    if (deliveryType === 'push') return 'Mobile Push';
    if (deliveryType === 'whatsapp') return 'WhatsApp';
    return deliveryType;
};

const getNotificationReason = (entry) => {
    const reasons = [];

    if (entry.pushResult?.error) {
        reasons.push(`Push: ${entry.pushResult.error}`);
    }

    if (entry.whatsappResult?.error) {
        reasons.push(`WhatsApp: ${entry.whatsappResult.error}`);
    }

    if (reasons.length > 0) {
        return reasons.join(' | ');
    }

    if (entry.status === 'logged') {
        return 'Provider credentials are not configured, so this notification was logged instead of sent.';
    }

    if (entry.status === 'sent') {
        return 'Delivered successfully.';
    }

    return 'No additional details recorded.';
};

const cardStyle = { padding: 24 };
const inputStyle = {
    width: '100%',
    border: '1px solid #dbe2ea',
    borderRadius: 6,
    padding: '14px 16px',
    outline: 'none',
    background: '#fff'
};

const NotificationsPage = () => {
    const [alert, setAlert] = useState(null);
    const [message, setMessage] = useState('');
    const [studentSearch, setStudentSearch] = useState('');
    const [sendToAll, setSendToAll] = useState(false);
    const [deliveryMethods, setDeliveryMethods] = useState({ push: true, whatsapp: false });
    const [recipients, setRecipients] = useState([]);
    const [recipientMeta, setRecipientMeta] = useState({ total: 0 });
    const [selectedRecipients, setSelectedRecipients] = useState([]);
    const [history, setHistory] = useState([]);
    const [loadingRecipients, setLoadingRecipients] = useState(true);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [sending, setSending] = useState(false);

    const selectedIds = useMemo(() => selectedRecipients.map((student) => student._id), [selectedRecipients]);
    const activeDeliveryMethods = useMemo(
        () => Object.entries(deliveryMethods).filter(([, enabled]) => enabled).map(([method]) => method),
        [deliveryMethods]
    );

    const loadRecipients = async (searchTerm = '') => {
        setLoadingRecipients(true);
        try {
            const { data } = await fetchNotificationRecipients({ search: searchTerm, limit: 30 });
            setRecipients(data.students || []);
            setRecipientMeta({ total: data.total || 0 });
        } catch (error) {
            setAlert({ type: 'error', text: error.response?.data?.message || 'Failed to load students for notifications.' });
        } finally {
            setLoadingRecipients(false);
        }
    };

    const loadHistory = async () => {
        setLoadingHistory(true);
        try {
            const { data } = await fetchNotificationHistory({ limit: 25 });
            setHistory(data.notifications || []);
        } catch (error) {
            setAlert({ type: 'error', text: error.response?.data?.message || 'Failed to load notification history.' });
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => { loadHistory(); }, []);

    useEffect(() => {
        const timer = setTimeout(() => loadRecipients(studentSearch), 250);
        return () => clearTimeout(timer);
    }, [studentSearch]);

    const toggleRecipient = (student) => {
        setSelectedRecipients((prev) => {
            const exists = prev.some((item) => item._id === student._id);
            return exists ? prev.filter((item) => item._id !== student._id) : [...prev, student];
        });
    };

    const toggleSelectVisible = () => {
        const visibleIds = recipients.map((student) => student._id);
        const allVisibleSelected = recipients.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
        if (allVisibleSelected) {
            setSelectedRecipients((prev) => prev.filter((student) => !visibleIds.includes(student._id)));
            return;
        }
        setSelectedRecipients((prev) => {
            const existingIds = new Set(prev.map((student) => student._id));
            return [...prev, ...recipients.filter((student) => !existingIds.has(student._id))];
        });
    };

    const toggleMethod = (method) => setDeliveryMethods((prev) => ({ ...prev, [method]: !prev[method] }));

    const handleSend = async (event) => {
        event.preventDefault();
        if (!message.trim()) return setAlert({ type: 'error', text: 'Write a message before sending notifications.' });
        if (activeDeliveryMethods.length === 0) return setAlert({ type: 'error', text: 'Select at least one delivery method.' });
        if (!sendToAll && selectedIds.length === 0) return setAlert({ type: 'error', text: 'Select one or more students, or choose all students.' });

        setSending(true);
        setAlert(null);
        try {
            const { data } = await sendAdminNotifications({
                message: message.trim(),
                sendToAll,
                studentIds: selectedIds,
                deliveryMethods: activeDeliveryMethods
            });
            const problemNotifications = (data.notifications || []).filter((entry) => entry.status === 'failed' || entry.status === 'partial' || entry.status === 'logged');
            const firstReason = problemNotifications.length > 0 ? getNotificationReason(problemNotifications[0]) : '';

            setAlert({
                type: data.summary.failed > 0 || data.summary.partial > 0 ? 'warning' : 'success',
                text: `Processed ${data.summary.total}: ${data.summary.sent} sent, ${data.summary.logged} logged, ${data.summary.partial} partial, ${data.summary.failed} failed.${firstReason ? ` Reason: ${firstReason}` : ''}`
            });
            setMessage('');
            if (!sendToAll) setSelectedRecipients([]);
            await loadHistory();
        } catch (error) {
            setAlert({ type: 'error', text: error.response?.data?.message || 'Failed to send notifications.' });
        } finally {
            setSending(false);
        }
    };

    return (
        <ERPLayout title="Notifications">
            <div className="page-hdr" style={{ marginBottom: 24 }}>
                <div>
                    <h1>Notifications</h1>
                    <p>Send mobile push alerts, WhatsApp messages, or both to one student, many students, or the full active roster.</p>
                </div>
            </div>

            {alert && <AlertMessage type={alert.type} message={alert.text} style={{ marginBottom: 20 }} />}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.5fr) minmax(280px, 0.9fr)', gap: 24, marginBottom: 24 }} className="nt-layout">
                <div className="card" style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 6, background: 'rgba(91,87,217,0.12)', color: 'var(--erp-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bell size={18} /></div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#111827' }}>Compose Notification</h2>
                            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.88rem' }}>Choose recipients, write a message, and dispatch through push, WhatsApp, or both.</p>
                        </div>
                    </div>

                    <form onSubmit={handleSend} style={{ display: 'grid', gap: 18 }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, color: '#111827' }}>Message</label>
                            <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={6} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Write the announcement, reminder, or update you want students to receive." />
                        </div>

                        <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center', marginBottom: 10 }} className="nt-stack">
                                <div>
                                    <div style={{ fontWeight: 700, color: '#111827' }}>Recipients</div>
                                    <div style={{ color: '#6b7280', fontSize: '0.84rem', marginTop: 4 }}>Supports single, multiple, or all active students.</div>
                                </div>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#111827' }}>
                                    <input type="checkbox" checked={sendToAll} onChange={(event) => setSendToAll(event.target.checked)} />
                                    <span>All active students</span>
                                </label>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #dbe2ea', borderRadius: 6, padding: '0 14px', marginBottom: 10 }}>
                                <Search size={16} color="#6b7280" />
                                <input type="text" value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder="Search by name, roll number, class, or WhatsApp number" style={{ ...inputStyle, border: 'none', padding: '14px 0', boxShadow: 'none', background: 'transparent' }} disabled={sendToAll} />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 10 }} className="nt-stack">
                                <span style={{ color: '#6b7280', fontSize: '0.84rem' }}>{sendToAll ? `All ${recipientMeta.total} active students selected` : `${selectedIds.length} selected`}</span>
                                <div style={{ display: 'inline-flex', gap: 12 }}>
                                    <button type="button" onClick={toggleSelectVisible} disabled={sendToAll || recipients.length === 0} style={{ border: 'none', background: 'transparent', color: 'var(--erp-primary)', fontWeight: 700, cursor: 'pointer' }}>Select filtered</button>
                                    <button type="button" onClick={() => setSelectedRecipients([])} disabled={sendToAll || selectedIds.length === 0} style={{ border: 'none', background: 'transparent', color: 'var(--erp-primary)', fontWeight: 700, cursor: 'pointer' }}>Clear</button>
                                </div>
                            </div>

                            <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, maxHeight: 320, overflowY: 'auto', background: '#fbfcfe', opacity: sendToAll ? 0.65 : 1 }}>
                                {loadingRecipients ? (
                                    <div style={{ padding: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#6b7280' }}><Loader2 size={18} className="spin" /> Loading active students...</div>
                                ) : recipients.length === 0 ? (
                                    <div style={{ padding: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#6b7280' }}><Users size={18} /> No students match the current search.</div>
                                ) : recipients.map((student) => {
                                    const checked = selectedIds.includes(student._id);
                                    return (
                                        <label key={student._id} style={{ display: 'grid', gridTemplateColumns: '18px minmax(0,1fr)', gap: 12, padding: '14px 16px', borderBottom: '1px solid #eef2f7', background: checked ? 'rgba(91,87,217,0.08)' : 'transparent', cursor: 'pointer' }}>
                                            <input type="checkbox" checked={sendToAll ? true : checked} onChange={() => toggleRecipient(student)} disabled={sendToAll} />
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#111827', marginBottom: 4 }}>{student.name}</div>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, color: '#6b7280', fontSize: '0.8rem' }}>
                                                    <span>{student.rollNo || 'No roll number'}</span>
                                                    <span>{student.className || 'General'}</span>
                                                    <span>{student.contact || 'No WhatsApp number'}</span>
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>

                            {!sendToAll && selectedRecipients.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 12 }}>
                                    {selectedRecipients.map((student) => (
                                        <button key={student._id} type="button" onClick={() => toggleRecipient(student)} style={{ border: 'none', borderRadius: 6, background: 'rgba(91,87,217,0.12)', color: '#312e81', padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 8, fontWeight: 700, cursor: 'pointer' }}>
                                            {student.name}
                                            <X size={14} />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label style={{ display: 'block', marginBottom: 8, fontWeight: 700, color: '#111827' }}>Delivery Methods</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14 }} className="nt-methods">
                                <button type="button" onClick={() => toggleMethod('push')} style={{ border: `1px solid ${deliveryMethods.push ? 'var(--erp-primary)' : '#dbe2ea'}`, boxShadow: deliveryMethods.push ? '0 0 0 3px rgba(91,87,217,0.12)' : 'none', background: '#fff', borderRadius: 6, padding: 16, display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left', cursor: 'pointer' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 6, background: '#f3f4f6', color: 'var(--erp-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Smartphone size={18} /></div>
                                    <div><strong style={{ display: 'block', color: '#111827', marginBottom: 6 }}>Mobile Push</strong><span style={{ color: '#6b7280', fontSize: '0.82rem' }}>Uses registered device tokens.</span></div>
                                </button>
                                <button type="button" onClick={() => toggleMethod('whatsapp')} style={{ border: `1px solid ${deliveryMethods.whatsapp ? 'var(--erp-primary)' : '#dbe2ea'}`, boxShadow: deliveryMethods.whatsapp ? '0 0 0 3px rgba(91,87,217,0.12)' : 'none', background: '#fff', borderRadius: 6, padding: 16, display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left', cursor: 'pointer' }}>
                                    <div style={{ width: 36, height: 36, borderRadius: 6, background: '#f3f4f6', color: 'var(--erp-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><MessageCircle size={18} /></div>
                                    <div><strong style={{ display: 'block', color: '#111827', marginBottom: 6 }}>WhatsApp</strong><span style={{ color: '#6b7280', fontSize: '0.82rem' }}>Uses the student WhatsApp number.</span></div>
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }} className="nt-stack">
                            <div style={{ color: '#6b7280', fontSize: '0.84rem' }}>{sendToAll ? `This send will target ${recipientMeta.total} active students.` : `Ready to notify ${selectedIds.length} selected student(s).`}</div>
                            <button type="submit" className="btn btn-primary" disabled={sending} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                                {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                                {sending ? 'Sending...' : 'Send Notification'}
                            </button>
                        </div>
                    </form>
                </div>

                <div className="card" style={cardStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 6, background: 'rgba(91,87,217,0.12)', color: 'var(--erp-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bell size={18} /></div>
                        <div>
                            <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#111827' }}>Dispatch Overview</h2>
                            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.88rem' }}>Records are stored in MongoDB and provider services can run live or in logged fallback mode.</p>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gap: 14 }}>
                        <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 16, display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: '#6b7280' }}>Active roster</span><strong style={{ color: '#111827' }}>{recipientMeta.total}</strong></div>
                        <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 16, display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: '#6b7280' }}>Selected recipients</span><strong style={{ color: '#111827' }}>{sendToAll ? 'All' : selectedIds.length}</strong></div>
                        <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 16, display: 'flex', justifyContent: 'space-between', gap: 12 }}><span style={{ color: '#6b7280' }}>Delivery mix</span><strong style={{ color: '#111827' }}>{activeDeliveryMethods.length === 2 ? 'Push + WhatsApp' : (activeDeliveryMethods[0] === 'push' ? 'Push only' : activeDeliveryMethods[0] === 'whatsapp' ? 'WhatsApp only' : 'None')}</strong></div>
                    </div>
                </div>
            </div>

            <div className="card" style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 6, background: 'rgba(91,87,217,0.12)', color: 'var(--erp-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Bell size={18} /></div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1.05rem', color: '#111827' }}>Notification History</h2>
                        <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: '0.88rem' }}>Latest notification records with recipient, delivery method, time sent, and status.</p>
                    </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                    <table className="erp-table stackable">
                        <thead>
                            <tr>
                                <th>Message</th>
                                <th>Delivery</th>
                                <th>Student</th>
                                <th>Time Sent</th>
                                <th>Status</th>
                                <th>Reason</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loadingHistory ? (
                                <tr><td colSpan="6" style={{ padding: 28, textAlign: 'center', color: '#6b7280' }}><Loader2 size={18} className="spin" style={{ marginRight: 8 }} /> Loading notification history...</td></tr>
                            ) : history.length === 0 ? (
                                <tr><td colSpan="6" style={{ padding: 28, textAlign: 'center', color: '#6b7280' }}>No notifications have been recorded yet.</td></tr>
                            ) : history.map((entry) => (
                                <tr key={entry._id}>
                                    <td data-label="Message" style={{ maxWidth: 360, fontWeight: 600, color: '#111827', lineHeight: 1.5 }}>{entry.message}</td>
                                    <td data-label="Delivery"><span style={{ display: 'inline-flex', borderRadius: 6, padding: '6px 10px', background: '#eef2ff', color: '#4338ca', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase' }}>{formatDeliveryType(entry.deliveryType)}</span></td>
                                    <td data-label="Student"><div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}><strong style={{ color: '#111827' }}>{entry.studentId?.name || 'Deleted student'}</strong><span style={{ color: '#6b7280', fontSize: '0.8rem' }}>{entry.studentId?.rollNo || 'No roll number'} - {entry.studentId?.className || 'General'}</span></div></td>
                                    <td data-label="Time Sent">{new Date(entry.createdAt).toLocaleString('en-IN')}</td>
                                    <td data-label="Status"><span style={{ display: 'inline-flex', borderRadius: 6, padding: '6px 10px', fontSize: '0.76rem', fontWeight: 800, textTransform: 'uppercase', ...(STATUS_STYLES[entry.status] || STATUS_STYLES.pending) }}>{entry.status}</span></td>
                                    <td data-label="Reason" style={{ minWidth: 260, color: '#6b7280', lineHeight: 1.45 }}>{getNotificationReason(entry)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <style>{`
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @media (max-width: 1024px) { .nt-layout { grid-template-columns: 1fr !important; } }
                @media (max-width: 768px) {
                    .nt-stack { flex-direction: column !important; align-items: flex-start !important; }
                    .nt-methods { grid-template-columns: 1fr !important; }
                }
            `}</style>
        </ERPLayout>
    );
};

export default NotificationsPage;

