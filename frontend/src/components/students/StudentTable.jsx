import React from 'react';
import { User, Eye, Pencil, Trash2, Loader2, Search } from 'lucide-react';

const StudentTable = ({
    students,
    loading,
    onViewProfile,
    onEdit,
    onDelete,
    page,
    setPage,
    totalPages,
    total
}) => {
    if (loading && page === 1) {
        return (
            <div className="p-20 flex flex-col items-center gap-4 text-slate-400">
                <Loader2 className="spin" size={40} />
                <p className="font-medium">Fetching secure records...</p>
            </div>
        );
    }

    if (students.length === 0) {
        return (
            <div className="empty">
                <div className="empty-icon">
                    <Search size={40} strokeWidth={1.2} color="var(--erp-muted)" />
                </div>
                <p style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 6 }}>
                    No records found
                </p>
                <p className="td-sm" style={{ maxWidth: "280px", margin: "0 auto" }}>
                    Try adjusting your search criteria or filters to find what you're looking for.
                </p>
            </div>
        );
    }

    return (
        <div className="erp-table-wrap overflow-x-auto">
            <table className="erp-table w-full">
                <thead>
                    <tr>
                        <th className="!pl-6">Student Profile</th>
                        <th>Batch Details</th>
                        <th>Status</th>
                        <th>Fee Status</th>
                        <th>Attendance</th>
                        <th className="text-right !pr-6">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {students.map(s => (
                        <tr key={s._id} className="hover:bg-slate-50 transition-colors">
                            <td className="!pl-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 overflow-hidden border">
                                        {s.profileImage ? <img src={s.profileImage} alt="" className="w-full h-full object-cover" /> : <User size={20} />}
                                    </div>
                                    <div>
                                        <div className="font-bold text-slate-800">{s.name}</div>
                                        <div className="text-xs text-slate-400 font-medium">#{s.rollNo}</div>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <div className="text-sm font-semibold text-slate-700">{s.batchId?.name || 'Unassigned'}</div>

                            </td>
                            <td>
                                <div style={{ marginTop: 4 }}>
                                    <span style={{
                                        padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
                                        background: s.status === 'active' ? '#dcfce7' : '#f1f5f9',
                                        color: s.status === 'active' ? '#15803d' : '#64748b',
                                        textTransform: 'uppercase'
                                    }}>
                                        {s.status}
                                    </span>
                                </div>
                            </td>
                            <td>
                                <div className="text-sm font-bold text-slate-700">₹{(s.feesPaid || 0).toLocaleString()}</div>
                                <div className="w-24 h-1 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, ((s.feesPaid || 0) / (s.fees || 1)) * 100)}%` }}></div>
                                </div>
                                <div className="text-[10px] text-slate-400 mt-0.5">Total: ₹{(s.fees || 0).toLocaleString()}</div>
                            </td>
                            <td>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">85%</span>
                                    <div className="badge badge-success badge-xs"></div>
                                </div>
                            </td>
                            <td className="text-right !pr-6">
                                <div className="flex justify-end gap-1">
                                    <button className="btn btn-ghost btn-outline btn-sm !text-blue-600" title="View Profile" onClick={() => onViewProfile(s)}>
                                        <Eye size={13} />
                                    </button>

                                    <button className="btn btn-ghost btn-outline btn-sm !text-slate-600" title="Edit" onClick={() => onEdit(s)}>
                                        <Pencil size={15} />
                                    </button>
                                    <button className="btn btn-ghost btn-outline btn-sm !text-red-500 hover:bg-red-50" title="Delete" onClick={() => onDelete(s._id)}>
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {students.length > 0 && (
                <div style={{ marginTop: 20, marginBottom: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div className="text-sm text-slate-500 font-medium">Showing {students.length} of {total} records</div>
                    {page < totalPages && (
                        <button className="btn btn-outline" disabled={loading} onClick={() => setPage(p => p + 1)}>
                            {loading ? <><Loader2 size={16} className="spin" /> Loading...</> : 'Load More'}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default StudentTable;
