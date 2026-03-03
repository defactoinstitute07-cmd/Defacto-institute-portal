import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Sparkles, Calendar, BookOpen, Clock, Loader2, CheckCircle2, Lock,
    UserCircle, DoorClosed, Save
} from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import ToastContainer, { useToast } from '../components/Toast';

// ── API helper
import { API_BASE_URL } from '../api/apiConfig';

const API = () => axios.create({
    baseURL: `${API_BASE_URL}/api`,
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
});

const getDynamicClasses = () => {
    try {
        const settings = JSON.parse(localStorage.getItem('instituteSettings'));
        if (settings && settings.classesOffered && settings.classesOffered.length) {
            return settings.classesOffered;
        }
    } catch (e) { }
    return ['Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6', 'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12'];
};

const TimetableGrid = ({ days, timeSlots, classroom, occupancy, generatedSchedule }) => {
    const getOccupant = (day, time) => occupancy?.[classroom]?.[day]?.[time] || null;
    const isGenerated = (day, time) => generatedSchedule.some(s => s.day === day && s.time === time);

    return (
        <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 12, border: '1px solid var(--erp-border)', padding: 16 }}>
            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.8rem', minWidth: 700 }}>
                <thead>
                    <tr>
                        <th style={{ padding: '10px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', width: 80, textAlign: 'left', fontWeight: 700 }}>
                            TIME
                        </th>
                        {days.map(day => (
                            <th key={day} style={{
                                padding: '10px', background: '#f8fafc', borderBottom: '2px solid #e2e8f0',
                                color: 'var(--erp-primary)', fontWeight: 700, textAlign: 'center'
                            }}>
                                {day}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {timeSlots.map(time => (
                        <tr key={time}>
                            <td style={{
                                padding: '12px 10px', borderBottom: '1px solid #e2e8f0',
                                color: '#64748b', fontWeight: 600, whiteSpace: 'nowrap'
                            }}>
                                {time}
                            </td>
                            {days.map(day => {
                                const occupant = getOccupant(day, time);
                                const generated = isGenerated(day, time);
                                const locked = !!occupant;

                                return (
                                    <td key={day} style={{ borderBottom: '1px solid #e2e8f0', borderLeft: '1px solid #f1f5f9', padding: 0 }}>
                                        <div
                                            title={locked ? `Occupied by: ${occupant}` : generated ? 'AI Assigned Slot' : 'Available'}
                                            style={{
                                                width: '100%', height: 44,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: locked
                                                    ? '#f1f5f9'
                                                    : generated
                                                        ? 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)'
                                                        : 'transparent',
                                                color: generated ? '#fff' : 'inherit',
                                                fontWeight: 600,
                                                transition: 'all 0.2s',
                                                position: 'relative'
                                            }}
                                        >
                                            {locked ? (
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                                    <Lock size={12} color="#94a3b8" />
                                                    <span style={{ fontSize: '0.65rem', color: '#64748b' }}>{occupant}</span>
                                                </div>
                                            ) : generated ? (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                    <Sparkles size={14} color="#fff" />
                                                    <span style={{ fontSize: '0.75rem' }}>Assigned</span>
                                                </div>
                                            ) : (
                                                <span style={{ color: '#cbd5e1', fontSize: '0.7rem' }}>—</span>
                                            )}
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const AISchedulerPage = () => {
    const navigate = useNavigate();
    const { toasts, toast, removeToast } = useToast();

    const [config, setConfig] = useState({ days: [], timeSlots: [], classrooms: [] });
    const [batches, setBatches] = useState([]);
    const [selectedBatchId, setSelectedBatchId] = useState('');

    const [occupancy, setOccupancy] = useState({});
    const [generatedSchedule, setGeneratedSchedule] = useState([]);
    const [assignedClassroom, setAssignedClassroom] = useState('');
    const [assignedTeacher, setAssignedTeacher] = useState('');

    // UI states
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [loadingBatches, setLoadingBatches] = useState(true);
    const [loadingOccupancy, setLoadingOccupancy] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem('token')) { navigate('/login'); return; }

        // Load config
        API().get('/scheduler/config')
            .then(({ data }) => setConfig(data))
            .catch(() => toast.error('Failed to load scheduler config'))
            .finally(() => setLoadingConfig(false));

        // Load batches
        API().get('/batches')
            .then(({ data }) => {
                // Filter batches that don't have a full schedule or teacher/classroom
                const incompleteBatches = (data.batches || []).filter(b =>
                    !b.schedule?.length || !b.classroom || !b.teacher || b.teacher === 'Unassigned'
                );
                setBatches(incompleteBatches);
            })
            .catch(() => toast.error('Failed to load batches'))
            .finally(() => setLoadingBatches(false));

    }, [navigate]);

    // When classroom is assigned by AI, fetch occupancy for viewport
    useEffect(() => {
        if (!assignedClassroom) { setOccupancy({}); return; }
        setLoadingOccupancy(true);
        API().get('/batches/room-occupancy')
            .then(({ data }) => setOccupancy(data.occupancy))
            .catch(() => toast.error('Failed to load classroom occupancy'))
            .finally(() => setLoadingOccupancy(false));
    }, [assignedClassroom]);

    const handleGenerate = async () => {
        if (!selectedBatchId) return toast.warning('Please select a batch first.');

        setIsGenerating(true);
        setGeneratedSchedule([]);
        setAssignedClassroom('');
        setAssignedTeacher('');

        try {
            const { data } = await API().post('/scheduler/auto-batch', {
                batchId: selectedBatchId
            });

            setTimeout(() => {
                setGeneratedSchedule(data.schedule || []);
                setAssignedClassroom(data.classroom || '');
                setAssignedTeacher(data.teacher || '');
                toast.success('Smart timetable generated successfully! ✨');
                setIsGenerating(false);
            }, 800);

        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to generate schedule. No rooms available.');
            setIsGenerating(false);
        }
    };

    const handleSaveBatch = async () => {
        setIsSaving(true);
        try {
            // Fetch batch to update
            const batch = batches.find(b => b._id === selectedBatchId);

            // In a real app we'd trigger a password prompt if modify logic required it,
            // for simplicity here we simply assume the admin is authenticated.
            await API().put(`/batches/${selectedBatchId}`, {
                schedule: generatedSchedule,
                classroom: assignedClassroom,
                teacher: assignedTeacher
            });

            toast.success(`Batch "${batch?.name}" successfully scheduled and saved!`);

            // Remove from incomplete list
            setBatches(prev => prev.filter(b => b._id !== selectedBatchId));
            setSelectedBatchId('');
            setGeneratedSchedule([]);
            setAssignedClassroom('');
            setAssignedTeacher('');

        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to apply schedule.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ERPLayout title="AI Scheduler">
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            <div className="page-hdr">
                <div>
                    <h1>Intelligent Scheduler <Sparkles size={20} style={{ display: 'inline', color: '#8b5cf6', marginLeft: 8 }} /></h1>
                    <p>Automatically generate conflict-free timetables based on room availability and subject loads.</p>
                </div>
                <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={() => navigate('/batches')}>
                        <BookOpen size={16} /> Manage Batches
                    </button>
                </div>
            </div>

            {loadingConfig ? (
                <div className="loader-wrap"><div className="spinner" /><p>Loading engine…</p></div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2fr', gap: 24, alignItems: 'start' }}>

                    {/* Controls Panel */}
                    <div className="card" style={{ padding: 24, background: '#f8fafc', border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 20, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Calendar size={18} color="#6366f1" /> Configuration Box
                        </h3>

                        <div className="mf" style={{ marginBottom: 24 }}>
                            <label style={{ color: '#475569', fontWeight: 700 }}>1. Target Batch (Needing Schedule) *</label>
                            {loadingBatches ? (
                                <div style={{ fontSize: '0.8rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={14} className="spin" /> Loading batches...</div>
                            ) : batches.length === 0 ? (
                                <div style={{ fontSize: '0.8rem', color: '#16a34a', padding: '12px', background: '#dcfce7', borderRadius: 8, border: '1px solid #bbf7d0', textAlign: 'center' }}>
                                    All current batches are fully scheduled! 🎉
                                </div>
                            ) : (
                                <select value={selectedBatchId} onChange={e => { setSelectedBatchId(e.target.value); setGeneratedSchedule([]); setAssignedClassroom(''); setAssignedTeacher(''); }}
                                    style={{ background: '#fff', borderColor: '#cbd5e1', color: selectedBatchId ? '#0f172a' : '#94a3b8' }}>
                                    <option value="">Select an incomplete batch...</option>
                                    {batches.map(b => (
                                        <option key={b._id} value={b._id}>
                                            {b.name} ({b.course || 'No Course'}) - {b.subjects?.length || 0} Subjects
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>

                        <button
                            className="btn"
                            style={{
                                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                                background: isGenerating ? '#94a3b8' : 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                                color: '#fff', fontWeight: 800, fontSize: '0.9rem',
                                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8,
                                boxShadow: isGenerating ? 'none' : '0 4px 14px -4px rgba(99, 102, 241, 0.5)',
                                cursor: isGenerating ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                            }}
                            onClick={handleGenerate}
                            disabled={isGenerating || !selectedBatchId || batches.length === 0}
                        >
                            {isGenerating ? (
                                <><Loader2 size={16} className="spin" /> Computing optimal slots…</>
                            ) : (
                                <><Sparkles size={16} /> Auto-Assign & Generate</>
                            )}
                        </button>

                        {generatedSchedule.length > 0 && assignedClassroom && (
                            <div style={{ marginTop: 24, padding: '20px', background: '#312e81', borderRadius: 16, border: '1px solid #4338ca', color: '#fff', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 10px 25px -5px rgba(49, 46, 129, 0.3)' }}>
                                <div style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#818cf8', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Sparkles size={14} /> AI Recommendation
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: 8 }}>
                                        <DoorClosed size={16} color="#a5b4fc" style={{ marginBottom: 4 }} />
                                        <div style={{ fontSize: '0.65rem', color: '#a5b4fc', textTransform: 'uppercase' }}>Classroom</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{assignedClassroom}</div>
                                    </div>
                                    <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: 8 }}>
                                        <UserCircle size={16} color="#a5b4fc" style={{ marginBottom: 4 }} />
                                        <div style={{ fontSize: '0.65rem', color: '#a5b4fc', textTransform: 'uppercase' }}>Teacher</div>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{assignedTeacher}</div>
                                    </div>
                                </div>

                                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: 8, textAlign: 'center' }}>
                                    <Clock size={16} color="#a5b4fc" style={{ display: 'inline', marginBottom: -3 }} />
                                    <div style={{ fontSize: '1.2rem', fontWeight: 800, marginTop: 4 }}>{generatedSchedule.length} Slots</div>
                                    <div style={{ fontSize: '0.65rem', color: '#a5b4fc', textTransform: 'uppercase' }}>Generated</div>
                                </div>

                                <button
                                    onClick={handleSaveBatch}
                                    disabled={isSaving}
                                    style={{
                                        width: '100%', padding: '12px', borderRadius: 8, border: 'none', cursor: isSaving ? 'not-allowed' : 'pointer',
                                        background: isSaving ? 'rgba(255,255,255,0.5)' : '#fff', color: '#312e81', fontWeight: 800,
                                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, transition: 'all 0.2s'
                                    }}
                                >
                                    {isSaving ? <><Loader2 size={14} className="spin" /> Saving... </> : <><Save size={14} /> Apply to Batch</>}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Timetable View Panel */}
                    <div>
                        {loadingOccupancy ? (
                            <div className="card" style={{ padding: 40, textAlign: 'center', color: '#94a3b8', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                                <Loader2 size={32} className="spin" color="#6366f1" />
                                <p>Scanning room occupancy…</p>
                            </div>
                        ) : !assignedClassroom ? (
                            <div className="card" style={{ padding: 60, textAlign: 'center', color: '#94a3b8', background: '#f8fafc', border: '2px dashed #e2e8f0', boxShadow: 'none' }}>
                                <Clock size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                                <h3 style={{ fontSize: '1.2rem', color: '#64748b', marginBottom: 8 }}>Timetable Viewport</h3>
                                <p style={{ maxWidth: 300, margin: '0 auto', fontSize: '0.85rem' }}>Select a batch and generate a schedule to view its room availability matrix.</p>
                            </div>
                        ) : (
                            <div className="fadeIn">
                                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: 12, color: '#1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Live Availability: <span style={{ color: '#6366f1' }}>{assignedClassroom}</span></span>
                                    {generatedSchedule.length > 0 && (
                                        <span style={{ fontSize: '0.8rem', background: '#8b5cf6', color: '#fff', padding: '4px 10px', borderRadius: 20, fontWeight: 700 }}>
                                            AI Draft Active
                                        </span>
                                    )}
                                </h3>

                                <TimetableGrid
                                    days={config.days}
                                    timeSlots={config.timeSlots}
                                    classroom={assignedClassroom}
                                    occupancy={occupancy}
                                    generatedSchedule={generatedSchedule}
                                />

                                <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap', fontSize: '0.75rem', color: '#64748b', background: '#fff', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                        <span style={{ width: 14, height: 14, background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)', borderRadius: 4 }} />
                                        AI Recommended
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                        <span style={{ width: 14, height: 14, background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Lock size={8} color="#94a3b8" />
                                        </span>
                                        Occupied (Collision Detected)
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                                        <span style={{ color: '#cbd5e1' }}>—</span>
                                        Available Block
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </ERPLayout>
    );
};

export default AISchedulerPage;
