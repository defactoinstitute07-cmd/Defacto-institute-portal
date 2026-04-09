import React, { useState, useEffect } from 'react';
import { X, BookOpen, Loader2 } from 'lucide-react';
import apiClient from '../../api/apiConfig';

const getChapterSuggestions = (subject) => {
    const chapters = Array.isArray(subject?.chapters) ? subject.chapters : [];
    const seen = new Set();
    const statusWeight = {
        ongoing: 0,
        upcoming: 1,
        completed: 2
    };

    return chapters
        .filter((chapter) => String(chapter?.name || '').trim())
        .map((chapter) => ({
            name: String(chapter.name).trim(),
            status: String(chapter?.status || 'upcoming').trim().toLowerCase()
        }))
        .filter((chapter) => {
            const key = chapter.name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        })
        .sort((left, right) => {
            const leftWeight = statusWeight[left.status] ?? 99;
            const rightWeight = statusWeight[right.status] ?? 99;
            if (leftWeight !== rightWeight) return leftWeight - rightWeight;
            return left.name.localeCompare(right.name);
        });
};

const CreateTestModal = ({ onClose, onSave }) => {
    const [classLevels, setClassLevels] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [chapterSuggestions, setChapterSuggestions] = useState([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        name: '', classLevel: '', subject: '', subjectId: '', chapter: '',
        totalMarks: 20, passingMarks: 15, date: ''
    });

    useEffect(() => {
        apiClient.get('/subjects', { params: { activeOnly: true } })
            .then(({ data }) => {
                const levels = Array.from(new Set((data.subjects || []).map((item) => String(item.classLevel || 'General').trim() || 'General')));
                setClassLevels(levels.sort((a, b) => a.localeCompare(b)));
            })
            .catch(() => setClassLevels([]));
    }, []);

    const handleClassLevelChange = async (classLevel) => {
        setForm(f => ({ ...f, classLevel, subject: '', subjectId: '', chapter: '' }));
        setChapterSuggestions([]);
        if (!classLevel) {
            setSubjects([]);
            return;
        }

        try {
            const { data } = await apiClient.get('/subjects', {
                params: {
                    activeOnly: true,
                    classLevel
                }
            });
            setSubjects(data.subjects || []);
        } catch (_error) {
            setSubjects([]);
        }
    };

    const handleSubjectChange = (subjectId) => {
        const selected = subjects.find((item) => String(item._id) === String(subjectId));
        const nextSuggestions = getChapterSuggestions(selected);
        setChapterSuggestions(nextSuggestions);
        setForm((prev) => ({
            ...prev,
            subjectId,
            subject: selected?.name || '',
            chapter: nextSuggestions.some((chapter) => chapter.name === prev.chapter) ? prev.chapter : ''
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        try {
            if (!form.classLevel) {
                setError('Please select class level first.');
                return;
            }

            if (!form.subjectId || !form.subject) {
                setError('Please select a subject for the selected class level.');
                return;
            }

            const { data } = await apiClient.post('/exams', form);
            onSave(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create test.');
        } finally { setSaving(false); }
    };

    // Reusable Style for Inputs
    const inputStyle = {
        width: '100%',
        padding: '10px 12px',
        borderRadius: '8px',
        border: '1.5px solid #e2e8f0',
        fontSize: '0.9rem',
        outline: 'none',
        transition: 'all 0.2s ease',
        boxSizing: 'border-box',
        background: '#fff',
        color: '#1e293b'
    };

    const labelStyle = {
        display: 'block',
        marginBottom: '6px',
        fontSize: '0.82rem',
        fontWeight: '600',
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.025em'
    };

    return (
        <div style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(15, 23, 42, 0.8)', 
            backdropFilter: 'blur(8px)', 
            zIndex: 1000, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            padding: 20 
        }}
        onClick={e => e.target === e.currentTarget && onClose()}>
            
            <div style={{ 
                width: '100%', 
                maxWidth: 540, 
                background: '#ffffff', 
                borderRadius: '16px', 
                overflow: 'hidden', 
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)',
                border: '1px solid #e2e8f0' 
            }}>
                
                {/* Header */}
                <div style={{ 
                    background: '#0f172a', 
                    padding: '24px 28px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    borderBottom: '4px solid #3b82f6' // Accent bottom border
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <div style={{ 
                            width: 46, 
                            height: 46, 
                            borderRadius: '12px', 
                            background: 'rgba(59, 130, 246, 0.15)', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            border: '1px solid rgba(59, 130, 246, 0.3)'
                        }}>
                            <BookOpen size={24} color="#60a5fa" />
                        </div>
                        <div>
                            <h2 style={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem', margin: 0 }}>Create New Test</h2>
                            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', margin: 0 }}>Define test parameters and schedule</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ 
                        background: 'rgba(255,255,255,0.05)', 
                        border: '1px solid rgba(255,255,255,0.1)', 
                        borderRadius: '8px', 
                        color: '#fff', 
                        padding: '8px 12px', 
                        cursor: 'pointer', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 8, 
                        fontSize: '0.75rem', 
                        fontWeight: 600 
                    }}>
                        <X size={16} /> ESC
                    </button>
                </div>

                <form onSubmit={handleSubmit} style={{ padding: '32px' }}>
                    {error && (
                        <div style={{ 
                            background: '#fef2f2', 
                            color: '#dc2626', 
                            padding: '12px 16px', 
                            borderRadius: '8px', 
                            marginBottom: 20, 
                            fontSize: '0.85rem',
                            border: '1px solid #fee2e2',
                            fontWeight: '500'
                        }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'grid', gap: 20 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                                <label style={labelStyle}>Class Level *</label>
                                <select style={inputStyle} value={form.classLevel} onChange={e => handleClassLevelChange(e.target.value)} required>
                                    <option value="">Select Class Level</option>
                                    {classLevels.map(level => <option key={level} value={level}>{level}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={labelStyle}>Subject *</label>
                                <select style={inputStyle} value={form.subjectId} onChange={e => handleSubjectChange(e.target.value)} required disabled={!form.classLevel}>
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
                            <div>
                                <label style={labelStyle}>Test Name *</label>
                                <input style={inputStyle} type="text" placeholder="e.g. Unit Test 1" value={form.name}
                                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                            </div>
<div>
    <label style={labelStyle}>Chapter *</label>
    <select
        style={inputStyle}
        value={form.chapter}
        onChange={e => setForm(f => ({ ...f, chapter: e.target.value }))}
        required
    >
        {/* Default Placeholder Option */}
        <option value="" disabled>
            {chapterSuggestions.length > 0 ? 'Select a chapter' : 'No chapters available'}
        </option>

        {/* Mapped Dropdown Options */}
        {chapterSuggestions.map((chapter) => {
            const statusLabel = chapter.status === 'ongoing' 
                ? 'Ongoing' 
                : chapter.status === 'upcoming' 
                    ? 'Upcoming' 
                    : 'Completed';

            return (
                <option 
                    key={`${chapter.name}-${chapter.status}`} 
                    value={chapter.name}
                >
                    {chapter.name} - {statusLabel}
                </option>
            );
        })}
    </select>
</div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
                            <div>
                                <label style={labelStyle}>Total Marks</label>
                                <input style={inputStyle} type="number" value={form.totalMarks} min={1}
                                    onChange={e => setForm(f => ({ ...f, totalMarks: e.target.value }))} required />
                            </div>
                            <div>
                                <label style={labelStyle}>Passing</label>
                                <input style={inputStyle} type="number" value={form.passingMarks} min={0}
                                    onChange={e => setForm(f => ({ ...f, passingMarks: e.target.value }))} required />
                            </div>
                            <div>
                                <label style={labelStyle}>Test Date</label>
                                <input style={inputStyle} type="date" value={form.date}
                                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                            </div>
                        </div>
                    </div>

                    <div style={{ 
                        marginTop: 32, 
                        display: 'flex', 
                        justifyContent: 'flex-end', 
                        gap: 12, 
                        borderTop: '1px solid #f1f5f9', 
                        paddingTop: 24 
                    }}>
                        <button 
                            type="button" 
                            onClick={onClose}
                            style={{ 
                                padding: '10px 20px', 
                                borderRadius: '8px', 
                                border: '1px solid #e2e8f0', 
                                background: 'transparent', 
                                color: '#64748b', 
                                fontWeight: '600', 
                                cursor: 'pointer',
                                fontSize: '0.9rem'
                            }}>
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={saving}
                            style={{ 
                                padding: '10px 24px', 
                                borderRadius: '8px', 
                                border: 'none', 
                                background: '#3b82f6', 
                                color: 'white', 
                                fontWeight: '600', 
                                cursor: saving ? 'not-allowed' : 'pointer',
                                fontSize: '0.9rem',
                                boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                            {saving ? <Loader2 size={18} className="animate-spin" /> : 'Create Test'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateTestModal;
