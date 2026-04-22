import React, { useState } from 'react';
import { X, Download, Loader2, AlertCircle, CheckCircle2, History } from 'lucide-react';
import apiClient from '../../api/apiConfig';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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

            // 1. Initialize Workbook & Worksheet
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Marks History');

            // 2. Define Columns Header
            const headerRow = ['Student Name', 'Roll No', 'Batch'];
            const examColIndices = []; // Track which columns are exams (for styling)

            exams.forEach((exam, idx) => {
                const dateStr = new Date(exam.date).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                });
                const headerText = `${exam.subject} (${exam.name})`;
                headerRow.push(headerText);
                examColIndices.push(idx + 4); // Columns are 1-indexed, starting from D (4)
            });

            worksheet.addRow(headerRow);

            // 3. Populate Rows
            students.forEach(student => {
                const rowData = [
                    student.name,
                    student.rollNo || 'N/A',
                    student.batchId?.name || 'Unassigned'
                ];

                exams.forEach(exam => {
                    const result = results.find(r =>
                        String(r.studentId) === String(student._id) &&
                        String(r.examId) === String(exam._id)
                    );

                    if (result) {
                        // Store numeric value for conditional formatting
                        rowData.push(result.isPresent ? result.marksObtained : 0);
                    } else {
                        rowData.push(null); // or 0
                    }
                });

                worksheet.addRow(rowData);
            });

            // 4. Advanced Styling & Formatting

            // A. Freeze Top Row & First Column
            worksheet.views = [{ state: 'frozen', xSplit: 1, ySplit: 1, topLeftCell: 'B2', activePane: 'bottomRight' }];

            // B. Header Styling (Dark Blue, White Bold)
            const firstRow = worksheet.getRow(1);
            firstRow.font = { name: 'Arial', family: 4, size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
            firstRow.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FF1E3A8A' } // Dark Blue (Slate 800)
            };
            firstRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            firstRow.height = 75;

            // C. Auto Column Widths
            worksheet.columns.forEach((column, i) => {
                let maxLength = 0;
                column.eachCell({ includeEmpty: true }, (cell) => {
                    const columnLength = cell.value ? cell.value.toString().length : 10;
                    if (columnLength > maxLength) {
                        maxLength = columnLength;
                    }
                });
                column.width = Math.min(Math.max(maxLength + 2, 12), 40); // Between 12 and 40
            });

            // D. Center Align Marks Columns
            examColIndices.forEach(colIndex => {
                worksheet.getColumn(colIndex).alignment = { horizontal: 'center' };

                // E. Conditional Formatting (apply to column range from row 2 onwards)
                const colLetter = worksheet.getColumn(colIndex).letter;
                const range = `${colLetter}2:${colLetter}${students.length + 1}`;

                worksheet.addConditionalFormatting({
                    ref: range,
                    rules: [
                        // Excellent (Green): 15 - 20
                        {
                            type: 'cellIs',
                            operator: 'between',
                            formulae: [15, 20],
                            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFBBF7D0' } }, font: { color: { argb: 'FF166534' } } },
                        },
                        // OK (Yellow): 10 - 14.99
                        {
                            type: 'cellIs',
                            operator: 'between',
                            formulae: [10, 14.99],
                            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFDF9C4' } }, font: { color: { argb: 'FF854D0E' } } },
                        },
                        // Low (Red): < 10
                        {
                            type: 'cellIs',
                            operator: 'lessThan',
                            formulae: [10],
                            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFECDD3' } }, font: { color: { argb: 'FF991B1B' } } },
                        }
                    ]
                });
            });

            // 5. Generate and Download
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Marks_History_${selectedLevel.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);

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
