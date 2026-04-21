import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, RefreshCcw, User, Eye, Pencil, UserCheck, UserX, Trash2, Loader2, Download } from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import apiClient from '../api/apiConfig';
import { hasClientSession } from '../utils/authSession';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const AllStudentsPage = () => {
    const navigate = useNavigate();
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [stats, setStats] = useState({ total: 0 });

    const loadAllStudents = useCallback(async () => {
        if (!hasClientSession(['admin'])) { navigate('/login'); return; }
        setLoading(true);
        try {
            // Fetch with a high limit to show "all" students
            const res = await apiClient.get('/students', { params: { limit: 1000, search } });
            setStudents(res.data.students || []);
            setStats({ total: res.data.total || 0 });
        } catch (e) {
            console.error("Failed to load students", e);
        } finally {
            setLoading(false);
        }
    }, [navigate, search]);

    useEffect(() => {
        loadAllStudents();
    }, [loadAllStudents]);

    const exportToPDF = () => {
        const doc = new jsPDF();
        doc.text('Student Enrollment Directory', 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 22);
        
        const tableData = students.map(s => [
            s.name || '-', 
            s.rollNo || '-', 
            s.className || '-', 
            s.batchId?.name || 'Unassigned', 
            s.contact || '-', 
            s.status || '-'
        ]);
        
        autoTable(doc, { 
            head: [['Student Name', 'Roll No', 'Class', 'Batch', 'Contact', 'Status']], 
            body: tableData, 
            startY: 30,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [31, 41, 55] } // Slate-800
        });
        
        doc.save(`Student_Directory_${new Date().toISOString().slice(0, 10)}.pdf`);
    };

    return (
        <ERPLayout title="All Students Directory">
            <div className="flex flex-col gap-6">
                {/* Header with Back Button */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate('/students')}
                            className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all hover:scale-105 active:scale-95 border border-slate-200"
                            title="Go Back"
                        >
                            <ArrowLeft size={20} />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Full Student Directory</h1>
                            <p className="text-slate-500 text-sm font-medium">Viewing {students.length} of {stats.total} total students</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                            <input 
                                type="text"
                                placeholder="Search by name, roll, or email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 w-full md:w-64 transition-all"
                            />
                        </div>
                        <button 
                            onClick={loadAllStudents}
                            className={`p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-all ${loading ? 'animate-spin' : ''}`}
                        >
                            <RefreshCcw size={18} />
                        </button>
                        <button 
                            onClick={exportToPDF}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white hover:bg-slate-900 transition-all shadow-sm font-semibold text-sm"
                        >
                            <Download size={16} /> Export PDF
                        </button>
                    </div>
                </div>

                {/* Students Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
                    {loading ? (
                        <div className="p-20 flex flex-col items-center justify-center gap-4">
                            <Loader2 size={40} className="animate-spin text-indigo-500" />
                            <p className="text-slate-500 font-medium">Fetching entire directory...</p>
                        </div>
                    ) : students.length === 0 ? (
                        <div className="p-20 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Search size={32} className="text-slate-300" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">No students found</h3>
                            <p className="text-slate-500">We couldn't find any students matching your search criteria.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50/50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Roll Number</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Class & Batch</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {students.map((s, idx) => (
                                        <tr key={s._id} className="hover:bg-slate-50/80 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 overflow-hidden">
                                                        {s.profileImage ? (
                                                            <img src={s.profileImage} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            s.name.charAt(0)
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{s.name}</div>
                                                        <div className="text-xs text-slate-400">{s.email || 'No email provided'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded text-slate-600">#{s.rollNo}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-semibold text-slate-700">{s.className}</div>
                                                <div className="text-[11px] text-indigo-500 font-bold uppercase">{s.batchId?.name || 'Unassigned'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-slate-600">{s.contact}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                                                    s.status === 'active' 
                                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                        : 'bg-rose-50 text-rose-600 border-rose-100'
                                                }`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => navigate(`/students/${s._id}`)}
                                                    className="p-2 rounded-lg hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all"
                                                    title="View Full Profile"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </ERPLayout>
    );
};

export default AllStudentsPage;
