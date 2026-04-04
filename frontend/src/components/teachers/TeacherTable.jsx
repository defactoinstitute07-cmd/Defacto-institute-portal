import React, { useState } from 'react';
import { Eye, Pencil, Trash2 } from 'lucide-react';

const Avatar = ({ src, name, size = 36, fontSize = '0.85rem', imgSrc }) => {
    const [err, setErr] = useState(false);
    if (src && !err) {
        return (
            <img
                src={imgSrc(src)}
                alt={name}
                onError={() => setErr(true)}
                style={{ width: size, height: size, borderRadius: '2px', objectFit: 'cover', flexShrink: 0 }}
            />
        );
    }

    return (
        <div
            style={{
                width: size,
                height: size,
                borderRadius: '2px',
                background: 'var(--erp-primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize,
                flexShrink: 0
            }}
        >
            {(name?.[0] || '?').toUpperCase()}
        </div>
    );
};

const TeacherTable = ({ teachers, onView, onEdit, onDelete, imgSrc }) => {
    return (
        <div className="erp-table-wrap">
            <table className="erp-table stackable">
                <thead>
                    <tr>
                        <th>Teacher Profile</th>
                        <th>Employee ID</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {teachers.map((teacher) => (
                        <tr key={teacher._id}>
                            <td data-label="Teacher Profile">
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <Avatar src={teacher.profileImage} name={teacher.name} size={38} imgSrc={imgSrc} />
                                    <div>
                                        <div className="td-bold">{teacher.name}</div>
                                        <div className="td-sm">{teacher.email || '--'}</div>
                                    </div>
                                </div>
                            </td>
                            <td data-label="Employee ID">
                                <span className="chip">{teacher.regNo || '--'}</span>
                            </td>
                            <td data-label="Status">
                                <span className={`badge ${teacher.status === 'active' ? 'badge-active' : 'badge-overdue'}`}>
                                    {teacher.status === 'active' ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td data-label="Actions">
                                <div className="flex gap-2">
                                    <button
                                        className="btn btn-outline btn-sm !text-emerald-600 border-emerald-600 hover:bg-emerald-600 hover:text-white"
                                        onClick={() => onView(teacher)}
                                        title="View Profile"
                                    >
                                        <Eye size={13} />
                                    </button>
                                    <button
                                        className="btn btn-outline btn-sm !text-slate-600 border-slate-600 hover:bg-slate-600 hover:text-white"
                                        onClick={() => onEdit(teacher)}
                                        title="Edit"
                                    >
                                        <Pencil size={13} />
                                    </button>
                                    <button
                                        className="btn btn-outline btn-sm !text-red-600 border-red-600 hover:bg-red-600 hover:text-white"
                                        onClick={() => onDelete(teacher)}
                                        title="Delete"
                                    >
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default TeacherTable;
