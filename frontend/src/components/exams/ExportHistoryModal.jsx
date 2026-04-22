import React, { useState } from 'react';
import { X, Download, Loader2, AlertCircle, CheckCircle2, History } from 'lucide-react';
import apiClient from '../../api/apiConfig';
import * as XLSX from 'xlsx';

const ExportHistoryModal = ({ onClose, classLevels }) => {
    const [selectedLevel, setSelectedLevel] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleExport = async () => {
        if (!selectedLevel) {
            setError('Please select a class level.');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const { data } = await apiClient.get(`/exams/export/history/${selectedLevel}`);
            const { students, exams, results } = data;

            if (!students || students.length === 0) {
                setError('No students found for this class level.');
                setLoading(false);
                return;
            }

            if (!exams || exams.length === 0) {
                setError('No exams found for this class level.');
                setLoading(false);
                return;
            }

            // Prepare Excel Data
            const rows = students.map(student => {
                const row = {
                    'Student Name': student.name,
                    'Roll No': student.rollNo || 'N/A',
                    'Batch': student.batchId?.name || 'Unassigned'
                };

                exams.forEach(exam => {
                    const result = results.find(r => 
                        r.studentId.toString() === student._id.toString() && 
                        r.examId.toString() === exam._id.toString()
                    );
                    
                    const examKey = `${exam.name} (${new Date(exam.date).toLocaleDateString('en-IN')})`;
                    if (result) {
                        row[examKey] = result.isPresent ? `${result.marksObtained} / ${exam.totalMarks}` : 'ABSENT';
                    } else {
                        row[examKey] = 'N/A';
                    }
                });

                return row;
            });

            // Create Workbook
            const worksheet = XLSX.utils.json_to_sheet(rows);
            
            // Apply some basic styling (widths)
            const colWidths = [
                { wch: 25 }, // Name
                { wch: 15 }, // Roll No
                { wch: 20 }, // Batch
            ];
            
            exams.forEach(() => {
                colWidths.push({ wch: 25 });
            });
            worksheet['!cols'] = colWidths;

            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Marks History');

            // Download
            XLSX.writeFile(workbook, `Marks_History_${selectedLevel.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
            
            setSuccess(true);
            setTimeout(() => {
                onClose();
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to export data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
            <div className="card" style={{ width: '90%', maxWidth: 450, padding: 0, overflow: 'hidden', animation: 'modalEntry 0.3s ease-out' }}>
                <style>{`
                    @keyframes modalEntry {
                        from { transform: scale(0.95); opacity: 0; }
                        to { transform: scale(1); opacity: 1; }
                    }
                `}</style>
                <div style={{ padding: '20px 24px', background: 'var(--erp-primary)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ background: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 8 }}>
                            <History size={20} />
                        </div>
                        <div>
                            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>Export Marks History</h3>
                            <p style={{ margin: 0, fontSize: '0.75rem', opacity: 0.8, fontWeight: 600 }}>Download complete records in Excel format</p>
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', opacity: 0.8 }}><X size={20} /></button>
                </div>

                <div style={{ padding: 24 }}>
                    {error && (
                        <div style={{ background: '#fef2f2', color: '#dc2626', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 10, border: '1px solid #fee2e2' }}>
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    {success ? (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ background: '#f0fdf4', color: '#16a34a', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                                <CheckCircle2 size={32} />
                            </div>
                            <h4 style={{ fontWeight: 800, color: '#16a34a', marginBottom: 8 }}>Export Successful!</h4>
                            <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Your file is being downloaded...</p>
                        </div>
                    ) : (
                        <>
                            <div style={{ marginBottom: 24 }}>
                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8, letterSpacing: '0.05em' }}>Select Class Level</label>
                                <select 
                                    value={selectedLevel}
                                    onChange={(e) => setSelectedLevel(e.target.value)}
                                    style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.95rem', fontWeight: 600, color: '#1e293b', outline: 'none', transition: 'border-color 0.2s' }}
                                    disabled={loading}
                                >
                                    <option value="">-- Choose Class Level --</option>
                                    {classLevels.map(level => (
                                        <option key={level} value={level}>{level}</option>
                                    ))}
                                </select>
                                <p style={{ marginTop: 8, fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.5 }}>
                                    The export will include all students across all batches linked to this class level.
                                </p>
                            </div>

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button className="btn btn-outline" onClick={onClose} style={{ flex: 1 }} disabled={loading}>Cancel</button>
                                <button 
                                    className="btn btn-primary" 
                                    onClick={handleExport} 
                                    style={{ flex: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                                    disabled={loading || !selectedLevel}
                                >
                                    {loading ? <Loader2 size={18} className="spinner" /> : <Download size={18} />}
                                    {loading ? 'Preparing File...' : 'Download Excel'}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ExportHistoryModal;
