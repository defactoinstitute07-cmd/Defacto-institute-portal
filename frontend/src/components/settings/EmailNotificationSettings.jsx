import React, { useState, useEffect } from 'react';
import { Mail, Edit3, Save, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchEmailTemplates, updateEmailTemplate } from '../../api/adminApi';

const EmailNotificationSettings = ({ setAlert }) => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState(null);
    const [savingId, setSavingId] = useState(null);
    const [expandedIds, setExpandedIds] = useState([]);

    useEffect(() => {
        loadTemplates();
    }, []);

    const loadTemplates = async () => {
        setLoading(true);
        try {
            const { data } = await fetchEmailTemplates();
            setTemplates(data);
        } catch (err) {
            console.error("Error loading templates:", err);
            setAlert({ type: 'error', text: 'Failed to load email configurations.' });
        } finally {
            setLoading(false);
        }
    };

    const toggleExpand = (id) => {
        setExpandedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleUpdate = async (template) => {
        setSavingId(template._id);
        try {
            await updateEmailTemplate(template._id, {
                enabled: template.enabled,
                subject: template.subject,
                body: template.body
            });
            setEditingId(null);
            setAlert({ type: 'success', text: `Template "${template.displayName}" updated successfully!` });
        } catch (err) {
            setAlert({ type: 'error', text: 'Failed to update template.' });
        } finally {
            setSavingId(null);
        }
    };

    const toggleEnabled = async (template) => {
        const updatedTemplate = { ...template, enabled: !template.enabled };
        setTemplates(templates.map(t => t._id === template._id ? updatedTemplate : t));

        try {
            await updateEmailTemplate(template._id, { enabled: !template.enabled });
        } catch (err) {
            setAlert({ type: 'error', text: 'Failed to toggle notification.' });
            // Revert state on error
            setTemplates(templates.map(t => t._id === template._id ? template : t));
        }
    };

    if (loading) {
        return (
            <div className="card" style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
                <Loader2 className="spin" size={32} color="#3b82f6" />
            </div>
        );
    }

    return (
        <div className="card" style={{ padding: 32, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, borderBottom: '1px solid #e2e8f0', paddingBottom: 16 }}>
                <div style={{ padding: 12, background: '#f5f3ff', borderRadius: 12 }}>
                    <Mail size={24} color="#7c3aed" />
                </div>
                <div>
                    <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#1e293b' }}>Email Notification Templates</h2>
                    <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>Configure event triggers and customize email content using Handlebars tokens.</p>
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {templates.map(template => (
                    <div key={template._id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden' }}>
                        {/* Header/Toggle Section */}
                        <div style={{
                            padding: '16px 24px',
                            background: template.enabled ? '#fff' : '#f8fafc',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: expandedIds.includes(template._id) ? '1px solid #e2e8f0' : 'none'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                                <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 24, flexShrink: 0 }}>
                                    <input
                                        type="checkbox"
                                        checked={template.enabled}
                                        onChange={() => toggleEnabled(template)}
                                        style={{ opacity: 0, width: 0, height: 0 }}
                                    />
                                    <span style={{
                                        position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                                        backgroundColor: template.enabled ? '#10b981' : '#cbd5e1',
                                        transition: '.4s', borderRadius: 34
                                    }}>
                                        <span style={{
                                            position: 'absolute', content: '""', height: 16, width: 16, left: 4, bottom: 4,
                                            backgroundColor: 'white', transition: '.4s', borderRadius: '50%',
                                            transform: template.enabled ? 'translateX(20px)' : 'translateX(0)'
                                        }} />
                                    </span>
                                </label>
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '1rem', color: template.enabled ? '#1e293b' : '#94a3b8' }}>
                                        {template.displayName}
                                    </h4>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Trigger: {template.event}</span>
                                </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <button
                                    onClick={() => toggleExpand(template._id)}
                                    style={{ background: '#f1f5f9', border: 'none', padding: 8, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.85rem', color: '#475569' }}
                                >
                                    {expandedIds.includes(template._id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    {expandedIds.includes(template._id) ? 'Collapse' : 'Configure Template'}
                                </button>
                            </div>
                        </div>

                        {/* Editor Section */}
                        {expandedIds.includes(template._id) && (
                            <div style={{ padding: 24, background: '#fff' }}>
                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', color: '#475569', marginBottom: 8, fontWeight: '500' }}>Email Subject</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={template.subject}
                                        onChange={(e) => setTemplates(templates.map(t => t._id === template._id ? { ...t, subject: e.target.value } : t))}
                                        placeholder="Enter email subject..."
                                        style={{ width: '100%' }}
                                    />
                                </div>

                                <div style={{ marginBottom: 20 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                                        <label style={{ display: 'block', fontSize: '0.9rem', color: '#475569', fontWeight: '500' }}>Email Body (HTML/Handlebars)</label>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                            Available Tokens: {template.variables.map(v => `{{${v}}}`).join(', ')}
                                        </div>
                                    </div>
                                    <textarea
                                        rows={8}
                                        className="input"
                                        value={template.body}
                                        onChange={(e) => setTemplates(templates.map(t => t._id === template._id ? { ...t, body: e.target.value } : t))}
                                        style={{ width: '100%', fontFamily: 'monospace', fontSize: '13px', lineHeight: '1.5', resize: 'vertical' }}
                                    />
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button
                                        className="btn-primary"
                                        disabled={savingId === template._id}
                                        onClick={() => handleUpdate(template)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}
                                    >
                                        {savingId === template._id ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                                        {savingId === template._id ? 'Saving...' : 'Save Template'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EmailNotificationSettings;
