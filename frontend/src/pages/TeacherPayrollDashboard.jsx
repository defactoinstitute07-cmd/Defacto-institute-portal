import React, { useState, useEffect } from 'react';
import {
    DollarSign, Users, Briefcase, Calendar, Plus, Save, Banknote, Trash2, Edit3, X,
    Loader2, Download, Lock, AlertTriangle, CheckCircle2, Building2, Smartphone, Coins,
    History, Info, ShieldCheck, User, FileText, QrCode, ArrowRight, Clock, IndianRupee
} from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import ERPLayout from '../components/ERPLayout';
import ToastContainer, { useToast } from '../components/Toast';
import ReceiptPreviewModal from '../components/fees/ReceiptPreviewModal';
import { API_BASE_URL } from '../api/apiConfig';
import apiClient from '../api/apiConfig';
import { hasClientSession } from '../utils/authSession';

// --- Theme Constants ---
const primaryColor = '#064e3b'; // Dark Emerald
const sharpRadius = '8px';
const borderColor = '#e2e8f0';
const headingColor = '#0f172a'; // Dark Slate

const StatCard = ({ title, value, icon: Icon, color, bg }) => (
    <div className="card" style={{ padding: 24, display: 'flex', alignItems: 'center', gap: 16, borderRadius: sharpRadius, border: `1px solid ${borderColor}` }}>
        <div style={{ width: 52, height: 52, borderRadius: sharpRadius, background: bg, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon size={24} />
        </div>
        <div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{title}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>{value}</div>
        </div>
    </div>
);

const TeacherPayrollDashboard = () => {
    const { toasts, toast, removeToast } = useToast();
    const [stats, setStats] = useState(null);
    const [salaries, setSalaries] = useState([]);
    const [teachers, setTeachers] = useState([]);

    // UI states
    const [loadingStats, setLoadingStats] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
    const [showGenerateConfirm, setShowGenerateConfirm] = useState(false);

    // Modals
    const [showPayModal, setShowPayModal] = useState(false);
    const [selectedSalary, setSelectedSalary] = useState(null);
    const [payData, setPayData] = useState({ paymentMethod: 'Bank Transfer', transactionId: '', notes: '', paidAmount: 0 });
    const [adminPassword, setAdminPassword] = useState('');
    const [payLoading, setPayLoading] = useState(false);
    const [selectedTeacherProfile, setSelectedTeacherProfile] = useState(null);

    // Receipt Preview
    const [previewPdf, setPreviewPdf] = useState({ isOpen: false, blobUrl: null, filename: '' });

    const fetchDashboard = (month) => {
        setLoadingStats(true);
        const query = month ? `?monthYear=${month}` : '';
        apiClient.get(`/payroll/dashboard${query}`)
            .then(res => setStats(res.data))
            .catch(() => toast.error('Failed to load payroll stats'))
            .finally(() => setLoadingStats(false));
    };

    const fetchSalaries = () => {
        apiClient.get(`/payroll/salaries?monthYear=${monthFilter}`)
            .then(res => setSalaries(res.data))
            .catch(() => toast.error('Failed to load salaries'));
    };

    useEffect(() => {
        if (!hasClientSession(['admin'])) return;
        fetchDashboard(monthFilter);
        apiClient.get('/teachers').then(res => setTeachers(res.data.teachers || [])).catch(console.error);
    }, []);

    useEffect(() => {
        if (!hasClientSession(['admin'])) return;
        fetchSalaries();
        fetchDashboard(monthFilter);
    }, [monthFilter]);

    const confirmGenerateSalaries = async () => {
        setIsGenerating(true);
        try {
            const res = await apiClient.post('/payroll/generate', { monthYear: monthFilter });
            toast.success(res.data.message);
            fetchDashboard(monthFilter);
            fetchSalaries();
            setShowGenerateConfirm(false);
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to generate salaries');
        } finally {
            setIsGenerating(false);
        }
    };

    const numberToWords = (num) => {
        const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
        const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
        const inWords = (n) => {
            if ((n = n.toString()).length > 9) return 'overflow';
            let nArr = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
            if (!nArr) return '';
            let str = '';
            str += nArr[1] != 0 ? (a[Number(nArr[1])] || b[nArr[1][0]] + ' ' + a[nArr[1][1]]) + 'crore ' : '';
            str += nArr[2] != 0 ? (a[Number(nArr[2])] || b[nArr[2][0]] + ' ' + a[nArr[2][1]]) + 'lakh ' : '';
            str += nArr[3] != 0 ? (a[Number(nArr[3])] || b[nArr[3][0]] + ' ' + a[nArr[3][1]]) + 'thousand ' : '';
            str += nArr[4] != 0 ? a[Number(nArr[4])] + 'hundred ' : '';
            str += nArr[5] != 0 ? ((str != '') ? 'and ' : '') + (a[Number(nArr[5])] || b[nArr[5][0]] + ' ' + a[nArr[5][1]]) : '';
            return str.toUpperCase();
        };
        return inWords(Math.floor(num)) + ' RUPEES ONLY';
    };

    const handleProcessPayment = async (e) => {
        e.preventDefault();
        if (!adminPassword.trim()) {
            toast.error('Admin password is required');
            return;
        }
        setPayLoading(true);
        try {
            await apiClient.post(`/payroll/pay/${selectedSalary._id}`, {
                adminPassword,
                ...payData
            });
            toast.success('Payment recorded successfully!');
            setShowPayModal(false);
            setAdminPassword('');
            fetchDashboard(monthFilter);
            fetchSalaries();
        } catch (e) {
            toast.error(e.response?.data?.message || 'Failed to process payment');
        } finally {
            setPayLoading(false);
        }
    };

    // Premium salary slip layout inspired by the provided design reference.
    const generateSalarySlip = async (salary, previewOnly = true) => {
        const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const monthYearText = new Date(`${salary.monthYear}-01`).toLocaleString('default', { month: 'long', year: 'numeric' });
        const settings = JSON.parse(localStorage.getItem('instituteSettings') || '{}');
        const employee = salary.teacherId || {};

        const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
        const valueOrDash = (val) => (val ? String(val) : '-');
        const paymentDateText = salary.paymentDate
            ? new Date(salary.paymentDate).toLocaleDateString('en-IN')
            : '-';

        const baseSalary = Number(salary.baseSalary || 0);
        const extraClassesAmount = Number(salary.extraClassesAmount || 0);
        const bonusAmount = Number(salary.bonusAmount || 0);
        const leaveDeductions = Number(salary.leaveDeductions || 0);
        const advanceDeductions = Number(salary.advanceDeductions || 0);
        const totalDeductions = leaveDeductions + advanceDeductions;
        const grossEarnings = baseSalary + extraClassesAmount + bonusAmount;
        const netSalary = Number(salary.netSalary || 0);

        const instituteName = settings.instituteName || 'INSTITUTE ERP';
        const instituteAddress = settings.instituteAddress || 'Main Campus, Education Hub';
        const institutePhone = settings.institutePhone || 'N/A';
        const instituteEmail = settings.instituteEmail || 'N/A';

        const logoSource = settings.instituteLogo
            ? (settings.instituteLogo.startsWith('http') ? settings.instituteLogo : `${API_BASE_URL}${settings.instituteLogo}`)
            : null;

        const getImageDataUrl = (url) => new Promise((resolve) => {
            if (!url) {
                resolve(null);
                return;
            }
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    resolve(null);
                    return;
                }
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png'));
            };
            img.onerror = () => resolve(null);
            img.src = url;
        });

        const logoDataUrl = await getImageDataUrl(logoSource);

        // Header band
        doc.setFillColor(6, 78, 59);
        doc.rect(10, 10, 190, 26, 'F');

        doc.setDrawColor(255, 255, 255);
        doc.setLineWidth(0.1);
        doc.roundedRect(13, 14, 14, 14, 1, 1, 'S');
        if (logoDataUrl) {
            try {
                doc.addImage(logoDataUrl, 'PNG', 14, 15, 12, 12);
            } catch (e) {
                doc.setTextColor(255, 255, 255);
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(10);
                doc.text('IG', 20, 23, { align: 'center' });
            }
        } else {
            doc.setTextColor(255, 255, 255);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text('IG', 20, 23, { align: 'center' });
        }

        doc.setTextColor(255, 255, 255);
        doc.setFont('times', 'bold');
        doc.setFontSize(13.5);
        doc.text(instituteName.toUpperCase(), 30, 18);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text(`${instituteAddress}  |  ${institutePhone}`, 30, 23);
        doc.text(instituteEmail, 30, 27.5);

        doc.setFillColor(9, 59, 46);
        doc.roundedRect(165, 14, 31, 14, 1, 1, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text('SALARY SLIP', 180.5, 18, { align: 'center' });
        doc.setFontSize(11);
        doc.text(monthYearText, 180.5, 23.5, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.8);
        doc.text(`Ref: EMP-${String(employee.regNo || 'N/A')}-${salary.monthYear.replace('-', '')}`, 180.5, 27, { align: 'center' });

        // Employee details
        let y = 45;
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.4);
        doc.text('EMPLOYEE DETAILS', 15, y);

        y += 5.5;
        const leftColumn = [
            ['Full Name', valueOrDash(employee.name)],
            ['Date of Joining', paymentDateText]
        ];
        const midColumn = [
            ['Employee ID', valueOrDash(employee.regNo)],
            ['Bank Account', valueOrDash(selectedTeacherProfile?.bankDetails?.accountNumber)]
        ];
        const rightMidColumn = [
            ['Designation', valueOrDash(employee.designation || employee.department || 'Faculty')],
            ['PAN Number', valueOrDash(selectedTeacherProfile?.bankDetails?.ifscCode)]
        ];
        const rightColumn = [
            ['Department', valueOrDash(employee.department || 'Academic')],
            ['Working Days', '26 / 26']
        ];

        const drawInfoPair = (label, val, x, rowY) => {
            doc.setTextColor(71, 85, 105);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.3);
            doc.text(label, x, rowY);
            doc.setTextColor(15, 23, 42);
            doc.setFont('times', 'bold');
            doc.setFontSize(8.6);
            doc.text(String(val), x, rowY + 3.7);
        };

        [0, 1].forEach((idx) => {
            const rowY = y + idx * 10;
            drawInfoPair(leftColumn[idx][0], leftColumn[idx][1], 15, rowY);
            drawInfoPair(midColumn[idx][0], midColumn[idx][1], 58, rowY);
            drawInfoPair(rightMidColumn[idx][0], rightMidColumn[idx][1], 101, rowY);
            drawInfoPair(rightColumn[idx][0], rightColumn[idx][1], 144, rowY);
        });

        // Earnings & deductions side by side
        y += 26;
        const earningsRows = [
            ['Basic Salary', money(baseSalary)],
            ['Extra Classes', money(extraClassesAmount)],
            ['Performance Bonus', money(bonusAmount)],
            ['Gross Earnings', money(grossEarnings)]
        ];
        const deductionRows = [
            ['Leave Deductions', money(leaveDeductions)],
            ['Advance Deductions', money(advanceDeductions)],
            ['Other Deductions', money(0)],
            ['Total Deductions', money(totalDeductions)]
        ];

        autoTable(doc, {
            startY: y,
            margin: { left: 15 },
            tableWidth: 85,
            theme: 'grid',
            head: [['EARNINGS', 'Amount (Rs.)']],
            body: earningsRows,
            styles: { fontSize: 7.2, cellPadding: 2.3, lineColor: [229, 231, 235], lineWidth: 0.1 },
            headStyles: { fillColor: [6, 78, 59], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
            columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 30, halign: 'right' } },
            didParseCell: (data) => {
                if (data.section === 'body' && data.row.index === earningsRows.length - 1) {
                    data.cell.styles.fillColor = [6, 78, 59];
                    data.cell.styles.textColor = [255, 255, 255];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });
        const earningsEndY = doc.lastAutoTable.finalY;

        autoTable(doc, {
            startY: y,
            margin: { left: 110 },
            tableWidth: 85,
            theme: 'grid',
            head: [['DEDUCTIONS', 'Amount (Rs.)']],
            body: deductionRows,
            styles: { fontSize: 7.2, cellPadding: 2.3, lineColor: [229, 231, 235], lineWidth: 0.1 },
            headStyles: { fillColor: [74, 29, 32], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'left' },
            columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 30, halign: 'right' } },
            didParseCell: (data) => {
                if (data.section === 'body' && data.row.index === deductionRows.length - 1) {
                    data.cell.styles.fillColor = [74, 29, 32];
                    data.cell.styles.textColor = [255, 255, 255];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });
        const deductionsEndY = doc.lastAutoTable.finalY;
        y = Math.max(earningsEndY, deductionsEndY) + 8;

        // Net salary strip
        doc.setFillColor(6, 78, 59);
        doc.rect(15, y, 180, 17, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('NET SALARY PAYABLE', 20, y + 6.5);
        doc.setFont('times', 'bold');
        doc.setFontSize(7.2);
        doc.text(numberToWords(netSalary).toLowerCase(), 20, y + 12);
        doc.setFont('times', 'bold');
        doc.setFontSize(16);
        doc.text(money(netSalary).replace('Rs. ', ''), 190, y + 11, { align: 'right' });

        // Bottom summary
        y += 24;
        doc.setTextColor(100, 116, 139);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.4);
        doc.text('Gross CTC / Month', 34, y);
        doc.text('Total Deductions', 92, y);
        doc.text('Payment Mode', 151, y);

        doc.setTextColor(15, 23, 42);
        doc.setFont('times', 'bold');
        doc.setFontSize(10.5);
        doc.text(money(grossEarnings), 34, y + 5.5, { align: 'center' });
        doc.text(money(totalDeductions), 92, y + 5.5, { align: 'center' });
        doc.text(valueOrDash(salary.paymentMethod || 'Bank Transfer'), 151, y + 5.5, { align: 'center' });

        // Signature block
        y += 22;
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.line(22, y, 62, y);
        doc.line(85, y, 125, y);
        doc.line(148, y, 188, y);

        doc.setTextColor(51, 65, 85);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.4);
        doc.text('Employee Signature', 42, y + 4.2, { align: 'center' });
        doc.text('HR Manager', 105, y + 4.2, { align: 'center' });
        doc.text('Authorized Signatory', 168, y + 4.2, { align: 'center' });

        doc.setTextColor(71, 85, 105);
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6);
        doc.text('This is a computer-generated pay slip and does not require a physical signature.', 105, 278, { align: 'center' });
        doc.text('Confidential - for the named employee only.', 105, 281.5, { align: 'center' });

        const filename = `Salary_Slip_${employee.name || 'Staff'}_${salary.monthYear}.pdf`;
        if (previewOnly) return { url: doc.output('bloburl'), filename };
        doc.save(filename);
    };

    const handleViewSlip = async (salary) => {
        setPreviewPdf({ isOpen: true, blobUrl: null, filename: '' });
        const { url, filename } = await generateSalarySlip(salary, true);
        setPreviewPdf({ isOpen: true, blobUrl: url, filename });
    };

    return (
        <ERPLayout title="Iron Ghost's Payroll">
            <style>{`
                @media (max-width: 640px) {
                    .payroll-hdr { flex-direction: column !important; align-items: flex-start !important; gap: 16px !important; }
                    .payroll-hdr .flex { width: 100% !important; flex-direction: column !important; }
                    .payroll-hdr button { width: 100% !important; justify-content: center !important; }
                    .payroll-stats { grid-template-columns: 1fr !important; }
                    .p-ledger-card { padding: 16px !important; }
                    .p-ledger-hdr { flex-direction: column !important; align-items: flex-start !important; gap: 12px !important; }
                    
                    /* Disburse Modal Responsive */
                    .d-modal { width: 100% !important; height: 100% !important; max-height: 100% !important; border-radius: 0 !important; }
                    .d-modal-header { padding: 16px 20px !important; }
                    .d-modal-body { padding: 20px !important; }
                    .d-footer { flex-direction: column-reverse !important; padding: 20px !important; }
                    .d-footer button { width: 100% !important; }
                    .payout-grid-2 { grid-template-columns: 1fr !important; }
                }

                .payout-card {
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 12px;
                    padding: 16px;
                }

                .payout-label {
                    display: block;
                    font-size: 0.7rem;
                    font-weight: 900;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.06em;
                    margin-bottom: 8px;
                }

                .payout-input,
                .payout-select,
                .payout-textarea {
                    width: 100%;
                    border: 1.5px solid #cbd5e1;
                    border-radius: 10px;
                    padding: 11px 12px;
                    background: #ffffff;
                    color: #0f172a;
                    font-size: 0.9rem;
                    font-weight: 600;
                    outline: none;
                    transition: border-color 0.2s ease, box-shadow 0.2s ease;
                }

                .payout-input:focus,
                .payout-select:focus,
                .payout-textarea:focus {
                    border-color: #0f766e;
                    box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14);
                }

                .payout-grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 14px;
                }

                .payout-muted {
                    font-size: 0.74rem;
                    color: #64748b;
                    font-weight: 600;
                }
            `}</style>
            <ToastContainer toasts={toasts} onRemove={removeToast} />

            <div className="page-hdr payroll-hdr">
                <div>
                    <h1 style={{ fontWeight: 900, color: headingColor }}>Iron Ghost's Payroll</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Faculty Financial Status &amp; Configuration</p>
                </div>
                <div className="flex gap-2">
                    <input
                        type="month"
                        value={monthFilter}
                        onChange={e => setMonthFilter(e.target.value)}
                        className="input-field"
                        style={{ padding: '8px 16px', background: '#fff', border: `1.5px solid ${borderColor}`, borderRadius: sharpRadius, fontWeight: 700 }}
                    />
                    <button className="btn btn-primary" onClick={() => setShowGenerateConfirm(true)} disabled={isGenerating}
                        style={{ background: primaryColor, borderRadius: sharpRadius, fontWeight: 800, padding: '10px 24px', boxShadow: '0 4px 12px rgba(6,78,59,0.2)' }}>
                        {isGenerating ? <Loader2 size={16} className="spin" /> : <Save size={16} />}
                        Auto-Generate {monthFilter}
                    </button>
                </div>
            </div>

            {loadingStats ? (
                <div className="loader-wrap"><div className="spinner" /></div>
            ) : stats && (
                <div className="payroll-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, marginBottom: 32 }}>
                    <StatCard title="Profiles Set" value={`${stats.teachersWithProfiles}/${stats.totalTeachers}`} icon={Users} color="var(--erp-color-positive)" bg="var(--erp-bg-positive-light)" />
                    <StatCard title="Liability" value={`₹ ${stats.totalLiability.toLocaleString()}`} icon={DollarSign} color="var(--erp-color-info)" bg="var(--erp-bg-info-light)" />
                    <StatCard title="Disbursed" value={`₹ ${stats.totalPaid.toLocaleString()}`} icon={CheckCircle2} color="var(--erp-color-positive)" bg="var(--erp-bg-positive-light)" />
                    <StatCard title="Pending" value={`₹ ${stats.totalPending.toLocaleString()}`} icon={AlertTriangle} color="var(--erp-color-negative)" bg="var(--erp-bg-negative-light)" />
                </div>
            )}

            <div className="card p-ledger-card" style={{ padding: 32, borderRadius: sharpRadius, border: `1px solid ${borderColor}` }}>
                <div className="p-ledger-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: `1px solid ${borderColor}`, paddingBottom: 16 }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 900, color: headingColor, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <History size={20} color={primaryColor} /> Monthly Payout Ledger ({monthFilter})
                    </h2>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table className="erp-table stackable" style={{ width: '100%' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc' }}>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Faculty Member</th>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Fixed Base</th>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Incentives</th>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Net Pay</th>
                                <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Status</th>
                                <th style={{ padding: '14px 20px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {salaries.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: 60, color: '#cbd5e1' }}>
                                        <Info size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                                        <p style={{ fontWeight: 700 }}>No payroll records found for this cycle.</p>
                                    </td>
                                </tr>
                            ) : salaries.map(salary => (
                                <tr key={salary._id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                                    <td style={{ padding: '16px 20px' }} data-label="Faculty Member">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                            <div style={{ width: 36, height: 36, borderRadius: sharpRadius, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
                                                <User size={18} color="#94a3b8" style={{ position: 'absolute' }} />
                                                {salary.teacherId?.profileImage && (
                                                    <img
                                                        src={salary.teacherId.profileImage}
                                                        onError={e => e.target.style.display = 'none'}
                                                        style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'relative', zIndex: 1 }}
                                                        alt=""
                                                    />
                                                )}
                                            </div>
                                            <div style={{ fontWeight: 700, color: headingColor }}>{salary.teacherId?.name}</div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '16px 20px', fontWeight: 600 }} data-label="Fixed Base">₹ {salary.baseSalary.toLocaleString()}</td>
                                    <td className="text-positive" style={{ padding: '16px 20px', fontWeight: 700 }} data-label="Incentives">+₹ {(salary.extraClassesAmount + salary.bonusAmount).toLocaleString()}</td>
                                    <td style={{ padding: '16px 20px' }} data-label="Net Pay">
                                        <div style={{ fontWeight: 900, color: primaryColor, fontSize: '0.95rem' }}>₹ {salary.netSalary.toLocaleString()}</div>
                                        {salary.totalPaid > 0 && (
                                            <div className="text-positive" style={{ fontSize: '0.65rem', fontWeight: 700 }}>Paid: ₹ {salary.totalPaid.toLocaleString()}</div>
                                        )}
                                    </td>
                                    <td style={{ padding: '16px 20px' }} data-label="Status">
                                        <span className={salary.status === 'Paid' ? 'bg-positive-light text-positive' : salary.status === 'Processing' ? 'bg-info-light text-info' : 'bg-warning-light text-warning'} style={{
                                            padding: '4px 10px', borderRadius: '2px', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase',
                                            display: 'inline-flex', alignItems: 'center', gap: 4
                                        }}>
                                            {salary.status === 'Paid' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                                            {salary.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '16px 20px', textAlign: 'right' }} data-label="Action">
                                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                                            {(salary.status === 'Pending' || salary.status === 'Processing') && (
                                                <button className="btn btn-primary" style={{ height: 32, padding: '0 12px', background: primaryColor, fontSize: '0.7rem', borderRadius: sharpRadius }} onClick={async () => {
                                                    setSelectedSalary(salary);
                                                    setPayData({
                                                        paymentMethod: 'Bank Transfer',
                                                        transactionId: '',
                                                        notes: '',
                                                        paidAmount: salary.netSalary - (salary.totalPaid || 0)
                                                    });
                                                    setAdminPassword('');
                                                    setShowPayModal(true);
                                                    try {
                                                        const res = await apiClient.get(`/payroll/profile/${salary.teacherId._id}`);
                                                        setSelectedTeacherProfile(res.data);
                                                    } catch (e) { console.error(e); }
                                                }}>
                                                    CONFIGURE PAYMENT
                                                </button>
                                            )}
                                            <button onClick={() => handleViewSlip(salary)} style={{ height: 32, width: 32, background: '#f1f5f9', border: 'none', borderRadius: sharpRadius, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
                                                <FileText size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- DISBURSE MODAL (80% Width Restricted) --- */}
            {showPayModal && selectedSalary && (
                <div className="modal-overlay" style={{
                    position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '20px'
                }} onClick={e => e.target === e.currentTarget && setShowPayModal(false)}>
                    <div className="modal d-modal" style={{
                        width: '80%', maxWidth: '800px', maxHeight: '90vh',
                        background: '#fff', borderRadius: sharpRadius, overflow: 'hidden',
                        display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                        position: 'relative'
                    }} onClick={e => e.stopPropagation()}>

                        <header className="d-modal-header" style={{
                            width: '100%', padding: '24px 32px', background: primaryColor,
                            position: 'relative', color: '#fff', display: 'flex',
                            justifyContent: 'space-between', alignItems: 'center', flexShrink: 0
                        }}>
                            <Banknote size={100} style={{ position: 'absolute', right: -10, bottom: -20, opacity: 0.1, color: '#fff' }} />
                            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 16 }}>
                                <div style={{ width: 44, height: 44, borderRadius: sharpRadius, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Banknote size={20} />
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>CONFIGURE PAYMENT</h2>
                                    <div style={{ fontSize: '0.75rem', opacity: 0.8, fontWeight: 500 }}>Emp: {selectedSalary.teacherId?.name} • Session: {monthFilter}</div>
                                </div>
                            </div>
                            <button type="button" onClick={() => setShowPayModal(false)} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: sharpRadius, color: '#fff', padding: '8px 16px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}>
                                <X size={16} />
                            </button>
                        </header>

                        <form onSubmit={handleProcessPayment} style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div className="modal-body d-modal-body" style={{ padding: '32px' }}>
                                <div className="payout-card" style={{ textAlign: 'center', marginBottom: 18, background: '#f8fafc' }}>
                                    <div style={{ fontSize: '0.65rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>REMAINING BALANCE</div>
                                    <div style={{ fontSize: '2.5rem', fontWeight: 900, color: primaryColor }}>₹ {(selectedSalary.netSalary - (selectedSalary.totalPaid || 0)).toLocaleString()}</div>
                                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>Total Amount: ₹ {selectedSalary.netSalary.toLocaleString()} • Already Paid: ₹ {(selectedSalary.totalPaid || 0).toLocaleString()}</div>
                                </div>

                                <div className="payout-grid-2" style={{ marginBottom: 16 }}>
                                    <div className="payout-card">
                                        <label className="payout-label">Amount To Disburse Now *</label>
                                        <div style={{ position: 'relative' }}>
                                            <IndianRupee size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--erp-color-positive)' }} />
                                            <input
                                                className="payout-input"
                                                type="number"
                                                value={payData.paidAmount}
                                                onChange={e => setPayData({ ...payData, paidAmount: e.target.value })}
                                                required
                                                style={{ paddingLeft: 40, fontWeight: 800, color: primaryColor }}
                                            />
                                        </div>
                                        <p className="payout-muted" style={{ margin: '8px 0 0 0' }}>Enter exact payout value for this transaction.</p>
                                    </div>

                                    <div className="payout-card">
                                        <label className="payout-label">Payment Method *</label>
                                        <select
                                            className="payout-select"
                                            value={payData.paymentMethod}
                                            onChange={e => setPayData({ ...payData, paymentMethod: e.target.value })}
                                            required
                                        >
                                            <option value="Bank Transfer">Bank Transfer</option>
                                            <option value="UPI">UPI</option>
                                            <option value="Cash">Cash</option>
                                        </select>
                                        <p className="payout-muted" style={{ margin: '8px 0 0 0' }}>Choose how this payout is processed.</p>
                                    </div>
                                </div>

                                {payData.paymentMethod === 'UPI' && selectedTeacherProfile?.bankDetails?.upiId && (
                                    <div className="payout-card" style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f0fdf4', borderColor: '#d1fae5', marginBottom: 16 }}>
                                        <QrCode size={18} color="var(--erp-color-positive)" />
                                        <div>
                                            <div style={{ fontSize: '0.6rem', fontWeight: 800, color: 'var(--erp-color-positive)', textTransform: 'uppercase' }}>VERIFIED UPI ADDRESS</div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 900, color: '#064e3b' }}>{selectedTeacherProfile.bankDetails.upiId}</div>
                                        </div>
                                    </div>
                                )}

                                <div className="payout-card" style={{ marginBottom: 16 }}>
                                    <label className="payout-label">Transaction ID / Reference</label>
                                    <input
                                        className="payout-input"
                                        type="text"
                                        placeholder="Optional reference #"
                                        value={payData.transactionId}
                                        onChange={e => setPayData({ ...payData, transactionId: e.target.value })}
                                    />
                                </div>

                                <div className="payout-card" style={{ background: '#fff7ed', borderColor: '#fed7aa' }}>
                                    <label style={{ fontSize: '0.7rem', fontWeight: 900, color: '#9a3412', marginBottom: 8, display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Security Verification (Admin Password) *</label>
                                    <div style={{ position: 'relative' }}>
                                        <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#fdba74' }} />
                                        <input
                                            className="payout-input"
                                            type="password"
                                            value={adminPassword}
                                            onChange={e => setAdminPassword(e.target.value)}
                                            required
                                            placeholder="Required to authorize transaction"
                                            style={{ paddingLeft: 36, borderColor: '#fdba74' }}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="d-footer" style={{ padding: '24px 32px', borderTop: `1px solid ${borderColor}`, background: '#f8fafc', display: 'flex', gap: 12 }}>
                                <button type="button" onClick={() => setShowPayModal(false)} style={{ flex: 1, height: 44, borderRadius: sharpRadius, border: `1px solid ${borderColor}`, background: '#fff', color: '#64748b', fontWeight: 800, fontSize: '0.75rem', cursor: 'pointer' }}>CANCEL</button>
                                <button type="submit" disabled={payLoading} style={{ flex: 2, height: 44, background: payLoading ? '#94a3b8' : primaryColor, color: '#fff', borderRadius: sharpRadius, border: 'none', fontWeight: 900, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                                    {payLoading ? <Loader2 size={16} className="spin" /> : <ShieldCheck size={18} />}
                                    SAVE PAYMENT CONFIGURATION
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Generate Salary Confirmation Modal */}
            {showGenerateConfirm && (
                <div className="modal-overlay" style={{
                    position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex',
                    alignItems: 'center', justifyContent: 'center', padding: '20px'
                }} onClick={e => e.target === e.currentTarget && !isGenerating && setShowGenerateConfirm(false)}>
                    <div className="modal" style={{
                        width: '100%', maxWidth: 460, background: '#fff', borderRadius: sharpRadius,
                        overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
                    }}>
                        <div style={{ padding: '20px 22px', borderBottom: `1px solid ${borderColor}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 40, height: 40, borderRadius: sharpRadius, background: '#fff7ed', border: '1px solid #fed7aa', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#c2410c' }}>
                                <AlertTriangle size={18} />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 900, color: headingColor }}>Generate Salaries</h3>
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Confirmation required</p>
                            </div>
                        </div>

                        <div style={{ padding: '18px 22px', fontSize: '0.88rem', color: '#334155', lineHeight: 1.6 }}>
                            Generate salary entries for <strong>{monthFilter}</strong> now?
                        </div>

                        <div style={{ padding: '16px 22px', borderTop: `1px solid ${borderColor}`, background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                            <button
                                type="button"
                                onClick={() => setShowGenerateConfirm(false)}
                                disabled={isGenerating}
                                style={{ height: 38, padding: '0 16px', borderRadius: sharpRadius, border: `1px solid ${borderColor}`, background: '#fff', color: '#64748b', fontWeight: 800, fontSize: '0.75rem', cursor: isGenerating ? 'not-allowed' : 'pointer' }}
                            >
                                CANCEL
                            </button>
                            <button
                                type="button"
                                onClick={confirmGenerateSalaries}
                                disabled={isGenerating}
                                style={{ height: 38, padding: '0 16px', borderRadius: sharpRadius, border: 'none', background: primaryColor, color: '#fff', fontWeight: 900, fontSize: '0.75rem', cursor: isGenerating ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}
                            >
                                {isGenerating ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
                                CONFIRM
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Preview Modal */}
            <ReceiptPreviewModal
                isOpen={previewPdf.isOpen}
                onClose={() => setPreviewPdf({ ...previewPdf, isOpen: false })}
                blobUrl={previewPdf.blobUrl}
                filename={previewPdf.filename}
                onDownload={() => {
                    const link = document.createElement('a');
                    link.href = previewPdf.blobUrl;
                    link.download = previewPdf.filename;
                    link.click();
                }}
            />
        </ERPLayout>
    );
};

export default TeacherPayrollDashboard;
