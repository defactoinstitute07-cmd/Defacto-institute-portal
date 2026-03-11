import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Loader2, RefreshCw, Save, Users } from 'lucide-react';
import ERPLayout from '../components/ERPLayout';
import {
    assignSubjectToTeacher,
    createSubject,
    getAdminAttendanceReport,
    getAdminAttendanceRoster,
    getAdminAttendanceSetup,
    markAdminAttendance,
    updateAdminAttendance
} from '../api/attendanceApi';

const STATUS_OPTIONS = ['Present', 'Absent', 'Late'];
const fieldClass = 'w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400';

const todayString = () => new Date().toISOString().slice(0, 10);
const daysAgo = (days) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().slice(0, 10);
};

const AttendancePage = () => {
    const [setup, setSetup] = useState({ batches: [], teachers: [], subjects: [], assignments: [] });
    const [roster, setRoster] = useState([]);
    const [report, setReport] = useState({ records: [], summary: { total: 0, present: 0, absent: 0, late: 0 } });
    const [reportDrafts, setReportDrafts] = useState({});
    const [loading, setLoading] = useState({ setup: true, roster: false, save: false, report: false, row: '' });
    const [flash, setFlash] = useState(null);
    const [subjectForm, setSubjectForm] = useState({ name: '', code: '', description: '' });
    const [assignmentForm, setAssignmentForm] = useState({ teacherId: '', batchId: '', subjectId: '' });
    const [attendanceFilters, setAttendanceFilters] = useState({ batchId: '', subjectId: '', date: todayString() });
    const [reportFilters, setReportFilters] = useState({ batchId: '', subjectId: '', dateFrom: daysAgo(6), dateTo: todayString() });

    const selectedBatch = useMemo(
        () => setup.batches.find((batch) => batch._id === attendanceFilters.batchId) || null,
        [setup.batches, attendanceFilters.batchId]
    );

    const attendanceSubjects = useMemo(() => {
        if (!selectedBatch) return setup.subjects;
        if (selectedBatch.subjectIds?.length) {
            const ids = new Set(selectedBatch.subjectIds.map((id) => String(id)));
            return setup.subjects.filter((subject) => ids.has(String(subject._id)));
        }
        if (selectedBatch.subjects?.length) {
            const names = new Set(selectedBatch.subjects);
            return setup.subjects.filter((subject) => names.has(subject.name));
        }
        return setup.subjects;
    }, [selectedBatch, setup.subjects]);

    const pushFlash = (type, text) => {
        setFlash({ type, text });
        window.clearTimeout(pushFlash.timer);
        pushFlash.timer = window.setTimeout(() => setFlash(null), 3500);
    };

    const loadSetup = async () => {
        try {
            setLoading((current) => ({ ...current, setup: true }));
            const response = await getAdminAttendanceSetup();
            setSetup(response.data);
        } catch (error) {
            pushFlash('error', error.response?.data?.message || 'Failed to load attendance setup.');
        } finally {
            setLoading((current) => ({ ...current, setup: false }));
        }
    };

    const loadReport = async (filters = reportFilters) => {
        try {
            setLoading((current) => ({ ...current, report: true }));
            const response = await getAdminAttendanceReport({ ...filters, limit: 50 });
            setReport(response.data);
            setReportDrafts(Object.fromEntries((response.data.records || []).map((record) => [record._id, record.status])));
        } catch (error) {
            pushFlash('error', error.response?.data?.message || 'Failed to load attendance history.');
        } finally {
            setLoading((current) => ({ ...current, report: false }));
        }
    };

    useEffect(() => {
        loadSetup();
        loadReport();
    }, []);

    const submitSubject = async (event) => {
        event.preventDefault();
        try {
            await createSubject(subjectForm);
            setSubjectForm({ name: '', code: '', description: '' });
            pushFlash('success', 'Subject created.');
            await loadSetup();
        } catch (error) {
            pushFlash('error', error.response?.data?.message || 'Failed to create subject.');
        }
    };

    const submitAssignment = async (event) => {
        event.preventDefault();
        try {
            await assignSubjectToTeacher(assignmentForm);
            setAssignmentForm({ teacherId: '', batchId: '', subjectId: '' });
            pushFlash('success', 'Teacher assignment saved.');
            await loadSetup();
        } catch (error) {
            pushFlash('error', error.response?.data?.message || 'Failed to assign subject.');
        }
    };

    const loadRoster = async () => {
        if (!attendanceFilters.batchId || !attendanceFilters.subjectId) {
            pushFlash('error', 'Select a batch and subject first.');
            return;
        }

        try {
            setLoading((current) => ({ ...current, roster: true }));
            const response = await getAdminAttendanceRoster(attendanceFilters);
            setRoster(response.data.students || []);
        } catch (error) {
            pushFlash('error', error.response?.data?.message || 'Failed to load roster.');
        } finally {
            setLoading((current) => ({ ...current, roster: false }));
        }
    };

    const saveAttendance = async () => {
        if (!roster.length) {
            pushFlash('error', 'Load a roster first.');
            return;
        }

        try {
            setLoading((current) => ({ ...current, save: true }));
            await markAdminAttendance({
                batchId: attendanceFilters.batchId,
                subjectId: attendanceFilters.subjectId,
                date: attendanceFilters.date,
                entries: roster.map((student) => ({
                    studentId: student._id,
                    status: student.attendanceStatus || 'Present'
                }))
            });
            pushFlash('success', 'Attendance saved.');
            await loadReport();
        } catch (error) {
            pushFlash('error', error.response?.data?.message || 'Failed to save attendance.');
        } finally {
            setLoading((current) => ({ ...current, save: false }));
        }
    };

    const updateReportRow = async (recordId) => {
        try {
            setLoading((current) => ({ ...current, row: recordId }));
            await updateAdminAttendance(recordId, { status: reportDrafts[recordId] });
            pushFlash('success', 'Attendance record updated.');
            await loadReport();
        } catch (error) {
            pushFlash('error', error.response?.data?.message || 'Failed to update record.');
        } finally {
            setLoading((current) => ({ ...current, row: '' }));
        }
    };

    return (
        <ERPLayout title="Attendance Control">
            <div className="space-y-6">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div>
                        <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Attendance System</p>
                        <h1 className="mt-2 text-3xl font-black text-slate-900">Admin attendance control</h1>
                        <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500">
                            Create subjects, assign teachers by batch, bulk mark attendance, and edit history in one place.
                        </p>
                    </div>

                    <button type="button" className="btn btn-outline" onClick={() => { loadSetup(); loadReport(); }}>
                        <RefreshCw size={16} />
                        Refresh
                    </button>
                </div>

                {flash && (
                    <div className={`rounded-md border px-4 py-3 text-sm font-semibold ${
                        flash.type === 'success'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                            : 'border-rose-200 bg-rose-50 text-rose-700'
                    }`}>
                        {flash.text}
                    </div>
                )}

                <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                    <section className="card border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black text-slate-900">Create Subject</h2>
                        <form className="mt-4 space-y-3" onSubmit={submitSubject}>
                            <input className={fieldClass} placeholder="Subject name" value={subjectForm.name} onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })} required />
                            <input className={fieldClass} placeholder="Subject code" value={subjectForm.code} onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })} />
                            <textarea className={`${fieldClass} min-h-[96px]`} placeholder="Description" value={subjectForm.description} onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })} />
                            <button type="submit" className="btn btn-primary w-full justify-center"><Save size={16} />Save Subject</button>
                        </form>
                    </section>

                    <section className="card border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black text-slate-900">Assign Subject To Teacher</h2>
                        <form className="mt-4 space-y-3" onSubmit={submitAssignment}>
                            <select className={fieldClass} value={assignmentForm.teacherId} onChange={(e) => setAssignmentForm({ ...assignmentForm, teacherId: e.target.value })} required>
                                <option value="">Select teacher</option>
                                {setup.teachers.map((teacher) => <option key={teacher._id} value={teacher._id}>{teacher.name}</option>)}
                            </select>
                            <select className={fieldClass} value={assignmentForm.batchId} onChange={(e) => setAssignmentForm({ ...assignmentForm, batchId: e.target.value })} required>
                                <option value="">Select batch</option>
                                {setup.batches.map((batch) => <option key={batch._id} value={batch._id}>{batch.name}</option>)}
                            </select>
                            <select className={fieldClass} value={assignmentForm.subjectId} onChange={(e) => setAssignmentForm({ ...assignmentForm, subjectId: e.target.value })} required>
                                <option value="">Select subject</option>
                                {setup.subjects.map((subject) => <option key={subject._id} value={subject._id}>{subject.name}</option>)}
                            </select>
                            <button type="submit" className="btn btn-primary w-full justify-center"><Users size={16} />Assign Subject</button>
                        </form>
                    </section>

                    <section className="card border border-slate-200 bg-white p-5 shadow-sm">
                        <h2 className="text-lg font-black text-slate-900">Load Attendance Roster</h2>
                        <div className="mt-4 space-y-3">
                            <select className={fieldClass} value={attendanceFilters.batchId} onChange={(e) => setAttendanceFilters({ ...attendanceFilters, batchId: e.target.value, subjectId: '' })}>
                                <option value="">Select batch</option>
                                {setup.batches.map((batch) => <option key={batch._id} value={batch._id}>{batch.name}</option>)}
                            </select>
                            <select className={fieldClass} value={attendanceFilters.subjectId} onChange={(e) => setAttendanceFilters({ ...attendanceFilters, subjectId: e.target.value })} disabled={!attendanceFilters.batchId}>
                                <option value="">Select subject</option>
                                {attendanceSubjects.map((subject) => <option key={subject._id} value={subject._id}>{subject.name}</option>)}
                            </select>
                            <input className={fieldClass} type="date" value={attendanceFilters.date} onChange={(e) => setAttendanceFilters({ ...attendanceFilters, date: e.target.value })} />
                            <button type="button" className="btn btn-primary w-full justify-center" onClick={loadRoster}>
                                {loading.roster ? <Loader2 size={16} className="animate-spin" /> : <CalendarDays size={16} />}
                                Load Students
                            </button>
                        </div>
                    </section>
                </div>

                <section className="card border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <h2 className="text-lg font-black text-slate-900">Bulk Attendance</h2>
                        <div className="flex flex-wrap gap-2">
                            {STATUS_OPTIONS.map((status) => (
                                <button key={status} type="button" className="btn btn-outline" onClick={() => setRoster((current) => current.map((student) => ({ ...student, attendanceStatus: status })))}>
                                    {status}
                                </button>
                            ))}
                            <button type="button" className="btn btn-primary" onClick={saveAttendance} disabled={loading.save || loading.roster}>
                                {loading.save ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                Save Attendance
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 erp-table-wrap">
                        <table className="erp-table stackable">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Roll No</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roster.length === 0 ? (
                                    <tr><td colSpan="3" className="py-10 text-center text-sm font-medium text-slate-500">No roster loaded yet.</td></tr>
                                ) : roster.map((student) => (
                                    <tr key={student._id}>
                                        <td data-label="Student" className="font-bold text-slate-800">{student.name}</td>
                                        <td data-label="Roll No" className="text-sm font-semibold text-slate-500">{student.rollNo || '--'}</td>
                                        <td data-label="Status">
                                            <select className={`${fieldClass} min-w-[148px]`} value={student.attendanceStatus || 'Present'} onChange={(e) => setRoster((current) => current.map((row) => row._id === student._id ? { ...row, attendanceStatus: e.target.value } : row))}>
                                                {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                                            </select>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section className="card border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <h2 className="text-lg font-black text-slate-900">Attendance History</h2>
                            <p className="mt-1 text-sm font-medium text-slate-500">Edit any attendance record across all batches.</p>
                        </div>

                        <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-4 lg:max-w-4xl">
                            <select className={fieldClass} value={reportFilters.batchId} onChange={(e) => setReportFilters({ ...reportFilters, batchId: e.target.value })}>
                                <option value="">All batches</option>
                                {setup.batches.map((batch) => <option key={batch._id} value={batch._id}>{batch.name}</option>)}
                            </select>
                            <select className={fieldClass} value={reportFilters.subjectId} onChange={(e) => setReportFilters({ ...reportFilters, subjectId: e.target.value })}>
                                <option value="">All subjects</option>
                                {setup.subjects.map((subject) => <option key={subject._id} value={subject._id}>{subject.name}</option>)}
                            </select>
                            <input className={fieldClass} type="date" value={reportFilters.dateFrom} onChange={(e) => setReportFilters({ ...reportFilters, dateFrom: e.target.value })} />
                            <div className="flex gap-2">
                                <input className={fieldClass} type="date" value={reportFilters.dateTo} onChange={(e) => setReportFilters({ ...reportFilters, dateTo: e.target.value })} />
                                <button type="button" className="btn btn-primary" onClick={() => loadReport()}>
                                    {loading.report ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                                    Load
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
                        <SummaryCard label="Present" value={report.summary.present} tone="emerald" />
                        <SummaryCard label="Absent" value={report.summary.absent} tone="rose" />
                        <SummaryCard label="Late" value={report.summary.late} tone="amber" />
                    </div>

                    <div className="mt-5 erp-table-wrap">
                        <table className="erp-table stackable">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Student</th>
                                    <th>Batch</th>
                                    <th>Subject</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.records.length === 0 ? (
                                    <tr><td colSpan="6" className="py-10 text-center text-sm font-medium text-slate-500">No attendance records found.</td></tr>
                                ) : report.records.map((record) => (
                                    <tr key={record._id}>
                                        <td data-label="Date" className="text-sm font-semibold text-slate-500">{new Date(record.attendanceDate || record.date).toLocaleDateString()}</td>
                                        <td data-label="Student"><div className="font-bold text-slate-800">{record.studentId?.name}</div><div className="text-xs font-semibold text-slate-400">{record.studentId?.rollNo}</div></td>
                                        <td data-label="Batch" className="font-semibold text-slate-600">{record.batchId?.name}</td>
                                        <td data-label="Subject" className="font-semibold text-slate-600">{record.subjectId?.name}</td>
                                        <td data-label="Status">
                                            <select className={`${fieldClass} min-w-[140px]`} value={reportDrafts[record._id] || record.status} onChange={(e) => setReportDrafts({ ...reportDrafts, [record._id]: e.target.value })}>
                                                {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                                            </select>
                                        </td>
                                        <td data-label="Action">
                                            <button type="button" className="btn btn-outline" onClick={() => updateReportRow(record._id)} disabled={loading.row === record._id}>
                                                {loading.row === record._id ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                                                Update
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </ERPLayout>
    );
};

const SummaryCard = ({ label, value, tone }) => {
    const toneMap = {
        emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        rose: 'border-rose-200 bg-rose-50 text-rose-700',
        amber: 'border-amber-200 bg-amber-50 text-amber-700'
    };

    return (
        <div className={`rounded-md border p-4 ${toneMap[tone]}`}>
            <div className="text-xs font-black uppercase tracking-[0.24em]">{label}</div>
            <div className="mt-2 text-3xl font-black">{value}</div>
        </div>
    );
};

export default AttendancePage;
