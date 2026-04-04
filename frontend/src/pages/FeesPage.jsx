import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Search, Plus, Download, AlertCircle, Loader2, History, CreditCard, LineChart, Clock, Settings, Bell } from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import ReceiptPreviewModal from '../components/fees/ReceiptPreviewModal';
import RecordPaymentModal from '../components/fees/RecordPaymentModal';
import PaymentHistoryModal from '../components/fees/PaymentHistoryModal';
import CreateFeeModal from '../components/fees/CreateFeeModal';
import ReceiptSettingsModal from '../components/fees/ReceiptSettingsModal';
import ActionModal from '../components/common/ActionModal';
import apiClient, { API_BASE_URL } from '../api/apiConfig';
import { hasClientSession } from '../utils/authSession';

const monthOptions = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const fmt = (value) => (Number(value) || 0).toLocaleString('en-IN');
const BRAND_PRIMARY = [25, 52, 102]; // #193466
const BRAND_SECONDARY = [255, 197, 15]; // #FFC50F

const FeesPage = () => {
    const navigate = useNavigate();
    const adminRaw = localStorage.getItem('admin') || '{}';
    const admin = JSON.parse(adminRaw);
    const adminName = admin.adminName || 'Admin';
    const [fees, setFees] = useState([]);
    const [metrics, setMetrics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [batchId, setBatchId] = useState('');
    const [course, setCourse] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [batches, setBatches] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [modal, setModal] = useState(false);
    const [selFee, setSelFee] = useState(null);
    const [genForm, setGenForm] = useState({ month: '', year: String(new Date().getFullYear()), dueDate: '' });
    const [receiptConfig, setReceiptConfig] = useState(null);
    const [previewPdf, setPreviewPdf] = useState({ isOpen: false, blobUrl: null, filename: '' });
    const [actionState, setActionState] = useState({ isOpen: false, type: 'verify', title: '', desc: '', onConfirm: null, loading: false, error: '' });
    const [watermarkUrl, setWatermarkUrl] = useState('');

    const loadBatches = async () => {
        try {
            const { data } = await apiClient.get('/batches');
            setBatches(Array.isArray(data.batches) ? data.batches : []);
        } catch (_error) {
            setBatches([]);
        }
    };

    const loadMetrics = async () => {
        try {
            const { data } = await apiClient.get('/fees/metrics');
            setMetrics(data);
        } catch (_error) {
            setMetrics(null);
        }
    };

    const load = useCallback(async () => {
        if (!hasClientSession(['admin'])) {
            navigate('/login');
            return;
        }

        setLoading(true);
        try {
            const params = {
                search,
                page,
                status: status === 'all' ? '' : status,
                batchId,
                course,
                month,
                year,
                limit: 5
            };
            const { data } = await apiClient.get('/fees', { params });
            if (page === 1) setFees(data.fees || []);
            else {
                setFees((prev) => {
                    const existingIds = new Set(prev.map((fee) => fee._id));
                    const nextFees = (data.fees || []).filter((fee) => !existingIds.has(fee._id));
                    return [...prev, ...nextFees];
                });
            }
            setTotalPages(data.pages || 1);
            setTotal(data.total || 0);
        } catch (error) {
            if (error.response?.status === 401) navigate('/login');
        } finally {
            setLoading(false);
        }
    }, [batchId, course, month, navigate, page, search, status, year]);

    useEffect(() => {
        loadBatches();
        loadMetrics();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [search, status, batchId, course, month, year]);

    useEffect(() => {
        load();
        const saved = JSON.parse(localStorage.getItem('instituteSettings') || '{}');
        if (saved.receiptSettings) setReceiptConfig(saved.receiptSettings);
    }, [load]);

    useEffect(() => {
        const timer = setTimeout(() => { if (search) load(); }, 400);
        return () => clearTimeout(timer);
    }, [load, search]);

    useEffect(() => {
        const candidates = [
            '/assets/watermark/watermark.png',
            '/assets/watermark/watermark.jpg',
            '/assets/watermark/watermark.jpeg',
            '/assets/watermark/watermark.webp',
            '/assets/watermark/watermark.svg'
        ];

        let cancelled = false;

        const loadWatermark = async () => {
            for (const path of candidates) {
                try {
                    const response = await fetch(path, { method: 'HEAD' });
                    if (response.ok) {
                        if (!cancelled) setWatermarkUrl(path);
                        return;
                    }
                } catch (_error) {
                    // Continue checking alternate file extensions.
                }
            }
            if (!cancelled) setWatermarkUrl('');
        };

        loadWatermark();

        return () => {
            cancelled = true;
        };
    }, []);

    const generateReceipt = async (feeData, paymentData, previewOnly = false) => {
        const doc = new jsPDF();
        const student = feeData.studentId || {};
        const paymentAmount = Number(paymentData.paidAmount || paymentData.amount || 0);
        const receiptNo = paymentData.receiptNo || 'N/A';
        const settings = JSON.parse(localStorage.getItem('instituteSettings') || '{}');
        const logoPath = settings.instituteLogo || admin.instituteLogo || '';
        const logoUrl = logoPath && /^(https?:|data:|blob:)/i.test(logoPath)
            ? logoPath
            : (logoPath ? `${API_BASE_URL}${logoPath}` : '');

        const loadImageDataUrl = (src, alpha = 1) => new Promise((resolve, reject) => {
            const image = new Image();
            image.crossOrigin = 'anonymous';
            image.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = image.naturalWidth;
                    canvas.height = image.naturalHeight;
                    const context = canvas.getContext('2d');
                    if (!context) {
                        reject(new Error('Canvas context unavailable'));
                        return;
                    }
                    context.globalAlpha = alpha;
                    context.drawImage(image, 0, 0);
                    resolve({ dataUrl: canvas.toDataURL('image/png'), width: image.naturalWidth, height: image.naturalHeight });
                } catch (error) {
                    reject(error);
                }
            };
            image.onerror = () => reject(new Error('Watermark image could not be loaded'));
            image.src = src;
        });

        const buildTextImage = (text, width = 175, height = 12) => {
            const canvas = document.createElement('canvas');
            canvas.width = width * 2;
            canvas.height = height * 2;
            const context = canvas.getContext('2d');
            if (!context) return null;

            context.scale(2, 2);
            context.clearRect(0, 0, width, height);
            context.fillStyle = '#475569';
            context.font = '10px Noto Sans Devanagari, Mangal, Arial, sans-serif';
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            context.fillText(text, width / 2, height / 2);

            return canvas.toDataURL('image/png');
        };

        if (watermarkUrl) {
            try {
                const watermark = await loadImageDataUrl(watermarkUrl, 0.4);
                const maxWidth = 120;
                const maxHeight = 120;
                const ratio = Math.min(maxWidth / watermark.width, maxHeight / watermark.height);
                const drawWidth = watermark.width * ratio;
                const drawHeight = watermark.height * ratio;
                const x = (210 - drawWidth) / 2;
                const y = (297 - drawHeight) / 2;
                doc.addImage(watermark.dataUrl, 'PNG', x, y, drawWidth, drawHeight, undefined, 'FAST');
            } catch (_error) {
                // Skip watermark if file is unavailable or unreadable.
            }
        }

        doc.setFillColor(...BRAND_PRIMARY);
        doc.rect(0, 0, 210, 30, 'F');

        if (logoUrl) {
            try {
                const logoImage = await loadImageDataUrl(logoUrl);
                const maxLogoSize = 16;
                const logoRatio = Math.min(maxLogoSize / logoImage.width, maxLogoSize / logoImage.height);
                const logoWidth = logoImage.width * logoRatio;
                const logoHeight = logoImage.height * logoRatio;
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(10, 7, 18, 18, 2, 2, 'F');
                doc.addImage(logoImage.dataUrl, 'PNG', 11 + (16 - logoWidth) / 2, 8 + (16 - logoHeight) / 2, logoWidth, logoHeight, undefined, 'FAST');
            } catch (_error) {
                // Continue without logo if load fails.
            }
        }

        doc.setTextColor(...BRAND_SECONDARY);
        doc.setFontSize(18);
        doc.text((settings.coachingName || 'ERP ACADEMY').toUpperCase(), 105, 12, { align: 'center' });
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.text('Fee Payment Receipt', 105, 20, { align: 'center' });

        // Right-side payout icon aligned with receipt title level.
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(178, 8, 24, 18, 2, 2, 'F');
        doc.setDrawColor(...BRAND_PRIMARY);
        doc.setLineWidth(0.7);
        doc.roundedRect(181, 11, 14, 10, 1.5, 1.5, 'S');
        doc.circle(192, 16, 1.6, 'S');
        doc.setTextColor(...BRAND_PRIMARY);
        doc.setFontSize(8);
        doc.text('Rs', 184.5, 20);

        doc.setTextColor(...BRAND_PRIMARY);
        doc.text(`Receipt No: ${receiptNo}`, 14, 36);
        doc.text(`Date: ${new Date(paymentData.date || Date.now()).toLocaleDateString('en-IN')}`, 150, 36);
        doc.text(`Student: ${student.name || 'N/A'}`, 14, 46);
        doc.text(`Roll No: ${student.rollNo || 'N/A'}`, 14, 54);
        doc.text(`Batch: ${feeData.batchId?.name || 'N/A'}`, 14, 62);

        doc.setDrawColor(...BRAND_SECONDARY);
        doc.setLineWidth(0.8);
        doc.line(14, 67, 196, 67);

        autoTable(doc, {
            startY: 74,
            head: [['Fee Type', 'Amount']],
            body: [
                [`Tuition Fee (${feeData.month} ${feeData.year})`, fmt(feeData.monthlyTuitionFee || 0)],
                ['Registration Fee', fmt(feeData.registrationFee || 0)],
                ['Late Fine', fmt(feeData.fine || 0)],
                ['Payment Received', fmt(paymentAmount)],
                ['Pending Balance', fmt(Math.max(Number(feeData.totalFee || 0) - Number(feeData.amountPaid || 0), 0))]
            ],
            headStyles: {
                fillColor: BRAND_PRIMARY,
                textColor: BRAND_SECONDARY
            },
            styles: {
                textColor: BRAND_PRIMARY,
                lineColor: [226, 232, 240],
                lineWidth: 0.1
            }
        });

        const footerY = Math.min(Math.max((doc.lastAutoTable?.finalY || 230) + 16, 252), 274);
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text(`This fee receipt has been generated by Defacto's new ERP system.`, 105, footerY, { align: 'center' });

       

        doc.setTextColor(...BRAND_PRIMARY);
        doc.text(`Authorized by Admin: Mr ${adminName}`, 105, footerY + 18, { align: 'center' });

        if (previewOnly) return doc.output('bloburl');
        doc.save(`Receipt_${receiptNo}.pdf`);
        return null;
    };

    const confirmPayment = async (formData, password) => {
        setActionState((prev) => ({ ...prev, loading: true, error: '' }));
        try {
            const { data } = await apiClient.post(`/fees/${selFee._id}/pay`, { ...formData, adminPassword: password });
            const feeForReceipt = data.fee || { ...selFee, amountPaid: Number(selFee.amountPaid || 0) + Number(formData.amountPaid || 0) };
            const previewUrl = await generateReceipt(
                feeForReceipt,
                { ...formData, amount: formData.amountPaid, receiptNo: data.receiptNo, date: new Date() },
                true
            );
            setPreviewPdf({ isOpen: true, blobUrl: previewUrl, filename: `Receipt_${data.receiptNo}.pdf` });
            setActionState((prev) => ({ ...prev, isOpen: false }));
            setModal(false);
            load();
            loadMetrics();
        } catch (error) {
            setActionState((prev) => ({ ...prev, loading: false, error: error.response?.data?.message || 'Payment failed' }));
        }
    };

    const handleRecordPayment = async (formData) => {
        setActionState({
            isOpen: true,
            type: 'verify',
            title: 'Authorize Payment',
            desc: `Record a payment of Rs ${formData.amountPaid} for ${selFee.studentId?.name}.`,
            onConfirm: (password) => confirmPayment(formData, password),
            loading: false,
            error: ''
        });
    };

    const confirmCreateFee = async (formData, password) => {
        setActionState((prev) => ({ ...prev, loading: true, error: '' }));
        try {
            await apiClient.post('/fees', { ...formData, adminPassword: password });
            setActionState((prev) => ({ ...prev, isOpen: false }));
            setModal(false);
            load();
            loadMetrics();
        } catch (error) {
            setActionState((prev) => ({ ...prev, loading: false, error: error.response?.data?.message || 'Fee creation failed' }));
        }
    };

    const handleCreateFee = async (formData) => {
        setActionState({
            isOpen: true,
            type: 'verify',
            title: 'Authorize Fee Creation',
            desc: 'Create a manual fee record for the selected student.',
            onConfirm: (password) => confirmCreateFee(formData, password),
            loading: false,
            error: ''
        });
    };

    const confirmBulkGeneration = async (password) => {
        setActionState((prev) => ({ ...prev, loading: true, error: '' }));
        try {
            await apiClient.post('/fees/generate', { ...genForm, adminPassword: password });
            setActionState((prev) => ({ ...prev, isOpen: false }));
            setModal(false);
            load();
            loadMetrics();
        } catch (error) {
            setActionState((prev) => ({ ...prev, loading: false, error: error.response?.data?.message || 'Bulk generation failed' }));
        }
    };

    const generate = (event) => {
        event.preventDefault();
        setActionState({
            isOpen: true,
            type: 'warning',
            title: 'Authorize Bulk Generation',
            desc: `Generate fees for all active students for ${genForm.month} ${genForm.year}.`,
            onConfirm: (password) => confirmBulkGeneration(password),
            loading: false,
            error: ''
        });
    };

    const handleRemindOverdue = () => {
        setActionState({
            isOpen: true,
            type: 'warning',
            title: 'Send Overdue Reminders',
            desc: 'Send reminders to students with overdue fee records.',
            onConfirm: async (password) => {
                setActionState((prev) => ({ ...prev, loading: true, error: '' }));
                try {
                    await apiClient.post('/fees/remind-overdue', { adminPassword: password });
                    setActionState((prev) => ({ ...prev, isOpen: false }));
                    alert('Reminders sent successfully');
                } catch (error) {
                    setActionState((prev) => ({ ...prev, loading: false, error: error.response?.data?.message || 'Reminder operation failed' }));
                }
            },
            loading: false,
            error: ''
        });
    };

    const exportData = () => {
        if (fees.length === 0) return;
        const rows = [['Student Name', 'Roll No', 'Batch', 'Month', 'Year', 'Status', 'Total Amount', 'Paid Amount', 'Pending Amount'].join(',')];
        fees.forEach((fee) => {
            rows.push([
                `"${fee.studentId?.name || 'Deactivated'}"`,
                `"${fee.studentId?.rollNo || 'N/A'}"`,
                `"${fee.batchId?.name || 'N/A'}"`,
                fee.month,
                fee.year,
                fee.status,
                fee.totalFee || 0,
                fee.amountPaid || 0,
                fee.pendingAmount || 0
            ].join(','));
        });
        const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `Fees_Export_${new Date().toISOString().slice(0, 10)}.csv`;
        anchor.click();
    };

    const stats = [
        { label: `Pending Dues (${metrics?.pendingStudents || 0})`, value: `Rs ${fmt(metrics?.totalPending)}`, icon: Clock },
        { label: 'Overdue Dues', value: `Rs ${fmt(metrics?.overdueAmount)}`, icon: AlertCircle }
    ];

    return (
        <ERPLayout title="Fee Management">
            <div className="fees-page-shell">
                {watermarkUrl && <img src={watermarkUrl} alt="Watermark" className="fees-page-watermark" loading="lazy" />}
                <div className="space-y-6 fees-page-content">
                <div className="page-hdr" style={{ marginTop: 8 }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--erp-primary)' }}>Fee Management</h1>
                        <p style={{ fontSize: '0.95rem', color: '#64748b' }}>Manage fee records, payments, and reminders.</p>
                    </div>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <button className="btn btn-outline" onClick={exportData}><Download size={16} /> Export CSV</button>
                        <button className="btn btn-outline" onClick={handleRemindOverdue}><Bell size={16} /> Remind Overdue</button>
                        <button className="btn btn-outline" onClick={() => setModal('receiptSettings')}><Settings size={16} /> Receipt Settings</button>
                        <button className="btn btn-outline" onClick={() => setModal('generate')}><Plus size={16} /> Bulk Generate</button>
                        <button className="btn btn-primary" onClick={() => setModal('create')}><Plus size={16} /> Create Fee</button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {stats.map((stat) => (
                        <div key={stat.label} className="card" style={{ padding: 20 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div style={{ width: 42, height: 42, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--erp-primary)' }}>
                                    <stat.icon size={20} />
                                </div>
                                <div>
                                    <div className="td-sm">{stat.label}</div>
                                    <div className="td-bold" style={{ fontSize: '1.1rem' }}>{stat.value}</div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <div className="tb-search-wrap" style={{ flex: 1, minWidth: 220 }}>
                            <Search size={15} />
                            <input className="tb-search" placeholder="Search students..." value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                        <select className="tb-select" value={month} onChange={(e) => setMonth(e.target.value)}>
                            <option value="">Month</option>
                            {monthOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <select className="tb-select" value={year} onChange={(e) => setYear(e.target.value)}>
                            <option value="">Year</option>
                            {[new Date().getFullYear(), new Date().getFullYear() - 1].map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <select className="tb-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                            <option value="">Status</option>
                            <option value="all">All</option>
                            <option value="pending">Pending</option>
                            <option value="partial">Partial</option>
                            <option value="paid">Paid</option>
                            <option value="overdue">Overdue</option>
                        </select>
                        <select className="tb-select" value={batchId} onChange={(e) => setBatchId(e.target.value)}>
                            <option value="">Batch</option>
                            {batches.map((batch) => <option key={batch._id} value={batch._id}>{batch.name}</option>)}
                        </select>
                        <input className="tb-search" style={{ minWidth: 180 }} placeholder="Course" value={course} onChange={(e) => setCourse(e.target.value)} />
                    </div>
                </div>

                <div className="card">
                    {loading && page === 1 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                            <Loader2 size={28} className="animate-spin mb-3" />
                            <p className="font-medium">Loading fee records...</p>
                        </div>
                    ) : (
                        <div className="erp-table-wrap">
                            <table className="erp-table stackable">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th>Period</th>
                                        <th>Financials</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {fees.length === 0 ? (
                                        <tr><td colSpan="5" className="py-10 text-center text-sm font-medium text-slate-500">No fee records found.</td></tr>
                                    ) : fees.map((fee) => (
                                        <tr key={fee._id}>
                                            <td data-label="Student">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                                    <div className="tb-avatar overflow-hidden border border-slate-200" style={{ width: 34, height: 34, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        {fee.studentId?.profileImage ? <img src={fee.studentId.profileImage.startsWith('http') ? fee.studentId.profileImage : `${API_BASE_URL}${fee.studentId.profileImage}`} alt="" className="w-full h-full object-cover" /> : <span className="text-slate-400 font-bold">{fee.studentId?.name?.charAt(0)}</span>}
                                                    </div>
                                                    <div>
                                                        <div className="td-bold">{fee.studentId?.name || 'Deactivated'}</div>
                                                        <div className="td-sm">{fee.studentId?.rollNo} | {fee.batchId?.name}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td data-label="Period"><div className="td-bold">{fee.month} {fee.year}</div></td>
                                            <td data-label="Financials">
                                                <div className="td-bold">Rs {fmt(fee.totalFee || 0)}</div>
                                                <div className="td-sm">Paid: Rs {fmt(fee.amountPaid)} | Remaining: Rs {fmt(fee.pendingAmount)}</div>
                                            </td>
                                            <td data-label="Status"><span className={`badge ${fee.status === 'paid' ? 'badge-active' : fee.status === 'overdue' ? 'badge-overdue' : ''}`}>{fee.status}</span></td>
                                            <td data-label="Actions">
                                                <div className="flex gap-2">
                                                    <button className="btn btn-outline btn-sm" onClick={() => { setSelFee(fee); setModal('history'); }} title="History"><History size={13} /></button>
                                                    {fee.status !== 'paid' && <button className="btn btn-primary btn-sm" onClick={() => { setSelFee(fee); setModal('payment'); }} title="Pay"><CreditCard size={13} /></button>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {fees.length > 0 && page < totalPages && (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button className="btn btn-outline" disabled={loading} onClick={() => setPage((current) => current + 1)}>Load More</button>
                    </div>
                )}
            </div>
            </div>

            {modal === 'payment' && selFee && <RecordPaymentModal fee={selFee} onClose={() => setModal(false)} onSave={handleRecordPayment} />}
            {modal === 'history' && selFee && <PaymentHistoryModal fee={selFee} onClose={() => setModal(false)} onViewReceipt={async (payment) => { setModal(false); const url = await generateReceipt(selFee, payment, true); setPreviewPdf({ isOpen: true, blobUrl: url, filename: `Receipt_${payment.receiptNo}.pdf` }); }} />}
            {modal === 'create' && <CreateFeeModal onClose={() => setModal(false)} onSave={handleCreateFee} />}
            {modal === 'receiptSettings' && <ReceiptSettingsModal isOpen initialSettings={receiptConfig} onClose={() => setModal(false)} onSave={(settings) => setReceiptConfig(settings)} />}

            {modal === 'generate' && (
                <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && setModal(false)}>
                    <div className="modal" style={{ maxWidth: 460 }}>
                        <div style={{ padding: '24px', background: 'var(--erp-primary)', color: '#fff' }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>Bulk Fee Generation</h2>
                            <p style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: 4 }}>Generate fees for all active students</p>
                        </div>
                        <form onSubmit={generate}>
                            <div className="modal-body" style={{ padding: '24px' }}>
                                <div className="mf-row">
                                    <div className="mf"><label>Month</label><select value={genForm.month} onChange={(e) => setGenForm({ ...genForm, month: e.target.value })} required><option value="">Select Month</option>{monthOptions.map((month) => <option key={month} value={month}>{month}</option>)}</select></div>
                                    <div className="mf"><label>Year</label><input value={genForm.year} onChange={(e) => setGenForm({ ...genForm, year: e.target.value })} required /></div>
                                </div>
                                <div className="mf"><label>Due Date</label><input type="date" value={genForm.dueDate} onChange={(e) => setGenForm({ ...genForm, dueDate: e.target.value })} required /></div>
                            </div>
                            <div className="modal-footer" style={{ padding: '16px 24px', background: 'var(--erp-bg2)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
                                <button type="button" className="btn btn-outline" onClick={() => setModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Generate Fees</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ReceiptPreviewModal isOpen={previewPdf.isOpen} onClose={() => setPreviewPdf({ ...previewPdf, isOpen: false })} blobUrl={previewPdf.blobUrl} filename={previewPdf.filename} onDownload={() => { const link = document.createElement('a'); link.href = previewPdf.blobUrl; link.download = previewPdf.filename; link.click(); }} />

            <ActionModal isOpen={actionState.isOpen} onClose={() => setActionState((prev) => ({ ...prev, isOpen: false }))} onConfirm={actionState.onConfirm} title={actionState.title} description={actionState.desc} actionType={actionState.type} loading={actionState.loading} error={actionState.error} />
        </ERPLayout>
    );
};

export default FeesPage;
